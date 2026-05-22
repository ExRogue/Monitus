/**
 * Market Conversations — clusters of related news signals about a single
 * "what the market is talking about" story.
 *
 * Each conversation:
 *   - Groups N signal_analyses rows that all reference the same underlying
 *     market story (e.g. "Lloyd's Q1 results", "AI underwriting governance debate")
 *   - Carries five scores: market_attention, momentum, saturation,
 *     coverage_quality, company_relevance (each a value 0-10 + label + explanation)
 *   - Carries Claude's narrative interpretation of the cluster (what changed,
 *     what's missing, commercial implications, recommended next move)
 *
 * Conversations are the read model for the Market Brief and Market View pages.
 * The Strategy Partner / Content Producer surfaces can also consume them.
 */
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

// View-status values per the cofounder's Market View v2 spec (2026-05-22).
// 'action_recommended' was renamed to 'needs_review' — the spec is explicit
// that Market View must not surface action language (actions live in Market
// Brief / This Week's Priorities). Display labels are still mapped client-side.
// 'ignored' is derived from the archived flag rather than a fifth enum value.
export type ConversationViewStatus =
  | 'included_in_brief'
  | 'needs_review'
  | 'monitor_only'
  | 'tracked_not_prioritised';

// Four-bucket confidence per the spec. 'medium-high' is the threshold for
// language like "the market is increasingly framing…" / "coverage is shifting
// from X to Y". 'high' unlocks "clear convergence" / "this is a high-signal
// market conversation". See src/lib/evidence-rules.ts for the gates.
export type ConfidenceLevel = 'low' | 'medium' | 'medium-high' | 'high';

export interface ScoreEntry {
  value: number;
  label: string;
  explanation: string;
}

export interface ConversationScores {
  marketAttention: ScoreEntry;
  momentum: ScoreEntry;
  saturation: ScoreEntry;
  coverageQuality: ScoreEntry;
  companyRelevance: ScoreEntry;
}

export interface ConversationInterpretation {
  executiveSummary: string;
  whatChanged: string;
  whatMarketIsSaying: string;
  whatIsMissing: string;
  whyThisMatters: string;
  whyIncluded: string[];
  confidenceLevel: ConfidenceLevel;
  confidenceReason: string;
  narrativeFit: string;
  commercialImplications: string[];
  recommendedNextMove: string;
  recommendedActions: {
    Sales?: string;
    Outbound?: string;
    FounderContent?: string;
    Website?: string;
    PR?: string;
    CampaignPlanning?: string;
    PodcastWebinar?: string;
    MonitorOnly?: string;
  };
  risksOrLimitations: string[];
  sourceCitations?: string[];
}

export interface ConversationEvidenceSummary {
  itemCount: number;
  sourceCount: number;
  analysisPieces?: number;
  lastUpdated: string;
}

export interface MarketConversation {
  id: string;
  companyId: string;
  title: string;
  summary: string;
  firstDetectedAt: string;
  latestCoverageAt: string;
  sourceMix: Record<string, number>;
  dominantEntities: string[];
  dominantTopics: string[];
  angleMap: string[];
  confidence: number;
  isDemo: boolean;
  viewStatus: ConversationViewStatus;
  marketSignal: string;
  whyItIsHere: string;
  suggestedUse: string[];
  archived: boolean;
  /** Set by the user via /api/market-view/conversations/[id]/follow. A
   *  followed conversation always shows on Market View regardless of the
   *  default visibility gates. */
  isFollowed: boolean;
  score?: ConversationScores;
  interpretation?: ConversationInterpretation;
  evidenceSummary?: ConversationEvidenceSummary;
  items?: ConversationItemRef[];
}

export interface ConversationItemRef {
  signalAnalysisId: string;
  articleId: string;
  role: 'primary' | 'supporting' | 'tangential';
  relevanceToCluster: number;
  // Hydrated from news_articles when needed
  title?: string;
  source?: string;
  sourceUrl?: string;
  publishedAt?: string;
  snippet?: string;
}

// ─── Read helpers ──────────────────────────────────────────────────────────

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToConversation(row: Record<string, unknown>): MarketConversation {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    title: String(row.title || ''),
    summary: String(row.summary || ''),
    firstDetectedAt: row.first_detected_at ? new Date(row.first_detected_at as string).toISOString() : '',
    latestCoverageAt: row.latest_coverage_at ? new Date(row.latest_coverage_at as string).toISOString() : '',
    sourceMix: parseJson(row.source_mix, {} as Record<string, number>),
    dominantEntities: parseJson(row.dominant_entities, [] as string[]),
    dominantTopics: parseJson(row.dominant_topics, [] as string[]),
    angleMap: parseJson(row.angle_map, [] as string[]),
    confidence: Number(row.confidence || 0),
    isDemo: Boolean(row.is_demo),
    viewStatus: (String(row.view_status || 'tracked_not_prioritised') as ConversationViewStatus),
    marketSignal: String(row.market_signal || ''),
    whyItIsHere: String(row.why_it_is_here || ''),
    suggestedUse: parseJson(row.suggested_use, [] as string[]),
    archived: Boolean(row.archived),
    isFollowed: Boolean(row.is_followed),
  };
}

function rowToScores(row: Record<string, unknown> | undefined): ConversationScores | undefined {
  if (!row) return undefined;
  return {
    marketAttention: {
      value: Number(row.market_attention_value || 0),
      label: String(row.market_attention_label || 'Low'),
      explanation: String(row.market_attention_explanation || ''),
    },
    momentum: {
      value: Number(row.momentum_value || 0),
      label: String(row.momentum_label || 'Stable'),
      explanation: String(row.momentum_explanation || ''),
    },
    saturation: {
      value: Number(row.saturation_value || 0),
      label: String(row.saturation_label || 'Low'),
      explanation: String(row.saturation_explanation || ''),
    },
    coverageQuality: {
      value: Number(row.coverage_quality_value || 0),
      label: String(row.coverage_quality_label || 'Low'),
      explanation: String(row.coverage_quality_explanation || ''),
    },
    companyRelevance: {
      value: Number(row.company_relevance_value || 0),
      label: String(row.company_relevance_label || 'Low'),
      explanation: String(row.company_relevance_explanation || ''),
    },
  };
}

function rowToInterpretation(row: Record<string, unknown> | undefined): ConversationInterpretation | undefined {
  if (!row) return undefined;
  return {
    executiveSummary: String(row.executive_summary || ''),
    whatChanged: String(row.what_changed || ''),
    whatMarketIsSaying: String(row.what_market_is_saying || ''),
    whatIsMissing: String(row.what_is_missing || ''),
    whyThisMatters: String(row.why_this_matters || ''),
    whyIncluded: parseJson(row.why_included, [] as string[]),
    confidenceLevel: (String(row.confidence_level || 'medium') as ConfidenceLevel),
    confidenceReason: String(row.confidence_reason || ''),
    narrativeFit: String(row.narrative_fit || ''),
    commercialImplications: parseJson(row.commercial_implications, [] as string[]),
    recommendedNextMove: String(row.recommended_next_move || ''),
    recommendedActions: parseJson(row.recommended_actions, {} as ConversationInterpretation['recommendedActions']),
    risksOrLimitations: parseJson(row.risks_or_limitations, [] as string[]),
    sourceCitations: parseJson(row.source_citations, [] as string[]),
  };
}

/** Fetch one conversation (with score + interpretation) by id, scoped to a company. */
export async function getConversation(
  conversationId: string,
  companyId: string,
  options?: { withItems?: boolean },
): Promise<MarketConversation | null> {
  await getDb();

  const r = await sql`
    SELECT mc.*,
           cs.market_attention_value, cs.market_attention_label, cs.market_attention_explanation,
           cs.momentum_value, cs.momentum_label, cs.momentum_explanation,
           cs.saturation_value, cs.saturation_label, cs.saturation_explanation,
           cs.coverage_quality_value, cs.coverage_quality_label, cs.coverage_quality_explanation,
           cs.company_relevance_value, cs.company_relevance_label, cs.company_relevance_explanation,
           ci.executive_summary, ci.what_changed, ci.what_market_is_saying, ci.what_is_missing,
           ci.why_this_matters, ci.why_included, ci.confidence_level, ci.confidence_reason,
           ci.narrative_fit, ci.commercial_implications, ci.recommended_next_move,
           ci.recommended_actions, ci.risks_or_limitations, ci.source_citations
    FROM market_conversations mc
    LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
    LEFT JOIN conversation_interpretations ci ON ci.conversation_id = mc.id
    WHERE mc.id = ${conversationId} AND mc.company_id = ${companyId}
    LIMIT 1
  `;
  if (!r.rows.length) return null;

  const conv = rowToConversation(r.rows[0]);
  conv.score = rowToScores(r.rows[0]);
  conv.interpretation = rowToInterpretation(r.rows[0]);

  if (options?.withItems) {
    const itemsResult = await sql`
      SELECT ci.signal_analysis_id, ci.article_id, ci.role, ci.relevance_to_cluster,
             na.title, na.source, na.source_url, na.published_at, na.summary
      FROM conversation_items ci
      JOIN news_articles na ON na.id = ci.article_id
      WHERE ci.conversation_id = ${conversationId}
      ORDER BY ci.relevance_to_cluster DESC, na.published_at DESC
    `;
    conv.items = itemsResult.rows.map(row => ({
      signalAnalysisId: String(row.signal_analysis_id),
      articleId: String(row.article_id),
      role: (String(row.role || 'supporting') as 'primary' | 'supporting' | 'tangential'),
      relevanceToCluster: Number(row.relevance_to_cluster || 0),
      title: String(row.title || ''),
      source: String(row.source || ''),
      sourceUrl: String(row.source_url || ''),
      publishedAt: row.published_at ? new Date(row.published_at as string).toISOString() : undefined,
      snippet: String(row.summary || '').slice(0, 300),
    }));
    conv.evidenceSummary = computeEvidenceSummary(conv.items);
  }

  return conv;
}

function computeEvidenceSummary(items: ConversationItemRef[]): ConversationEvidenceSummary {
  const sources = new Set<string>();
  let latest = 0;
  for (const it of items) {
    if (it.source) sources.add(it.source);
    if (it.publishedAt) {
      const t = new Date(it.publishedAt).getTime();
      if (t > latest) latest = t;
    }
  }
  const ageDays = latest ? Math.floor((Date.now() - latest) / 86_400_000) : Infinity;
  let lastUpdated = 'this week';
  if (ageDays < 1) lastUpdated = 'today';
  else if (ageDays < 2) lastUpdated = 'yesterday';
  else if (ageDays < 7) lastUpdated = 'this week';
  else if (ageDays < 30) lastUpdated = 'this month';
  else lastUpdated = 'older';

  return {
    itemCount: items.length,
    sourceCount: sources.size,
    lastUpdated,
  };
}

/** Fetch all conversations for a company with optional filter/sort (Market View).
 *
 * Two distinct filter axes:
 *   - `filter` — the user-facing chip ("Rising", "Strong fit", etc.). 'default'
 *     applies the spec's visibility rules (hide low-relevance + low-attention
 *     noise). 'all' shows everything that isn't archived so power users can
 *     audit what the system is filtering out.
 *   - `sort`   — the sort axis (Relevance / Momentum / Attention / Saturation
 *     / Latest). Defaults to Relevance per the spec.
 */
export interface MarketViewFilters {
  filter?: 'default' | 'all' | 'rising' | 'under-discussed' | 'strong-fit' | 'high-confidence'
         | 'sales-useful' | 'pr-potential' | 'official-source' | 'monitor-only' | 'followed';
  sort?: 'relevance' | 'momentum' | 'attention' | 'latest' | 'saturation';
  limit?: number;
}

export async function listConversations(
  companyId: string,
  filters: MarketViewFilters = {},
): Promise<MarketConversation[]> {
  await getDb();

  const limit = Math.min(200, Math.max(1, filters.limit || 100));
  const filter = filters.filter || 'all';
  const sort = filters.sort || 'relevance';

  // Inline filter + sort via template literals. We tag each branch with the
  // exact ORDER BY so PostgreSQL can use the relevant index. Each branch
  // joins the conversation_items count subquery so we can apply the
  // thin-evidence visibility floor (1 item / 1 source) downstream.
  let result;
  switch (sort) {
    case 'momentum':
      result = await sql`
        SELECT mc.*,
               cs.market_attention_value, cs.market_attention_label, cs.market_attention_explanation,
               cs.momentum_value, cs.momentum_label, cs.momentum_explanation,
               cs.saturation_value, cs.saturation_label, cs.saturation_explanation,
               cs.coverage_quality_value, cs.coverage_quality_label, cs.coverage_quality_explanation,
               cs.company_relevance_value, cs.company_relevance_label, cs.company_relevance_explanation,
               COALESCE(ic.item_count, 0) AS item_count,
               COALESCE(ic.source_count, 0) AS source_count
        FROM market_conversations mc
        LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
        LEFT JOIN (
          SELECT ci.conversation_id,
                 COUNT(*) AS item_count,
                 COUNT(DISTINCT na.source) AS source_count
          FROM conversation_items ci
          LEFT JOIN news_articles na ON na.id = ci.article_id
          GROUP BY ci.conversation_id
        ) ic ON ic.conversation_id = mc.id
        WHERE mc.company_id = ${companyId} AND mc.archived = false
        ORDER BY cs.momentum_value DESC NULLS LAST, mc.latest_coverage_at DESC
        LIMIT ${limit}
      `;
      break;
    case 'attention':
      result = await sql`
        SELECT mc.*,
               cs.market_attention_value, cs.market_attention_label, cs.market_attention_explanation,
               cs.momentum_value, cs.momentum_label, cs.momentum_explanation,
               cs.saturation_value, cs.saturation_label, cs.saturation_explanation,
               cs.coverage_quality_value, cs.coverage_quality_label, cs.coverage_quality_explanation,
               cs.company_relevance_value, cs.company_relevance_label, cs.company_relevance_explanation,
               COALESCE(ic.item_count, 0) AS item_count,
               COALESCE(ic.source_count, 0) AS source_count
        FROM market_conversations mc
        LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
        LEFT JOIN (
          SELECT ci.conversation_id,
                 COUNT(*) AS item_count,
                 COUNT(DISTINCT na.source) AS source_count
          FROM conversation_items ci
          LEFT JOIN news_articles na ON na.id = ci.article_id
          GROUP BY ci.conversation_id
        ) ic ON ic.conversation_id = mc.id
        WHERE mc.company_id = ${companyId} AND mc.archived = false
        ORDER BY cs.market_attention_value DESC NULLS LAST, mc.latest_coverage_at DESC
        LIMIT ${limit}
      `;
      break;
    case 'latest':
      result = await sql`
        SELECT mc.*,
               cs.market_attention_value, cs.market_attention_label, cs.market_attention_explanation,
               cs.momentum_value, cs.momentum_label, cs.momentum_explanation,
               cs.saturation_value, cs.saturation_label, cs.saturation_explanation,
               cs.coverage_quality_value, cs.coverage_quality_label, cs.coverage_quality_explanation,
               cs.company_relevance_value, cs.company_relevance_label, cs.company_relevance_explanation,
               COALESCE(ic.item_count, 0) AS item_count,
               COALESCE(ic.source_count, 0) AS source_count
        FROM market_conversations mc
        LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
        LEFT JOIN (
          SELECT ci.conversation_id,
                 COUNT(*) AS item_count,
                 COUNT(DISTINCT na.source) AS source_count
          FROM conversation_items ci
          LEFT JOIN news_articles na ON na.id = ci.article_id
          GROUP BY ci.conversation_id
        ) ic ON ic.conversation_id = mc.id
        WHERE mc.company_id = ${companyId} AND mc.archived = false
        ORDER BY mc.latest_coverage_at DESC
        LIMIT ${limit}
      `;
      break;
    case 'saturation':
      // ASCENDING — under-discussed conversations first
      result = await sql`
        SELECT mc.*,
               cs.market_attention_value, cs.market_attention_label, cs.market_attention_explanation,
               cs.momentum_value, cs.momentum_label, cs.momentum_explanation,
               cs.saturation_value, cs.saturation_label, cs.saturation_explanation,
               cs.coverage_quality_value, cs.coverage_quality_label, cs.coverage_quality_explanation,
               cs.company_relevance_value, cs.company_relevance_label, cs.company_relevance_explanation,
               COALESCE(ic.item_count, 0) AS item_count,
               COALESCE(ic.source_count, 0) AS source_count
        FROM market_conversations mc
        LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
        LEFT JOIN (
          SELECT ci.conversation_id,
                 COUNT(*) AS item_count,
                 COUNT(DISTINCT na.source) AS source_count
          FROM conversation_items ci
          LEFT JOIN news_articles na ON na.id = ci.article_id
          GROUP BY ci.conversation_id
        ) ic ON ic.conversation_id = mc.id
        WHERE mc.company_id = ${companyId} AND mc.archived = false
        ORDER BY cs.saturation_value ASC NULLS LAST, cs.company_relevance_value DESC
        LIMIT ${limit}
      `;
      break;
    case 'relevance':
    default:
      result = await sql`
        SELECT mc.*,
               cs.market_attention_value, cs.market_attention_label, cs.market_attention_explanation,
               cs.momentum_value, cs.momentum_label, cs.momentum_explanation,
               cs.saturation_value, cs.saturation_label, cs.saturation_explanation,
               cs.coverage_quality_value, cs.coverage_quality_label, cs.coverage_quality_explanation,
               cs.company_relevance_value, cs.company_relevance_label, cs.company_relevance_explanation,
               COALESCE(ic.item_count, 0) AS item_count,
               COALESCE(ic.source_count, 0) AS source_count
        FROM market_conversations mc
        LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
        LEFT JOIN (
          SELECT ci.conversation_id,
                 COUNT(*) AS item_count,
                 COUNT(DISTINCT na.source) AS source_count
          FROM conversation_items ci
          LEFT JOIN news_articles na ON na.id = ci.article_id
          GROUP BY ci.conversation_id
        ) ic ON ic.conversation_id = mc.id
        WHERE mc.company_id = ${companyId} AND mc.archived = false
        ORDER BY cs.company_relevance_value DESC NULLS LAST, mc.latest_coverage_at DESC
        LIMIT ${limit}
      `;
      break;
  }

  // Hydrate interpretations in a second query (only the ones we need for filtering).
  const ids = result.rows.map(r => r.id as string);
  let interpsById = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const interps = await sql`
      SELECT * FROM conversation_interpretations WHERE conversation_id = ANY(${ids as any}::text[])
    `;
    interpsById = new Map(interps.rows.map(r => [String(r.conversation_id), r]));
  }

  const all = result.rows.map(row => {
    const conv = rowToConversation(row);
    conv.score = rowToScores(row);
    conv.interpretation = rowToInterpretation(interpsById.get(conv.id));
    // Hydrate evidenceSummary from the JOIN counts so the filter + UI both
    // have honest item/source totals without needing to load conversation_items.
    const itemCount = Number(row.item_count || 0);
    const sourceCount = Number(row.source_count || 0);
    if (itemCount > 0 || sourceCount > 0) {
      conv.evidenceSummary = {
        itemCount,
        sourceCount,
        lastUpdated: conv.latestCoverageAt,
      };
    }
    return conv;
  });

  // Apply post-query filter — most filters are easier to express in code than
  // in SQL because they touch JSON columns (recommendedActions, dominantTopics).
  return all.filter(c => filterConversation(c, filter));
}

function filterConversation(c: MarketConversation, filter: NonNullable<MarketViewFilters['filter']>): boolean {
  // 'all' — show everything (modulo the archived = false at the SQL level).
  // Useful for auditing what the default filter would have hidden.
  if (filter === 'all') return true;

  // 'default' — apply the cofounder's Market View v2 visibility rules.
  if (filter === 'default') {
    // Followed conversations always show, regardless of evidence floor.
    if (c.isFollowed) return true;

    // Thin-evidence floor — single-item OR single-source conversations
    // need explicit promotion (Included in brief / Needs review). Without
    // that promotion we hide them: showing "Coverage Quality: High" on a
    // single source is the kind of overstatement the spec warns against.
    // Users who want to see what's been filtered switch to "All".
    const itemCount = c.evidenceSummary?.itemCount ?? 0;
    const sourceCount = c.evidenceSummary?.sourceCount ?? 0;
    const isThinEvidence = itemCount <= 1 || sourceCount <= 1;
    if (isThinEvidence) {
      // Allow only if the interpreter has explicitly promoted to brief or
      // flagged for human review — both signal "we know it's thin but it
      // matters".
      return c.viewStatus === 'included_in_brief' || c.viewStatus === 'needs_review';
    }

    // Above thin-evidence floor — apply the spec's visibility rules.
    if (c.viewStatus === 'included_in_brief') return true;
    if (c.viewStatus === 'needs_review') return true;
    const relevance = c.score?.companyRelevance?.value ?? 0;
    if (relevance >= 4) return true;
    // Allow Emerging/Rising momentum to surface even at lower relevance,
    // provided attention is at least Moderate.
    const momentumLabel = (c.score?.momentum?.label || '').toLowerCase();
    const attention = c.score?.marketAttention?.value ?? 0;
    if (/rising|emerging|accelerating/.test(momentumLabel) && attention >= 4) return true;
    // Monitor-only counts as visible only when relevance is at least Medium
    // — otherwise it's pure noise.
    if (c.viewStatus === 'monitor_only' && relevance >= 4) return true;
    return false;
  }

  if (filter === 'followed') {
    return c.isFollowed;
  }
  if (filter === 'rising') {
    const m = c.score?.momentum;
    if (!m) return false;
    return m.value >= 6 || /rising|accelerating|emerging/i.test(m.label);
  }
  if (filter === 'under-discussed') {
    return (c.score?.saturation?.value ?? 10) <= 5;
  }
  if (filter === 'strong-fit') {
    return (c.score?.companyRelevance?.value ?? 0) >= 7;
  }
  if (filter === 'high-confidence') {
    return c.confidence >= 0.8
      || c.interpretation?.confidenceLevel === 'high'
      || c.interpretation?.confidenceLevel === 'medium-high';
  }
  if (filter === 'sales-useful') {
    return Boolean(c.interpretation?.recommendedActions?.Sales);
  }
  if (filter === 'pr-potential') {
    return Boolean(c.interpretation?.recommendedActions?.PR);
  }
  if (filter === 'official-source') {
    // Heuristic: dominant entities / topics mention regulator-y keywords
    const haystack = [...c.dominantEntities, ...c.dominantTopics].join(' ').toLowerCase();
    return /fca|pra|lloyd|naic|doi|treasury|regulator|consultation|directive/.test(haystack);
  }
  if (filter === 'monitor-only') {
    return c.viewStatus === 'monitor_only';
  }
  return true;
}

// ─── Write helpers ─────────────────────────────────────────────────────────

export interface CreateConversationInput {
  companyId: string;
  title: string;
  summary?: string;
  dominantEntities?: string[];
  dominantTopics?: string[];
  angleMap?: string[];
  confidence?: number;
  isDemo?: boolean;
  viewStatus?: ConversationViewStatus;
  marketSignal?: string;
  whyItIsHere?: string;
  suggestedUse?: string[];
  firstDetectedAt?: Date;
  latestCoverageAt?: Date;
  sourceMix?: Record<string, number>;
}

export async function createConversation(input: CreateConversationInput): Promise<string> {
  const id = uuidv4();
  await sql`
    INSERT INTO market_conversations (
      id, company_id, title, summary,
      first_detected_at, latest_coverage_at, source_mix,
      dominant_entities, dominant_topics, angle_map,
      confidence, is_demo, view_status,
      market_signal, why_it_is_here, suggested_use
    ) VALUES (
      ${id}, ${input.companyId}, ${input.title}, ${input.summary || ''},
      ${input.firstDetectedAt?.toISOString() || new Date().toISOString()},
      ${input.latestCoverageAt?.toISOString() || new Date().toISOString()},
      ${JSON.stringify(input.sourceMix || {})},
      ${JSON.stringify(input.dominantEntities || [])},
      ${JSON.stringify(input.dominantTopics || [])},
      ${JSON.stringify(input.angleMap || [])},
      ${input.confidence ?? 0}, ${input.isDemo || false},
      ${input.viewStatus || 'tracked_not_prioritised'},
      ${input.marketSignal || ''}, ${input.whyItIsHere || ''},
      ${JSON.stringify(input.suggestedUse || [])}
    )
  `;
  return id;
}

export async function attachItemsToConversation(
  conversationId: string,
  items: { signalAnalysisId: string; articleId: string; role?: 'primary' | 'supporting' | 'tangential'; relevanceToCluster?: number }[],
): Promise<void> {
  for (const item of items) {
    await sql`
      INSERT INTO conversation_items (id, conversation_id, signal_analysis_id, article_id, role, relevance_to_cluster)
      VALUES (${uuidv4()}, ${conversationId}, ${item.signalAnalysisId}, ${item.articleId}, ${item.role || 'supporting'}, ${item.relevanceToCluster ?? 0})
      ON CONFLICT (conversation_id, signal_analysis_id) DO NOTHING
    `;
  }
}

export async function upsertConversationScore(conversationId: string, scores: ConversationScores): Promise<void> {
  await sql`
    INSERT INTO conversation_scores (
      id, conversation_id,
      market_attention_value, market_attention_label, market_attention_explanation,
      momentum_value, momentum_label, momentum_explanation,
      saturation_value, saturation_label, saturation_explanation,
      coverage_quality_value, coverage_quality_label, coverage_quality_explanation,
      company_relevance_value, company_relevance_label, company_relevance_explanation
    ) VALUES (
      ${uuidv4()}, ${conversationId},
      ${scores.marketAttention.value}, ${scores.marketAttention.label}, ${scores.marketAttention.explanation},
      ${scores.momentum.value}, ${scores.momentum.label}, ${scores.momentum.explanation},
      ${scores.saturation.value}, ${scores.saturation.label}, ${scores.saturation.explanation},
      ${scores.coverageQuality.value}, ${scores.coverageQuality.label}, ${scores.coverageQuality.explanation},
      ${scores.companyRelevance.value}, ${scores.companyRelevance.label}, ${scores.companyRelevance.explanation}
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
      market_attention_value = EXCLUDED.market_attention_value,
      market_attention_label = EXCLUDED.market_attention_label,
      market_attention_explanation = EXCLUDED.market_attention_explanation,
      momentum_value = EXCLUDED.momentum_value,
      momentum_label = EXCLUDED.momentum_label,
      momentum_explanation = EXCLUDED.momentum_explanation,
      saturation_value = EXCLUDED.saturation_value,
      saturation_label = EXCLUDED.saturation_label,
      saturation_explanation = EXCLUDED.saturation_explanation,
      coverage_quality_value = EXCLUDED.coverage_quality_value,
      coverage_quality_label = EXCLUDED.coverage_quality_label,
      coverage_quality_explanation = EXCLUDED.coverage_quality_explanation,
      company_relevance_value = EXCLUDED.company_relevance_value,
      company_relevance_label = EXCLUDED.company_relevance_label,
      company_relevance_explanation = EXCLUDED.company_relevance_explanation,
      updated_at = NOW()
  `;
}

export async function upsertConversationInterpretation(
  conversationId: string,
  interp: ConversationInterpretation,
): Promise<void> {
  await sql`
    INSERT INTO conversation_interpretations (
      id, conversation_id,
      executive_summary, what_changed, what_market_is_saying, what_is_missing, why_this_matters,
      why_included, confidence_level, confidence_reason, narrative_fit,
      commercial_implications, recommended_next_move, recommended_actions,
      risks_or_limitations, source_citations
    ) VALUES (
      ${uuidv4()}, ${conversationId},
      ${interp.executiveSummary}, ${interp.whatChanged}, ${interp.whatMarketIsSaying},
      ${interp.whatIsMissing}, ${interp.whyThisMatters},
      ${JSON.stringify(interp.whyIncluded)}, ${interp.confidenceLevel}, ${interp.confidenceReason},
      ${interp.narrativeFit}, ${JSON.stringify(interp.commercialImplications)},
      ${interp.recommendedNextMove}, ${JSON.stringify(interp.recommendedActions)},
      ${JSON.stringify(interp.risksOrLimitations)}, ${JSON.stringify(interp.sourceCitations || [])}
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
      executive_summary = EXCLUDED.executive_summary,
      what_changed = EXCLUDED.what_changed,
      what_market_is_saying = EXCLUDED.what_market_is_saying,
      what_is_missing = EXCLUDED.what_is_missing,
      why_this_matters = EXCLUDED.why_this_matters,
      why_included = EXCLUDED.why_included,
      confidence_level = EXCLUDED.confidence_level,
      confidence_reason = EXCLUDED.confidence_reason,
      narrative_fit = EXCLUDED.narrative_fit,
      commercial_implications = EXCLUDED.commercial_implications,
      recommended_next_move = EXCLUDED.recommended_next_move,
      recommended_actions = EXCLUDED.recommended_actions,
      risks_or_limitations = EXCLUDED.risks_or_limitations,
      source_citations = EXCLUDED.source_citations,
      updated_at = NOW()
  `;
}

export async function updateConversationViewStatus(
  conversationId: string,
  viewStatus: ConversationViewStatus,
  marketSignal?: string,
  whyItIsHere?: string,
  suggestedUse?: string[],
): Promise<void> {
  await sql`
    UPDATE market_conversations
    SET view_status = ${viewStatus},
        market_signal = COALESCE(${marketSignal || null}, market_signal),
        why_it_is_here = COALESCE(${whyItIsHere || null}, why_it_is_here),
        suggested_use = COALESCE(${suggestedUse ? JSON.stringify(suggestedUse) : null}, suggested_use),
        updated_at = NOW()
    WHERE id = ${conversationId}
  `;
}
