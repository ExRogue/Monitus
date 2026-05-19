/**
 * Market Brief — the weekly synthesis that's the primary landing page in the
 * new IA (replaces Workspace).
 *
 * Structure (matches prototype Market Brief page):
 *   - Market Read (TL;DR + Analyst Read + Research Briefing)
 *   - This Week's Priorities (recommended_actions where urgency ∈ {now, this-week})
 *   - Commercial Implications (positioning, sales, content, pipeline)
 *   - Market Conversations Driving This Brief (the conversations included_in_brief
 *     this week, ordered by influence)
 *
 * Generation cadence: once a week from /api/cron/weekly-brief.
 *
 * Cost: one Sonnet call per company per week (the synthesis). The five
 * underlying conversation interpretations were already done by
 * conversation-interpreter.ts.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';
import { getCompanyProfile, type CompanyProfile } from './company-profile';
import {
  getConversation,
  type MarketConversation,
} from './market-conversations';
import {
  createAction,
  listActionsForBrief,
  type RecommendedAction,
  type ActionCategory,
  type ActionPriority,
  type ActionUrgency,
} from './recommended-actions';

import { reportClaudeError } from './monitoring';
import { logClaudeUsage } from './claude-cost';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface MarketReadTldr {
  headline: string;
  whyItMatters: string;
  signals: string[];
}

export interface MarketReadResearchBriefing {
  analystThesis: string;
  whatChanged: string;
  whatMarketIsSaying: string;
  whatIsMissing: string;
  sourcePattern: string;
  whyItMatters: string;
  sourceEvidence: { source: string; signal: string; type: string }[];
  confidence: string;
  limitations: string;
}

export interface MarketRead {
  tldr: MarketReadTldr;
  analystRead: string;
  researchBriefing: MarketReadResearchBriefing;
}

export interface CommercialImplications {
  positioning: string;
  sales: string;
  content: string;
  pipeline: string;
}

export interface MarketBriefScanStats {
  sourcesScanned: number;
  itemsReviewed: number;
  conversationsClustered: number;
  itemsFiltered: number;
  confidence: string;
  lastScanAt: string;
  nextScanIn: string;
}

export interface MarketBrief {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  marketRead: MarketRead;
  commercialImplications: CommercialImplications;
  recommendedNextMoves: RecommendedAction[];
  conversations: MarketConversation[];
  scanStats: MarketBriefScanStats;
  isDemo: boolean;
  createdAt: string;
}

// ─── Read helpers ──────────────────────────────────────────────────────────

function emptyMarketRead(): MarketRead {
  return {
    tldr: { headline: '', whyItMatters: '', signals: [] },
    analystRead: '',
    researchBriefing: {
      analystThesis: '',
      whatChanged: '',
      whatMarketIsSaying: '',
      whatIsMissing: '',
      sourcePattern: '',
      whyItMatters: '',
      sourceEvidence: [],
      confidence: '',
      limitations: '',
    },
  };
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/** Fetch the most recent Market Brief for a company. Returns null if none exists. */
export async function getLatestMarketBrief(companyId: string): Promise<MarketBrief | null> {
  await getDb();
  const r = await sql`
    SELECT * FROM market_briefs
    WHERE company_id = ${companyId}
    ORDER BY period_end DESC, created_at DESC
    LIMIT 1
  `;
  if (!r.rows.length) return null;
  const row = r.rows[0];
  const includedIds = parseJson<string[]>(row.included_conversation_ids, []);
  const conversations: MarketConversation[] = [];
  for (const id of includedIds) {
    const c = await getConversation(id, companyId, { withItems: false });
    if (c) conversations.push(c);
  }
  const actions = await listActionsForBrief(String(row.id));
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    periodStart: row.period_start ? new Date(row.period_start as string).toISOString() : '',
    periodEnd: row.period_end ? new Date(row.period_end as string).toISOString() : '',
    marketRead: parseJson(row.market_read, emptyMarketRead()),
    commercialImplications: parseJson(row.commercial_implications, {
      positioning: '', sales: '', content: '', pipeline: '',
    } as CommercialImplications),
    recommendedNextMoves: actions,
    conversations,
    scanStats: parseJson(row.scan_stats, {
      sourcesScanned: 0, itemsReviewed: 0, conversationsClustered: 0,
      itemsFiltered: 0, confidence: 'moderate', lastScanAt: '', nextScanIn: '',
    } as MarketBriefScanStats),
    isDemo: Boolean(row.is_demo),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// ─── Generation ────────────────────────────────────────────────────────────

interface SynthesisInput {
  profile: CompanyProfile;
  conversations: MarketConversation[];
}

interface SynthesisOutput {
  marketRead: MarketRead;
  commercialImplications: CommercialImplications;
  nextMoves: {
    title: string;
    description: string;
    category: ActionCategory;
    priority: ActionPriority;
    urgency: ActionUrgency;
    conversationId?: string;
    rank: number;
  }[];
}

async function synthesiseWithClaude(input: SynthesisInput): Promise<SynthesisOutput | null> {
  if (!anthropic) return null;
  if (input.conversations.length === 0) return null;

  const profileContext = input.profile.coreNarrative
    ? `Company narrative: ${input.profile.coreNarrative.slice(0, 600)}`
    : '';
  const positioning = [
    input.profile.oneLineDescription && `Elevator pitch: ${input.profile.oneLineDescription}`,
    input.profile.differentiation.length && `Differentiation: ${input.profile.differentiation.slice(0, 3).join('; ')}`,
    input.profile.commercialHooks.length && `Commercial hooks: ${input.profile.commercialHooks.slice(0, 3).join('; ')}`,
    input.profile.buyerPersonas.length && `Buyers: ${input.profile.buyerPersonas.slice(0, 3).join('; ')}`,
  ].filter(Boolean).join('\n');

  const convsBlock = input.conversations.map((c, i) => {
    const score = c.score;
    const interp = c.interpretation;
    const scoreLine = score
      ? `Relevance ${score.companyRelevance.value}/10 (${score.companyRelevance.label}), Momentum ${score.momentum.value}/10, Saturation ${score.saturation.value}/10`
      : '';
    const impl = interp?.commercialImplications.slice(0, 2).join(' | ') || '';
    return `[${i + 1}] ${c.title}
   ${scoreLine}
   What changed: ${interp?.whatChanged || ''}
   Why this matters: ${interp?.whyThisMatters || ''}
   Implications: ${impl}
   Next move: ${interp?.recommendedNextMove || ''}`;
  }).join('\n\n');

  const systemPrompt = `You are a senior strategy consultant writing the weekly Market Brief for an insurtech company. You synthesise N pre-analysed market conversations into one coherent operating brief that drives the company's week.

The brief has these sections:
1. Market Read with three depth modes:
   - TL;DR: one headline + one why-it-matters + 3-5 short signal bullets
   - Analyst Read: 2-3 sentences of prose synthesis (the analyst's POV)
   - Research Briefing: full structured analysis with thesis, what-changed, what-market-is-saying, what-is-missing, source pattern, source evidence, confidence assessment, and limitations

2. Commercial Implications across four lanes:
   - Positioning (what to emphasise / clarify in narrative)
   - Sales (specific sales conversation hooks)
   - Content (founder content / PR angles to lead with)
   - Pipeline (deals / accounts to revisit; concrete moves)

3. Recommended Next Moves (3-7 actions, each tied back to a specific conversation by index)

Be concrete and concise. Reference specific conversation indices. Avoid generic startup advice — every recommendation should be defensible based on the conversations shown.`;

  const userPrompt = `${positioning}
${profileContext}

This week's tracked conversations (already scored and interpreted):

${convsBlock}

Synthesise the Market Brief now. Return ONLY valid JSON (no markdown, no code fences):
{
  "marketRead": {
    "tldr": {
      "headline": "punchy headline summarising the week's theme",
      "whyItMatters": "1-2 sentences on why these conversations matter together",
      "signals": ["short signal bullet", "short signal bullet", "..."]
    },
    "analystRead": "2-3 sentences in prose — the analyst's synthesis",
    "researchBriefing": {
      "analystThesis": "1-2 sentences on the overall thesis",
      "whatChanged": "what's new this week",
      "whatMarketIsSaying": "dominant takes across sources",
      "whatIsMissing": "what nobody is saying that you'd expect",
      "sourcePattern": "1 sentence on the pattern across sources",
      "whyItMatters": "specifically to this company",
      "sourceEvidence": [
        { "source": "Source Name", "signal": "1-line signal", "type": "trade press|regulator|broker|other" }
      ],
      "confidence": "high|moderate|low — with one reason",
      "limitations": "1-2 sentences on what the brief cannot answer"
    }
  },
  "commercialImplications": {
    "positioning": "specific positioning move",
    "sales": "specific sales hook for this week",
    "content": "specific content / PR angle",
    "pipeline": "specific pipeline move"
  },
  "nextMoves": [
    {
      "title": "imperative title (e.g. 'Brief brokers on Q1 Lloyd's data quality findings')",
      "description": "1-2 sentences with context",
      "category": "sales|outbound|founder_content|website|pr|campaign|podcast_webinar|monitor",
      "priority": "low|medium|high|critical",
      "urgency": "now|this-week|monitor",
      "conversationIndex": <1-based index from the list above, or null>,
      "rank": 1
    }
  ]
}`;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    void logClaudeUsage(resp, { route: 'market-brief.generate', companyId: input.profile.companyId });
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '{}';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const marketRead: MarketRead = {
      tldr: {
        headline: String(parsed?.marketRead?.tldr?.headline || '').slice(0, 200),
        whyItMatters: String(parsed?.marketRead?.tldr?.whyItMatters || '').slice(0, 600),
        signals: Array.isArray(parsed?.marketRead?.tldr?.signals)
          ? parsed.marketRead.tldr.signals.map(String).slice(0, 6)
          : [],
      },
      analystRead: String(parsed?.marketRead?.analystRead || '').slice(0, 1500),
      researchBriefing: {
        analystThesis: String(parsed?.marketRead?.researchBriefing?.analystThesis || '').slice(0, 800),
        whatChanged: String(parsed?.marketRead?.researchBriefing?.whatChanged || '').slice(0, 800),
        whatMarketIsSaying: String(parsed?.marketRead?.researchBriefing?.whatMarketIsSaying || '').slice(0, 800),
        whatIsMissing: String(parsed?.marketRead?.researchBriefing?.whatIsMissing || '').slice(0, 800),
        sourcePattern: String(parsed?.marketRead?.researchBriefing?.sourcePattern || '').slice(0, 400),
        whyItMatters: String(parsed?.marketRead?.researchBriefing?.whyItMatters || '').slice(0, 800),
        sourceEvidence: Array.isArray(parsed?.marketRead?.researchBriefing?.sourceEvidence)
          ? parsed.marketRead.researchBriefing.sourceEvidence.slice(0, 10).map((e: any) => ({
              source: String(e?.source || '').slice(0, 100),
              signal: String(e?.signal || '').slice(0, 300),
              type: String(e?.type || '').slice(0, 50),
            }))
          : [],
        confidence: String(parsed?.marketRead?.researchBriefing?.confidence || '').slice(0, 200),
        limitations: String(parsed?.marketRead?.researchBriefing?.limitations || '').slice(0, 400),
      },
    };

    const commercialImplications: CommercialImplications = {
      positioning: String(parsed?.commercialImplications?.positioning || '').slice(0, 800),
      sales: String(parsed?.commercialImplications?.sales || '').slice(0, 800),
      content: String(parsed?.commercialImplications?.content || '').slice(0, 800),
      pipeline: String(parsed?.commercialImplications?.pipeline || '').slice(0, 800),
    };

    const validCategories: ActionCategory[] = ['sales', 'outbound', 'founder_content', 'website', 'pr', 'campaign', 'podcast_webinar', 'monitor'];
    const validPriorities: ActionPriority[] = ['low', 'medium', 'high', 'critical'];
    const validUrgencies: ActionUrgency[] = ['now', 'this-week', 'monitor'];

    const nextMoves = Array.isArray(parsed?.nextMoves)
      ? parsed.nextMoves.slice(0, 8).map((m: any, idx: number) => {
          const convIdx = typeof m?.conversationIndex === 'number'
            ? m.conversationIndex - 1
            : -1;
          const linkedConvId = convIdx >= 0 && convIdx < input.conversations.length
            ? input.conversations[convIdx].id
            : undefined;
          return {
            title: String(m?.title || '').slice(0, 200),
            description: String(m?.description || '').slice(0, 800),
            category: validCategories.includes(m?.category) ? m.category : 'monitor',
            priority: validPriorities.includes(m?.priority) ? m.priority : 'medium',
            urgency: validUrgencies.includes(m?.urgency) ? m.urgency : 'this-week',
            conversationId: linkedConvId,
            rank: typeof m?.rank === 'number' ? m.rank : idx + 1,
          };
        }).filter((m: { title: string }) => m.title.length > 0)
      : [];

    return { marketRead, commercialImplications, nextMoves };
  } catch (err) {
    console.error('[market-brief] Synthesis failed:', err);
    void reportClaudeError(err, 'market-brief.synthesise');
    return null;
  }
}

/**
 * Compute Monday-of-this-week and Sunday for the action window display.
 */
function currentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dow = now.getUTCDay();
  const daysToMonday = (dow + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

/**
 * Build and persist a fresh Market Brief for a company. Selects the top
 * conversations by company_relevance (with viewStatus in
 * {included_in_brief, action_recommended}), synthesises them via Claude, and
 * writes a market_briefs row plus the linked recommended_actions.
 */
export async function generateMarketBrief(companyId: string): Promise<MarketBrief | null> {
  await getDb();

  const profile = await getCompanyProfile(companyId);
  if (!profile) return null;

  // Pick the conversations to include — top 5-8 by company_relevance, filtered
  // to those flagged as actionable or brief-worthy by the interpreter.
  const candidatesResult = await sql`
    SELECT mc.id
    FROM market_conversations mc
    LEFT JOIN conversation_scores cs ON cs.conversation_id = mc.id
    WHERE mc.company_id = ${companyId}
      AND mc.archived = false
      AND mc.view_status IN ('included_in_brief', 'action_recommended')
      AND mc.latest_coverage_at >= NOW() - INTERVAL '14 days'
    ORDER BY cs.company_relevance_value DESC NULLS LAST, mc.latest_coverage_at DESC
    LIMIT 8
  `;
  const includedIds = candidatesResult.rows.map(r => String(r.id));
  const conversations: MarketConversation[] = [];
  for (const id of includedIds) {
    const c = await getConversation(id, companyId, { withItems: false });
    if (c) conversations.push(c);
  }
  if (conversations.length === 0) {
    // Nothing to brief on — skip. The cron will retry next week.
    return null;
  }

  const synthesis = await synthesiseWithClaude({ profile, conversations });
  if (!synthesis) return null;

  // Compute scan stats from the most recent cron run for this company. For
  // Phase A we use simple counts; richer stats come once Job tracking lands.
  const scanStatsResult = await sql`
    SELECT
      COUNT(DISTINCT sa.id) AS items_reviewed,
      COUNT(DISTINCT na.source) AS sources_scanned
    FROM signal_analyses sa
    JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
      AND sa.created_at >= NOW() - INTERVAL '7 days'
  `;
  const reviewedCount = Number(scanStatsResult.rows[0]?.items_reviewed || 0);
  const sourceCount = Number(scanStatsResult.rows[0]?.sources_scanned || 0);
  const filteredCount = Math.max(0, reviewedCount - conversations.reduce((sum, c) => sum + (c.evidenceSummary?.itemCount || 0), 0));
  const scanStats: MarketBriefScanStats = {
    sourcesScanned: sourceCount,
    itemsReviewed: reviewedCount,
    conversationsClustered: conversations.length,
    itemsFiltered: filteredCount,
    confidence: synthesis.marketRead.researchBriefing.confidence || 'moderate',
    lastScanAt: new Date().toISOString(),
    nextScanIn: '7 days',
  };

  const { start: periodStart, end: periodEnd } = currentWeekRange();
  const briefId = uuidv4();

  await sql`
    INSERT INTO market_briefs (
      id, company_id, period_start, period_end,
      market_read, commercial_implications, recommended_next_moves,
      included_conversation_ids, scan_stats, is_demo
    ) VALUES (
      ${briefId}, ${companyId},
      ${periodStart.toISOString().slice(0, 10)},
      ${periodEnd.toISOString().slice(0, 10)},
      ${JSON.stringify(synthesis.marketRead)},
      ${JSON.stringify(synthesis.commercialImplications)},
      ${JSON.stringify(synthesis.nextMoves.map(m => ({ title: m.title, urgency: m.urgency, rank: m.rank })))},
      ${JSON.stringify(includedIds)},
      ${JSON.stringify(scanStats)},
      false
    )
    ON CONFLICT (company_id, period_start, period_end) DO UPDATE SET
      market_read = EXCLUDED.market_read,
      commercial_implications = EXCLUDED.commercial_implications,
      recommended_next_moves = EXCLUDED.recommended_next_moves,
      included_conversation_ids = EXCLUDED.included_conversation_ids,
      scan_stats = EXCLUDED.scan_stats
  `;

  // Persist the synthesised actions as recommended_actions rows.
  const actions: RecommendedAction[] = [];
  for (const move of synthesis.nextMoves) {
    const action = await createAction({
      companyId,
      marketBriefId: briefId,
      conversationId: move.conversationId,
      title: move.title,
      description: move.description,
      category: move.category,
      priority: move.priority,
      urgency: move.urgency,
      rank: move.rank,
      createdFrom: 'weekly_market_brief',
    });
    actions.push(action);
  }

  return {
    id: briefId,
    companyId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    marketRead: synthesis.marketRead,
    commercialImplications: synthesis.commercialImplications,
    recommendedNextMoves: actions,
    conversations,
    scanStats,
    isDemo: false,
    createdAt: new Date().toISOString(),
  };
}
