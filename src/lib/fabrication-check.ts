/**
 * Post-generation fabrication checker.
 *
 * Generated content carries a "Sources" footer, but until now there was no
 * automated check that the prose itself stayed inside what the sources support.
 * For an FCA-regulated audience (Lloyd's brokers, MGAs, reinsurers) an
 * unsupported statistic in a published piece is a compliance event.
 *
 * This module uses Haiku to extract every concrete claim from the generated
 * text — statistics, named individuals, direct quotes, specific dates — and
 * checks each one against the source article context. Each flagged claim
 * comes back with a confidence rating + suggested action (remove, soften,
 * verify). Results are persisted alongside the content for the approver.
 *
 * The check is fire-and-forget and never blocks generation.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { logClaudeUsage } from './claude-cost';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface FabricationFlag {
  claim: string;
  type: 'statistic' | 'date' | 'person' | 'quote' | 'organisation' | 'event' | 'other';
  supported: boolean;
  confidence: number;
  suggested_action: 'remove' | 'soften' | 'verify' | 'keep';
  rationale: string;
}

export interface FabricationCheckResult {
  flags: FabricationFlag[];
  unsupported_count: number;
  highest_severity: 'none' | 'low' | 'medium' | 'high';
  checked_at: string;
}

interface SourceArticle {
  title: string;
  summary?: string;
  source?: string;
  content?: string;
}

/**
 * Check generated content for unsupported claims against its source articles.
 * Returns null if checking is unavailable (no API key).
 */
export async function checkContentFabrication(
  contentText: string,
  sources: SourceArticle[],
  opts?: { companyId?: string | null },
): Promise<FabricationCheckResult | null> {
  if (!anthropic) return null;
  if (!contentText || contentText.length < 50) {
    return { flags: [], unsupported_count: 0, highest_severity: 'none', checked_at: new Date().toISOString() };
  }

  const sourceContext = sources.length > 0
    ? sources.map((s, i) =>
        `Source ${i + 1}: "${s.title}" (${s.source || 'unknown'})\n${(s.summary || s.content || '').substring(0, 600)}`
      ).join('\n\n')
    : 'NO SOURCES PROVIDED. Treat all specific named claims as unsupported.';

  const prompt = `You are a compliance fact-checker for B2B insurance content. Your job is to find any specific, concrete claim in the GENERATED CONTENT that is NOT supported by the SOURCE ARTICLES.

What counts as a specific claim worth checking:
- Statistics or numbers ("23% of brokers", "$4.2bn in losses", "1 in 5 firms")
- Named individuals (any person mentioned by name)
- Direct quotes
- Specific dates or deadlines
- Named organisations beyond what's in the sources
- Specific events (conferences, regulatory rulings) cited by name

What is NOT worth flagging:
- General industry commentary or opinion
- The company's own positioning statements
- Hedged language ("many", "increasingly", "some industry observers")
- Restating what's in the sources in different words

SOURCE ARTICLES:
${sourceContext}

GENERATED CONTENT:
${contentText.substring(0, 6000)}

Return ONLY a JSON object with this exact shape (no markdown, no code fences):
{
  "flags": [
    {
      "claim": "the exact phrase or sentence containing the claim",
      "type": "statistic|date|person|quote|organisation|event|other",
      "supported": true|false,
      "confidence": 0.0-1.0,
      "suggested_action": "remove|soften|verify|keep",
      "rationale": "1 sentence on why this is or isn't supported"
    }
  ]
}

Only include claims where supported=false OR where you genuinely cannot tell. Do not return claims that are clearly supported. If everything checks out, return {"flags": []}.

Be strict but not paranoid. Phrases like "the industry is shifting" are opinion, not a fact claim — don't flag them.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    void logClaudeUsage(response, { route: 'fabrication.check', companyId: opts?.companyId });
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const flags: FabricationFlag[] = Array.isArray(parsed.flags)
      ? parsed.flags
          .filter((f: any) => f && typeof f.claim === 'string')
          .map((f: any) => ({
            claim: String(f.claim).slice(0, 500),
            type: ['statistic', 'date', 'person', 'quote', 'organisation', 'event'].includes(f.type)
              ? f.type
              : 'other',
            supported: f.supported === true,
            confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.5)),
            suggested_action: ['remove', 'soften', 'verify', 'keep'].includes(f.suggested_action)
              ? f.suggested_action
              : 'verify',
            rationale: String(f.rationale || '').slice(0, 500),
          }))
      : [];

    const unsupported = flags.filter(f => !f.supported);
    const unsupportedCount = unsupported.length;
    const removeCount = unsupported.filter(f => f.suggested_action === 'remove').length;

    let severity: FabricationCheckResult['highest_severity'] = 'none';
    if (removeCount > 0) severity = 'high';
    else if (unsupportedCount >= 3) severity = 'high';
    else if (unsupportedCount >= 1) severity = 'medium';

    return {
      flags,
      unsupported_count: unsupportedCount,
      highest_severity: severity,
      checked_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[fabrication-check] Failed:', err);
    return null;
  }
}

/**
 * Run a check on a stored content row and persist results back to
 * generated_content.fabrication_check (JSON column added in migration v23).
 */
export async function checkAndPersist(
  contentId: string,
  companyId: string,
): Promise<FabricationCheckResult | null> {
  if (!anthropic) return null;

  const contentResult = await sql`
    SELECT content, article_ids FROM generated_content
    WHERE id = ${contentId} AND company_id = ${companyId}
  `;
  if (!contentResult.rows.length) return null;
  const row = contentResult.rows[0];
  const contentText = row.content as string;

  let articleIds: string[] = [];
  try {
    const parsed = JSON.parse(row.article_ids || '[]');
    if (Array.isArray(parsed)) articleIds = parsed.map(String);
  } catch {}

  let sources: SourceArticle[] = [];
  if (articleIds.length > 0) {
    const articlesResult = await sql`
      SELECT title, summary, source, content
      FROM news_articles
      WHERE id = ANY(${articleIds as any}::text[])
    `;
    sources = articlesResult.rows.map(r => ({
      title: String(r.title || ''),
      summary: String(r.summary || ''),
      source: String(r.source || ''),
      content: String(r.content || ''),
    }));
  }

  const result = await checkContentFabrication(contentText, sources);
  if (!result) return null;

  try {
    await sql`
      UPDATE generated_content
      SET fabrication_check = ${JSON.stringify(result)}
      WHERE id = ${contentId}
    `;
  } catch {
    // Column may not yet exist on stale schema — caller can retry after migration.
  }

  return result;
}
