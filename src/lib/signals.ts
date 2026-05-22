/**
 * Signal scoring — split into two stages on 2026-05-22 for cost reasons.
 *
 *   Stage 1 (article_generic_scores, cached forever)
 *     Score the dimensions that are properties OF THE ARTICLE — themes,
 *     stakeholder roles, strategic significance, timeliness, competitor
 *     relevance, actionability, the generic "why it matters" prose. These
 *     are the same regardless of which company is reading the article.
 *     Runs once per article. Persisted in article_generic_scores so every
 *     subsequent customer can reuse it.
 *
 *   Stage 2 (per-call, per-company)
 *     Score the dimensions that are properties OF THE COMPANY × ARTICLE —
 *     narrative_fit, icp_fit, stakeholder_fit, right_to_say, plus the
 *     company-specific commentary (why_it_matters_to_buyers, competitor
 *     context). Small prompt = small cost.
 *
 * Result: on a feed where N companies all see the same article, we pay
 * stage-1 once and stage-2 N times instead of paying full-cost N times.
 * For 27 active customers and a shared trade-press feed, this approximates
 * an 80% reduction in signal-scoring tokens.
 *
 * The public surface (`analyzeSignalRelevance`, `analyzeBatch`) is unchanged
 * so callers don't have to know about the split.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { NewsArticle } from './news';
import { reportClaudeError } from './monitoring';
import { logClaudeUsage } from './claude-cost';
import { getDb } from './db';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

export interface MessagingBible {
  id: string;
  company_id: string;
  elevator_pitch: string;
  messaging_pillars: string;
  icp_profiles: string;
  competitors: string;
  target_audiences: string;
  company_description: string;
  differentiators: string;
  stakeholder_matrix?: string;
}

export interface SignalAnalysis {
  id?: string;
  company_id: string;
  article_id: string;
  // 8 scoring dimensions (each 1-10)
  narrative_fit: number;
  icp_fit: number;
  stakeholder_fit_score: number;
  right_to_say: number;
  strategic_significance: number;
  timeliness: number;
  competitor_relevance: number;
  actionability: number;
  // Composite usefulness score (1-10, weighted average)
  usefulness_score: number;
  // Legacy field kept for backwards compat (mapped from timeliness)
  urgency: number;
  why_it_matters: string;
  why_it_matters_to_buyers: string;
  recommended_action: 'act_now' | 'monitor' | 'ignore';
  competitor_context: string;
  themes: string[];
  strongest_stakeholder: string;
  secondary_stakeholder: string;
  reasoning: string;
  created_at?: string;
}

/**
 * Stage-1 output. Cached forever in article_generic_scores keyed by article_id.
 * Independent of any company.
 */
interface GenericArticleScore {
  article_id: string;
  themes: string[];
  strongest_stakeholder: string;
  secondary_stakeholder: string;
  strategic_significance: number;
  timeliness: number;
  competitor_relevance: number;
  actionability: number;
  why_it_matters: string;
  reasoning: string;
}

function safeParseJson(value: string | undefined | null, fallback: unknown[] = []): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function buildNarrativeContext(bible: MessagingBible): string {
  let pillarsText = '';
  if (bible.messaging_pillars && typeof bible.messaging_pillars === 'string' && bible.messaging_pillars.trim()) {
    const trimmed = bible.messaging_pillars.trim();
    if (trimmed.startsWith('[')) {
      const parsed = safeParseJson(trimmed, []);
      if (Array.isArray(parsed) && parsed.length > 0) pillarsText = JSON.stringify(parsed);
    } else {
      pillarsText = trimmed;
    }
  }
  const icpProfiles = safeParseJson(bible.icp_profiles, []);
  const competitors = safeParseJson(bible.competitors, []);
  const audiences = safeParseJson(bible.target_audiences, []);
  const differentiators = safeParseJson(bible.differentiators, []);

  const parts: string[] = [];
  if (bible.elevator_pitch) parts.push(`Elevator pitch: ${bible.elevator_pitch}`);
  if (bible.company_description) parts.push(`Company description: ${bible.company_description}`);
  if (pillarsText) parts.push(`Messaging pillars: ${pillarsText}`);
  if (Array.isArray(icpProfiles) && icpProfiles.length > 0) parts.push(`Target buyer profiles (ICP): ${JSON.stringify(icpProfiles)}`);
  if (Array.isArray(audiences) && audiences.length > 0) parts.push(`Target audiences: ${JSON.stringify(audiences)}`);
  if (Array.isArray(competitors) && competitors.length > 0) parts.push(`Competitors: ${JSON.stringify(competitors)}`);
  if (Array.isArray(differentiators) && differentiators.length > 0) parts.push(`Differentiators: ${JSON.stringify(differentiators)}`);
  if (bible.stakeholder_matrix) {
    const stakeholders = safeParseJson(bible.stakeholder_matrix, []);
    if (Array.isArray(stakeholders) && stakeholders.length > 0) {
      parts.push(`Stakeholder matrix: ${JSON.stringify(stakeholders)}`);
    }
  }
  return parts.join('\n\n');
}

function computeUsefulnessScore(dims: {
  narrative_fit: number; icp_fit: number; stakeholder_fit_score: number;
  right_to_say: number; strategic_significance: number; timeliness: number;
  competitor_relevance: number; actionability: number;
}): number {
  const score =
    dims.narrative_fit * 0.2 +
    dims.icp_fit * 0.15 +
    dims.stakeholder_fit_score * 0.1 +
    dims.right_to_say * 0.15 +
    dims.strategic_significance * 0.15 +
    dims.timeliness * 0.1 +
    dims.competitor_relevance * 0.05 +
    dims.actionability * 0.1;
  return Math.round(score * 10) / 10;
}

function deriveRecommendedAction(usefulnessScore: number): 'act_now' | 'monitor' | 'ignore' {
  if (usefulnessScore >= 8) return 'act_now';
  if (usefulnessScore >= 6) return 'monitor';
  return 'ignore';
}

function clampDimension(value: unknown, min = 1, max = 10): number {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 1)));
}

// ─── Stage 1 — Generic article scoring (cached forever) ───────────────────

async function getCachedGenericScore(articleId: string): Promise<GenericArticleScore | null> {
  try {
    await getDb();
    const r = await sql`
      SELECT * FROM article_generic_scores WHERE article_id = ${articleId} LIMIT 1
    `;
    if (!r.rows.length) return null;
    const row = r.rows[0];
    return {
      article_id: String(row.article_id),
      themes: (() => { try { return JSON.parse(String(row.themes || '[]')); } catch { return []; } })(),
      strongest_stakeholder: String(row.strongest_stakeholder || ''),
      secondary_stakeholder: String(row.secondary_stakeholder || ''),
      strategic_significance: Number(row.strategic_significance || 1),
      timeliness: Number(row.timeliness || 1),
      competitor_relevance: Number(row.competitor_relevance || 1),
      actionability: Number(row.actionability || 1),
      why_it_matters: String(row.why_it_matters || ''),
      reasoning: String(row.reasoning || ''),
    };
  } catch (err) {
    console.error('[signals] getCachedGenericScore failed:', err);
    return null;
  }
}

async function persistGenericScore(score: GenericArticleScore): Promise<void> {
  try {
    await getDb();
    await sql`
      INSERT INTO article_generic_scores (
        article_id, themes, strongest_stakeholder, secondary_stakeholder,
        strategic_significance, timeliness, competitor_relevance, actionability,
        why_it_matters, reasoning
      ) VALUES (
        ${score.article_id},
        ${JSON.stringify(score.themes)},
        ${score.strongest_stakeholder},
        ${score.secondary_stakeholder},
        ${score.strategic_significance},
        ${score.timeliness},
        ${score.competitor_relevance},
        ${score.actionability},
        ${score.why_it_matters},
        ${score.reasoning}
      )
      ON CONFLICT (article_id) DO NOTHING
    `;
  } catch (err) {
    console.error('[signals] persistGenericScore failed:', err);
  }
}

/**
 * The system prompt for stage 1 is intentionally generic — it doesn't
 * mention any specific company. Anthropic's prompt cache will reuse this
 * across every stage-1 call within a 5-minute window.
 */
const STAGE_1_SYSTEM_PROMPT = `You are a senior insurance/insurtech market intelligence analyst. Score a news article on its INTRINSIC properties — independent of any specific company.

Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:

- themes (array of 2-5 strings): theme tags (e.g. "cyber risk", "regulation", "Lloyd's market", "AI underwriting")
- strongest_stakeholder (string): the primary insurance-buyer stakeholder/role who cares most (e.g. "CTO / CIO", "Head of Underwriting", "Chief Risk Officer")
- secondary_stakeholder (string): a secondary stakeholder who would also care
- strategic_significance (integer 1-10): how materially important is the underlying development? 1=trivial, 10=market-shaping
- timeliness (integer 1-10): how time-sensitive? 1=evergreen, 10=breaking news
- competitor_relevance (integer 1-10): are insurance vendors/competitors visibly active on this topic? 1=quiet, 10=crowded
- actionability (integer 1-10): can this become useful B2B output (post, briefing, pitch)? 1=no clear output, 10=ready-made
- why_it_matters (string): 1-2 sentences on why this matters for the insurance market in general. Specific, not generic.
- reasoning (string): 1-2 sentences explaining the score profile.

Be honest. Most articles average 3-5. Only exceptional articles average above 7.`;

async function computeGenericScore(article: NewsArticle): Promise<GenericArticleScore | null> {
  if (!anthropic) return null;
  const userMessage = `ARTICLE:
Title: ${article.title}
Summary: ${article.summary || ''}
Source: ${article.source || ''}
Category: ${article.category || ''}

Score this article's intrinsic properties now. Return only the JSON object.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: [
        { type: 'text', text: STAGE_1_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });
    void logClaudeUsage(response, { route: 'signals.generic' });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const score: GenericArticleScore = {
      article_id: article.id,
      themes: Array.isArray(parsed.themes) ? parsed.themes.map(String).slice(0, 8) : [],
      strongest_stakeholder: String(parsed.strongest_stakeholder || ''),
      secondary_stakeholder: String(parsed.secondary_stakeholder || ''),
      strategic_significance: clampDimension(parsed.strategic_significance),
      timeliness: clampDimension(parsed.timeliness),
      competitor_relevance: clampDimension(parsed.competitor_relevance),
      actionability: clampDimension(parsed.actionability),
      why_it_matters: String(parsed.why_it_matters || '').slice(0, 1000),
      reasoning: String(parsed.reasoning || '').slice(0, 1000),
    };
    await persistGenericScore(score);
    return score;
  } catch (error) {
    console.error(`[signals/stage1] Failed for article ${article.id}:`, error);
    void reportClaudeError(error, 'signals.computeGenericScore', { articleId: article.id });
    return null;
  }
}

async function getOrComputeGenericScore(article: NewsArticle): Promise<GenericArticleScore | null> {
  const cached = await getCachedGenericScore(article.id);
  if (cached) return cached;
  return await computeGenericScore(article);
}

// ─── Stage 2 — Per-company fit (small prompt) ──────────────────────────────

/**
 * Per-company prompt. Receives the already-computed stage-1 output so it
 * doesn't have to re-derive themes / stakeholder / significance / etc.
 * Only asks for the 4 company-specific dimensions + commentary.
 */
function buildStage2Prompt(generic: GenericArticleScore): string {
  return `You are scoring a news article's FIT with a specific insurance/insurtech company. The article's intrinsic properties have already been scored — focus only on the company-fit dimensions.

ARTICLE INTRINSIC PROFILE (already computed):
- Themes: ${generic.themes.join(', ')}
- Primary stakeholder: ${generic.strongest_stakeholder}
- Secondary stakeholder: ${generic.secondary_stakeholder}
- Strategic significance: ${generic.strategic_significance}/10
- Timeliness: ${generic.timeliness}/10
- Competitor relevance: ${generic.competitor_relevance}/10
- Actionability: ${generic.actionability}/10
- Why it matters (generic): ${generic.why_it_matters}

Return ONLY valid JSON (no markdown, no code fences):

- narrative_fit (1-10): does the article map to one of THIS company's narrative pillars?
- icp_fit (1-10): does it matter to THIS company's named ICP/buyer profiles?
- stakeholder_fit (1-10): does it affect THIS company's specific named stakeholder buyers?
- right_to_say (1-10): does THIS company have credibility/data/expertise to comment on this?
- why_it_matters_to_buyers (string): 1-2 sentences on why THIS company's specific buyers care. Reference named buyer types.
- competitor_context (string): any implications for THIS company's named competitors. Empty string if none.

Be honest. Most articles average 3-5 across these fit dimensions.`;
}

interface Stage2Result {
  narrative_fit: number;
  icp_fit: number;
  stakeholder_fit_score: number;
  right_to_say: number;
  why_it_matters_to_buyers: string;
  competitor_context: string;
}

async function computeCompanyFit(
  article: NewsArticle,
  generic: GenericArticleScore,
  bible: MessagingBible,
): Promise<Stage2Result | null> {
  if (!anthropic) return null;
  const narrativeContext = buildNarrativeContext(bible);

  const userMessage = `COMPANY CONTEXT:
${narrativeContext}

ARTICLE:
Title: ${article.title}
Summary: ${article.summary || ''}
Source: ${article.source || ''}

Score this article's fit for the company now. Return only the JSON object.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: [
        { type: 'text', text: buildStage2Prompt(generic), cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });
    void logClaudeUsage(response, { route: 'signals.companyFit', companyId: bible.company_id });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      narrative_fit: clampDimension(parsed.narrative_fit),
      icp_fit: clampDimension(parsed.icp_fit),
      stakeholder_fit_score: clampDimension(parsed.stakeholder_fit),
      right_to_say: clampDimension(parsed.right_to_say),
      why_it_matters_to_buyers: String(parsed.why_it_matters_to_buyers || ''),
      competitor_context: String(parsed.competitor_context || ''),
    };
  } catch (error) {
    console.error(`[signals/stage2] Failed for article ${article.id} × company ${bible.company_id}:`, error);
    void reportClaudeError(error, 'signals.computeCompanyFit', {
      articleId: article.id, companyId: bible.company_id,
    });
    return null;
  }
}

// ─── Orchestrator (public API — unchanged signature) ───────────────────────

function neutralAnalysis(article: NewsArticle, bible: MessagingBible): SignalAnalysis {
  return {
    company_id: bible.company_id, article_id: article.id,
    narrative_fit: 1, icp_fit: 1, stakeholder_fit_score: 1, right_to_say: 1,
    strategic_significance: 1, timeliness: 1, competitor_relevance: 1, actionability: 1,
    usefulness_score: 1, urgency: 0,
    why_it_matters: '', why_it_matters_to_buyers: '',
    recommended_action: 'ignore', competitor_context: '', themes: [],
    strongest_stakeholder: '', secondary_stakeholder: '', reasoning: '',
  };
}

/**
 * Score an article against a company's messaging bible. Internally splits the
 * work into stage 1 (article intrinsic, cached) and stage 2 (company fit).
 *
 * Backward-compatible with the v1 single-call signature so all the existing
 * cron + onboarding + admin callers keep working without changes.
 */
export async function analyzeSignalRelevance(
  article: NewsArticle,
  bible: MessagingBible,
): Promise<SignalAnalysis> {
  if (!anthropic) return neutralAnalysis(article, bible);

  const generic = await getOrComputeGenericScore(article);
  if (!generic) return neutralAnalysis(article, bible);

  const fit = await computeCompanyFit(article, generic, bible);
  if (!fit) {
    // Stage 1 succeeded but stage 2 failed — return the generic dimensions
    // with neutral company-fit so we don't lose the work. Useful articles can
    // still be re-scored later.
    return {
      ...neutralAnalysis(article, bible),
      strongest_stakeholder: generic.strongest_stakeholder,
      secondary_stakeholder: generic.secondary_stakeholder,
      strategic_significance: generic.strategic_significance,
      timeliness: generic.timeliness,
      competitor_relevance: generic.competitor_relevance,
      actionability: generic.actionability,
      themes: generic.themes,
      why_it_matters: generic.why_it_matters,
      reasoning: generic.reasoning,
      usefulness_score: computeUsefulnessScore({
        narrative_fit: 1, icp_fit: 1, stakeholder_fit_score: 1, right_to_say: 1,
        strategic_significance: generic.strategic_significance,
        timeliness: generic.timeliness,
        competitor_relevance: generic.competitor_relevance,
        actionability: generic.actionability,
      }),
      urgency: Math.round(generic.timeliness * 10),
    };
  }

  const dims = {
    narrative_fit: fit.narrative_fit,
    icp_fit: fit.icp_fit,
    stakeholder_fit_score: fit.stakeholder_fit_score,
    right_to_say: fit.right_to_say,
    strategic_significance: generic.strategic_significance,
    timeliness: generic.timeliness,
    competitor_relevance: generic.competitor_relevance,
    actionability: generic.actionability,
  };
  const usefulnessScore = computeUsefulnessScore(dims);
  const recommendedAction = deriveRecommendedAction(usefulnessScore);
  const urgency = Math.round(dims.timeliness * 10);

  return {
    company_id: bible.company_id,
    article_id: article.id,
    ...dims,
    usefulness_score: usefulnessScore,
    urgency,
    why_it_matters: generic.why_it_matters,
    why_it_matters_to_buyers: fit.why_it_matters_to_buyers,
    recommended_action: recommendedAction,
    competitor_context: fit.competitor_context,
    themes: generic.themes,
    strongest_stakeholder: generic.strongest_stakeholder,
    secondary_stakeholder: generic.secondary_stakeholder,
    reasoning: generic.reasoning,
  };
}

export async function analyzeBatch(
  articles: NewsArticle[],
  bible: MessagingBible,
  maxConcurrent: number = 5,
): Promise<SignalAnalysis[]> {
  const allResults: SignalAnalysis[] = [];
  for (let i = 0; i < articles.length; i += maxConcurrent) {
    const batch = articles.slice(i, i + maxConcurrent);
    const results = await Promise.allSettled(
      batch.map((article) => analyzeSignalRelevance(article, bible)),
    );
    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<SignalAnalysis> => r.status === 'fulfilled')
      .map((r) => r.value);
    allResults.push(...fulfilled);
  }
  return allResults;
}
