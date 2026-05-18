/**
 * Conversation interpreter — runs Claude over a clustered conversation to
 * produce its five-dimension score + narrative interpretation.
 *
 * This is the conversation-level equivalent of signals.ts (which scores
 * individual articles). Where signals.ts says "is this article worth paying
 * attention to for this company", the interpreter says "what does this whole
 * conversation MEAN, and what should the company do about it commercially".
 *
 * Cost: one Sonnet call per conversation. Run on:
 *   - new conversations (created by clustering)
 *   - conversations that gained ≥2 new items since last interpretation
 *   - conversations included in the weekly Market Brief (always fresh interpretation)
 *
 * The signal_analyses-level interpretation (why_it_matters, themes) is reused
 * as input context — we don't re-do article-level analysis here.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { getCompanyProfile, type CompanyProfile } from './company-profile';
import {
  getConversation,
  upsertConversationScore,
  upsertConversationInterpretation,
  updateConversationViewStatus,
  type ConversationScores,
  type ConversationInterpretation,
  type ConversationViewStatus,
  type ScoreEntry,
} from './market-conversations';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface InterpretationInput {
  conversation: {
    id: string;
    title: string;
    summary: string;
    dominantTopics: string[];
    dominantEntities: string[];
    sourceMix: Record<string, number>;
  };
  items: {
    title: string;
    source: string;
    publishedAt?: string;
    whyItMatters: string;
    themes: string[];
    usefulnessScore: number;
    snippet: string;
  }[];
  profile: CompanyProfile;
}

function buildProfileContext(p: CompanyProfile): string {
  const parts: string[] = [];
  if (p.oneLineDescription) parts.push(`Elevator pitch: ${p.oneLineDescription}`);
  if (p.productDescription) parts.push(`What they do: ${p.productDescription}`);
  if (p.coreNarrative) parts.push(`Core narrative: ${p.coreNarrative.slice(0, 800)}`);
  if (p.enemyProblemFrame) parts.push(`Problem they solve: ${p.enemyProblemFrame}`);
  if (p.differentiation.length) parts.push(`Differentiation: ${p.differentiation.slice(0, 5).join('; ')}`);
  if (p.buyerPersonas.length) parts.push(`Buyer personas: ${p.buyerPersonas.slice(0, 5).join('; ')}`);
  if (p.insuranceSegments.length) parts.push(`Insurance segments: ${p.insuranceSegments.join(', ')}`);
  if (p.targetGeographies.length) parts.push(`Geographies: ${p.targetGeographies.join(', ')}`);
  if (p.commercialHooks.length) parts.push(`Commercial hooks: ${p.commercialHooks.slice(0, 3).join('; ')}`);
  if (p.priorityTopics.length) parts.push(`Priority topics: ${p.priorityTopics.join(', ')}`);
  if (p.excludedTopics.length) parts.push(`Excluded topics: ${p.excludedTopics.join(', ')}`);
  return parts.join('\n');
}

async function callClaudeForInterpretation(input: InterpretationInput): Promise<{
  scores: ConversationScores;
  interpretation: ConversationInterpretation;
  viewStatus: ConversationViewStatus;
  marketSignal: string;
  whyItIsHere: string;
  suggestedUse: string[];
} | null> {
  if (!anthropic) return null;

  const profileContext = buildProfileContext(input.profile);
  const itemsSummary = input.items.slice(0, 12).map((it, i) =>
    `${i + 1}. "${it.title}" (${it.source}${it.publishedAt ? ', ' + it.publishedAt.slice(0, 10) : ''}). ${it.whyItMatters.slice(0, 300)}`,
  ).join('\n');

  const sourceMixSummary = Object.entries(input.conversation.sourceMix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([src, count]) => `${src}: ${count}`)
    .join(', ');

  const systemPrompt = `You are a senior market intelligence analyst for an insurance/insurtech company. Given a clustered conversation (multiple related news items) and the company's strategic context, you produce:

1. Five scores (each 0-10 with a label and one-sentence explanation):
   - market_attention: how much is the market actually paying attention to this?
   - momentum: is coverage accelerating, stable, or fading?
   - saturation: is everyone already commenting on this (high) or is there whitespace (low)?
   - coverage_quality: are credible sources covering it, or is it speculation?
   - company_relevance: how directly does this affect THIS company's strategy / pipeline / positioning?

2. A narrative interpretation:
   - What changed in the market? What is the market saying? What is no one saying?
   - Why does this matter to THIS company specifically? What is the narrative fit?
   - Commercial implications (positioning, sales, content, pipeline)
   - The single most important next move
   - Recommended actions across categories (Sales, Outbound, FounderContent, Website, PR, CampaignPlanning, PodcastWebinar, MonitorOnly) — only include categories where there's a genuinely useful action; omit the rest
   - Risks or limitations of acting on this

3. A view status decision:
   - included_in_brief: actively shape the weekly brief (company_relevance >= 7, momentum acceptable, actionable)
   - action_recommended: clear action needed even if not headline-worthy
   - monitor_only: relevant but no action needed yet
   - tracked_not_prioritised: relevant context, not directly actionable

4. A short market_signal (≤80 chars), why_it_is_here (1 sentence), and 1-3 suggested_use tags ("Positioning", "Sales narrative", "PR pitch", "Content angle", "Strategic monitoring").

Score honestly. Most conversations will average 4-6 across dimensions. Only exceptional ones should average above 7.`;

  const userPrompt = `COMPANY CONTEXT:
${profileContext}

CONVERSATION:
Title: ${input.conversation.title}
${input.conversation.summary ? 'Summary: ' + input.conversation.summary : ''}
Dominant topics: ${input.conversation.dominantTopics.join(', ')}
Dominant entities: ${input.conversation.dominantEntities.join(', ')}
Source mix: ${sourceMixSummary}
Item count: ${input.items.length}

ITEMS:
${itemsSummary}

Return ONLY valid JSON (no markdown, no code fences) with this exact shape:
{
  "scores": {
    "marketAttention": { "value": 0-10, "label": "Low|Moderate|High|Very High", "explanation": "1 sentence" },
    "momentum": { "value": 0-10, "label": "Fading|Stable|Rising|Accelerating", "explanation": "1 sentence" },
    "saturation": { "value": 0-10, "label": "Low|Moderate|High|Over-saturated", "explanation": "1 sentence" },
    "coverageQuality": { "value": 0-10, "label": "Low|Moderate|High|Very High", "explanation": "1 sentence" },
    "companyRelevance": { "value": 0-10, "label": "Low|Moderate|High|Strong", "explanation": "1 sentence" }
  },
  "interpretation": {
    "executiveSummary": "2-3 sentence summary of the conversation and why it matters",
    "whatChanged": "1-2 sentences on what's new",
    "whatMarketIsSaying": "1-2 sentences on the dominant takes",
    "whatIsMissing": "1-2 sentences on what's not being said",
    "whyThisMatters": "1-2 sentences on why this matters to THIS company",
    "whyIncluded": ["2-3 reasons this is tracked"],
    "confidenceLevel": "low|moderate|high",
    "confidenceReason": "1 sentence",
    "narrativeFit": "1-2 sentences on alignment with company narrative",
    "commercialImplications": ["3-5 specific implications, each one sentence"],
    "recommendedNextMove": "1-2 sentences — the single most important move",
    "recommendedActions": {
      "Sales": "specific sales action (omit if none)",
      "Outbound": "specific outbound move (omit if none)",
      "FounderContent": "founder LinkedIn / commentary angle (omit if none)",
      "Website": "website / SEO change (omit if none)",
      "PR": "PR / trade media angle (omit if none)",
      "CampaignPlanning": "campaign hook (omit if none)",
      "PodcastWebinar": "speaking / webinar angle (omit if none)",
      "MonitorOnly": "monitoring note if no action yet (omit if there IS an action)"
    },
    "risksOrLimitations": ["1-3 risks of acting on this"],
    "sourceCitations": []
  },
  "viewStatus": "included_in_brief|action_recommended|monitor_only|tracked_not_prioritised",
  "marketSignal": "≤80 chars one-liner",
  "whyItIsHere": "1 sentence on why we're tracking this",
  "suggestedUse": ["Positioning", "Sales narrative", ...]
}`;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '{}';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validStatuses: ConversationViewStatus[] = [
      'included_in_brief',
      'action_recommended',
      'monitor_only',
      'tracked_not_prioritised',
    ];
    const validConfidence: ('low' | 'moderate' | 'high')[] = ['low', 'moderate', 'high'];

    function clamp(v: unknown, min = 0, max = 10): number {
      const n = Number(v);
      if (Number.isNaN(n)) return min;
      return Math.max(min, Math.min(max, n));
    }
    function toScore(raw: any, defaultLabel: string): ScoreEntry {
      return {
        value: clamp(raw?.value),
        label: String(raw?.label || defaultLabel).slice(0, 40),
        explanation: String(raw?.explanation || '').slice(0, 300),
      };
    }

    const scores: ConversationScores = {
      marketAttention: toScore(parsed?.scores?.marketAttention, 'Low'),
      momentum: toScore(parsed?.scores?.momentum, 'Stable'),
      saturation: toScore(parsed?.scores?.saturation, 'Low'),
      coverageQuality: toScore(parsed?.scores?.coverageQuality, 'Low'),
      companyRelevance: toScore(parsed?.scores?.companyRelevance, 'Low'),
    };

    const rawActions = parsed?.interpretation?.recommendedActions || {};
    const validActionKeys = ['Sales', 'Outbound', 'FounderContent', 'Website', 'PR', 'CampaignPlanning', 'PodcastWebinar', 'MonitorOnly'] as const;
    const recommendedActions: ConversationInterpretation['recommendedActions'] = {};
    for (const key of validActionKeys) {
      const val = rawActions[key];
      if (typeof val === 'string' && val.trim()) recommendedActions[key] = val.slice(0, 500);
    }

    const interpretation: ConversationInterpretation = {
      executiveSummary: String(parsed?.interpretation?.executiveSummary || '').slice(0, 1500),
      whatChanged: String(parsed?.interpretation?.whatChanged || '').slice(0, 1000),
      whatMarketIsSaying: String(parsed?.interpretation?.whatMarketIsSaying || '').slice(0, 1000),
      whatIsMissing: String(parsed?.interpretation?.whatIsMissing || '').slice(0, 1000),
      whyThisMatters: String(parsed?.interpretation?.whyThisMatters || '').slice(0, 1000),
      whyIncluded: Array.isArray(parsed?.interpretation?.whyIncluded)
        ? parsed.interpretation.whyIncluded.map(String).slice(0, 5)
        : [],
      confidenceLevel: validConfidence.includes(parsed?.interpretation?.confidenceLevel)
        ? parsed.interpretation.confidenceLevel
        : 'moderate',
      confidenceReason: String(parsed?.interpretation?.confidenceReason || '').slice(0, 500),
      narrativeFit: String(parsed?.interpretation?.narrativeFit || '').slice(0, 1000),
      commercialImplications: Array.isArray(parsed?.interpretation?.commercialImplications)
        ? parsed.interpretation.commercialImplications.map((s: unknown) => String(s).slice(0, 500)).slice(0, 8)
        : [],
      recommendedNextMove: String(parsed?.interpretation?.recommendedNextMove || '').slice(0, 1000),
      recommendedActions,
      risksOrLimitations: Array.isArray(parsed?.interpretation?.risksOrLimitations)
        ? parsed.interpretation.risksOrLimitations.map((s: unknown) => String(s).slice(0, 400)).slice(0, 5)
        : [],
      sourceCitations: Array.isArray(parsed?.interpretation?.sourceCitations)
        ? parsed.interpretation.sourceCitations.map(String).slice(0, 10)
        : [],
    };

    const viewStatus: ConversationViewStatus = validStatuses.includes(parsed?.viewStatus)
      ? parsed.viewStatus
      : 'tracked_not_prioritised';

    return {
      scores,
      interpretation,
      viewStatus,
      marketSignal: String(parsed?.marketSignal || '').slice(0, 200),
      whyItIsHere: String(parsed?.whyItIsHere || '').slice(0, 500),
      suggestedUse: Array.isArray(parsed?.suggestedUse)
        ? parsed.suggestedUse.map(String).slice(0, 5)
        : [],
    };
  } catch (err) {
    console.error('[conversation-interpreter] Claude call failed:', err);
    return null;
  }
}

/**
 * Run the full interpretation pass on a single conversation. Persists results.
 * Returns true if a fresh interpretation was written, false if skipped.
 */
export async function interpretConversation(conversationId: string, companyId: string): Promise<boolean> {
  await getDb();
  if (!anthropic) return false;

  const conv = await getConversation(conversationId, companyId, { withItems: true });
  if (!conv || !conv.items || conv.items.length === 0) return false;

  const profile = await getCompanyProfile(companyId);
  if (!profile) return false;

  // Fetch the per-article why_it_matters + themes for richer context
  const itemIds = conv.items.map(it => it.signalAnalysisId);
  const signalRows = await sql`
    SELECT id, why_it_matters, themes, usefulness_score
    FROM signal_analyses
    WHERE id = ANY(${itemIds as any}::text[])
  `;
  const signalsById = new Map(signalRows.rows.map(r => [String(r.id), r]));

  const items = conv.items.map(it => {
    const sa = signalsById.get(it.signalAnalysisId);
    return {
      title: it.title || '',
      source: it.source || '',
      publishedAt: it.publishedAt,
      whyItMatters: String(sa?.why_it_matters || ''),
      themes: (() => {
        try { return JSON.parse(String(sa?.themes || '[]')); }
        catch { return []; }
      })(),
      usefulnessScore: Number(sa?.usefulness_score || 0),
      snippet: it.snippet || '',
    };
  });

  const result = await callClaudeForInterpretation({
    conversation: {
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      dominantTopics: conv.dominantTopics,
      dominantEntities: conv.dominantEntities,
      sourceMix: conv.sourceMix,
    },
    items,
    profile,
  });

  if (!result) return false;

  await upsertConversationScore(conversationId, result.scores);
  await upsertConversationInterpretation(conversationId, result.interpretation);
  await updateConversationViewStatus(
    conversationId,
    result.viewStatus,
    result.marketSignal,
    result.whyItIsHere,
    result.suggestedUse,
  );

  return true;
}

/**
 * Interpret all conversations for a company that don't yet have an
 * interpretation, or whose interpretation is stale (older than the most
 * recent item attached). Useful before generating the weekly brief.
 */
export async function interpretStaleConversations(companyId: string, maxToProcess = 10): Promise<{
  interpreted: number;
}> {
  await getDb();

  const r = await sql`
    SELECT mc.id
    FROM market_conversations mc
    LEFT JOIN conversation_interpretations ci ON ci.conversation_id = mc.id
    WHERE mc.company_id = ${companyId}
      AND mc.archived = false
      AND (ci.id IS NULL OR ci.updated_at < mc.updated_at)
    ORDER BY mc.latest_coverage_at DESC
    LIMIT ${maxToProcess}
  `;

  let interpreted = 0;
  for (const row of r.rows) {
    const ok = await interpretConversation(String(row.id), companyId);
    if (ok) interpreted++;
  }
  return { interpreted };
}
