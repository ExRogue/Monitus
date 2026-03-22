import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface ThemeCluster {
  tag: string;
  count: number;
  articleIds: string[];
  sampleContexts: string[];
}

interface DetectedTheme {
  id: string;
  company_id: string;
  name: string;
  description: string;
  classification: string;
  score: number;
  momentum_7d: number;
  momentum_30d: number;
  momentum_90d: number;
  momentum_180d: number;
  source_diversity: number;
  competitor_activity: number;
  icp_relevance: number;
  narrative_fit: number;
  recommended_action: string;
  article_ids: string;
}

function parseThemesJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Cluster theme tags from all analyzed signals for a company.
 * Returns clusters sorted by frequency (descending), filtered to 2+ occurrences.
 */
async function clusterThemeTags(companyId: string): Promise<ThemeCluster[]> {
  await getDb();

  const analyses = await sql`
    SELECT sa.article_id, sa.themes, sa.why_it_matters, sa.competitor_context,
           na.title, na.source
    FROM signal_analyses sa
    LEFT JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    ORDER BY sa.created_at DESC
  `;

  if (!analyses.rows.length) return [];

  // Count tag occurrences and collect article IDs + context
  const tagMap = new Map<string, ThemeCluster>();

  for (const row of analyses.rows) {
    const tags = parseThemesJson(row.themes);
    for (const rawTag of tags) {
      const tag = rawTag.toLowerCase().trim();
      if (!tag) continue;

      if (!tagMap.has(tag)) {
        tagMap.set(tag, { tag, count: 0, articleIds: [], sampleContexts: [] });
      }
      const cluster = tagMap.get(tag)!;
      cluster.count++;
      cluster.articleIds.push(row.article_id);
      if (cluster.sampleContexts.length < 3) {
        const ctx = [row.title, row.why_it_matters].filter(Boolean).join(' — ');
        if (ctx) cluster.sampleContexts.push(ctx);
      }
    }
  }

  // Filter to tags appearing 2+ times, sort by frequency
  return Array.from(tagMap.values())
    .filter(c => c.count >= 2)
    .sort((a, b) => b.count - a.count);
}

/**
 * Use Claude to enrich a batch of theme clusters into full theme objects.
 * Max 5 per call to stay within Vercel timeout.
 */
async function enrichThemeClusters(
  clusters: ThemeCluster[],
  companyId: string,
  narrativeContext: string
): Promise<DetectedTheme[]> {
  if (!anthropic || clusters.length === 0) return [];

  const batch = clusters.slice(0, 5);

  const clusterSummary = batch.map((c, i) => (
    `${i + 1}. Tag: "${c.tag}" (appeared ${c.count} times across ${c.articleIds.length} articles)\n   Sample contexts:\n${c.sampleContexts.map(s => `   - ${s}`).join('\n')}`
  )).join('\n\n');

  const prompt = `You are a market intelligence analyst. Given the company context and a set of recurring theme tags detected across analyzed news signals, create structured theme definitions.

Company context:
${narrativeContext}

Recurring theme clusters detected:
${clusterSummary}

For each cluster, return a JSON array of objects with these fields:
- tag: the original tag string (must match exactly)
- name: a clear, professional theme name (e.g. "AI Governance in Underwriting" not just "ai underwriting")
- description: 1-2 sentence description of what this theme covers in the market
- classification: one of "Immediate", "Building", "Established", "Structural"
  - Immediate: breaking or fast-moving, needs response within days
  - Building: gaining momentum, not yet urgent but trending up
  - Established: mature, well-covered in market
  - Structural: long-term industry shift, slow-moving
- narrative_fit: integer 0-100, how well this theme aligns with the company's positioning
- momentum_estimate: integer 0-100, estimated current momentum based on signal frequency and recency
- competitor_activity: integer 0-100, how actively competitors are covering this theme
- icp_relevance: integer 0-100, how relevant to the company's target buyers
- recommended_action: one of "act_now", "reinforce", "monitor", "ignore"

Return ONLY valid JSON array (no markdown, no code fences).`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => {
      // Find the matching cluster for article IDs
      const cluster = batch.find(c => c.tag === item.tag) || batch[0];
      const momentumEst = Math.max(0, Math.min(100, Math.round(Number(item.momentum_estimate) || 0)));
      const score = Math.round(
        (Number(item.narrative_fit) || 0) * 0.3 +
        momentumEst * 0.25 +
        (Number(item.icp_relevance) || 0) * 0.25 +
        (Number(item.competitor_activity) || 0) * 0.2
      );

      return {
        id: uuidv4(),
        company_id: companyId,
        name: String(item.name || item.tag),
        description: String(item.description || ''),
        classification: ['Immediate', 'Building', 'Established', 'Structural'].includes(item.classification)
          ? item.classification
          : 'Building',
        score: Math.max(0, Math.min(100, score)),
        // Distribute momentum estimate across time windows based on classification
        momentum_7d: item.classification === 'Immediate'
          ? Math.round(momentumEst * 0.9)
          : Math.round(momentumEst * 0.5),
        momentum_30d: Math.round(momentumEst * 0.7),
        momentum_90d: item.classification === 'Structural'
          ? Math.round(momentumEst * 0.9)
          : Math.round(momentumEst * 0.5),
        momentum_180d: item.classification === 'Structural' || item.classification === 'Established'
          ? Math.round(momentumEst * 0.8)
          : Math.round(momentumEst * 0.3),
        source_diversity: Math.min(100, Math.round((cluster.count / batch[0].count) * 70 + 20)),
        competitor_activity: Math.max(0, Math.min(100, Math.round(Number(item.competitor_activity) || 0))),
        icp_relevance: Math.max(0, Math.min(100, Math.round(Number(item.icp_relevance) || 0))),
        narrative_fit: Math.max(0, Math.min(100, Math.round(Number(item.narrative_fit) || 0))),
        recommended_action: ['act_now', 'reinforce', 'monitor', 'ignore'].includes(item.recommended_action)
          ? item.recommended_action
          : 'monitor',
        article_ids: JSON.stringify(cluster.articleIds),
      };
    });
  } catch (error) {
    console.error('[themes] Failed to enrich theme clusters:', error);
    return [];
  }
}

/**
 * Detect themes from analyzed signals for a company.
 * Clusters theme tags, enriches with Claude, and upserts into the themes table.
 */
export async function detectThemesFromSignals(companyId: string): Promise<DetectedTheme[]> {
  await getDb();

  // Get company narrative context for Claude
  const bibleResult = await sql`
    SELECT elevator_pitch, company_description, messaging_pillars, icp_profiles, competitors
    FROM messaging_bibles
    WHERE company_id = ${companyId}
    LIMIT 1
  `;

  const bible = bibleResult.rows[0];
  const narrativeContext = bible
    ? [
        bible.elevator_pitch && `Elevator pitch: ${bible.elevator_pitch}`,
        bible.company_description && `Company: ${bible.company_description}`,
        bible.messaging_pillars && `Messaging pillars: ${bible.messaging_pillars}`,
        bible.icp_profiles && `Target buyers: ${bible.icp_profiles}`,
        bible.competitors && `Competitors: ${bible.competitors}`,
      ].filter(Boolean).join('\n')
    : 'No company narrative available.';

  // Cluster theme tags from signals
  const clusters = await clusterThemeTags(companyId);
  if (clusters.length === 0) return [];

  // Enrich clusters with Claude (max 5)
  const enriched = await enrichThemeClusters(clusters, companyId, narrativeContext);
  if (enriched.length === 0) return [];

  // Upsert into themes table
  for (const theme of enriched) {
    // Check if a theme with similar name already exists
    const existing = await sql`
      SELECT id FROM themes
      WHERE company_id = ${companyId} AND LOWER(name) = LOWER(${theme.name})
      LIMIT 1
    `;

    if (existing.rows.length) {
      // Update existing theme
      await sql`
        UPDATE themes SET
          description = ${theme.description},
          classification = ${theme.classification},
          score = ${theme.score},
          momentum_7d = ${theme.momentum_7d},
          momentum_30d = ${theme.momentum_30d},
          momentum_90d = ${theme.momentum_90d},
          momentum_180d = ${theme.momentum_180d},
          source_diversity = ${theme.source_diversity},
          competitor_activity = ${theme.competitor_activity},
          icp_relevance = ${theme.icp_relevance},
          narrative_fit = ${theme.narrative_fit},
          recommended_action = ${theme.recommended_action},
          article_ids = ${theme.article_ids},
          last_updated = NOW()
        WHERE id = ${existing.rows[0].id}
      `;
      theme.id = existing.rows[0].id;
    } else {
      // Insert new theme
      await sql`
        INSERT INTO themes (
          id, company_id, name, description, classification,
          score, momentum_7d, momentum_30d, momentum_90d, momentum_180d,
          source_diversity, competitor_activity, icp_relevance, narrative_fit,
          recommended_action, article_ids
        ) VALUES (
          ${theme.id}, ${theme.company_id}, ${theme.name}, ${theme.description}, ${theme.classification},
          ${theme.score}, ${theme.momentum_7d}, ${theme.momentum_30d}, ${theme.momentum_90d}, ${theme.momentum_180d},
          ${theme.source_diversity}, ${theme.competitor_activity}, ${theme.icp_relevance}, ${theme.narrative_fit},
          ${theme.recommended_action}, ${theme.article_ids}
        )
      `;
    }
  }

  return enriched;
}
