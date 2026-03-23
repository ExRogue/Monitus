import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { MessagingBible } from '@/lib/signals';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface StrategyRecommendation {
  source_development: string;
  summary: string;
  why_it_matters: string;
  why_now: string;
  narrative_alignment: string;
  competitor_context: string;
  buyer_relevance: string;
  strongest_stakeholder: string;
  secondary_stakeholder: string;
  recommended_angle: string;
  recommended_proof_type: string;
  recommended_format: string;
  urgency_score: number;
  opportunity_score: number;
  stage: string;
}

export interface GeneratedOpportunity {
  type: 'Signal-Led' | 'Theme-Led' | 'Rival-Led';
  title: string;
  summary: string;
  recommended_angle: string;
  recommended_format: 'LinkedIn Post' | 'Email Commentary' | 'Trade Media Pitch' | 'Briefing Snippet';
  urgency_score: number;
  opportunity_score: number;
  narrative_alignment: string;
  buyer_relevance: string;
  competitor_context: string;
  source_signal_id: string;
  source_article_title: string;
  // Strategy Partner recommendation fields
  why_now: string;
  strongest_stakeholder: string;
  secondary_stakeholder: string;
  recommended_proof_type: string;
  core_argument: string;
  stage: string;
  source_development: string;
}

interface SignalWithArticle {
  id: string;
  company_id: string;
  article_id: string;
  narrative_fit: number;
  urgency: number;
  usefulness_score: number;
  why_it_matters: string;
  why_it_matters_to_buyers: string;
  recommended_action: string;
  competitor_context: string;
  themes: string;
  strongest_stakeholder: string;
  secondary_stakeholder: string;
  reasoning: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  category: string;
}

function buildNarrativeContext(bible: MessagingBible): string {
  const parts: string[] = [];
  if (bible.elevator_pitch) parts.push(`Elevator pitch: ${bible.elevator_pitch}`);
  if (bible.company_description) parts.push(`Company description: ${bible.company_description}`);
  if (bible.messaging_pillars) {
    try {
      const pillars = JSON.parse(bible.messaging_pillars);
      if (Array.isArray(pillars) && pillars.length > 0)
        parts.push(`Messaging pillars: ${JSON.stringify(pillars)}`);
    } catch {}
  }
  if (bible.icp_profiles) {
    try {
      const icps = JSON.parse(bible.icp_profiles);
      if (Array.isArray(icps) && icps.length > 0)
        parts.push(`Target buyer profiles: ${JSON.stringify(icps)}`);
    } catch {}
  }
  if (bible.competitors) {
    try {
      const competitors = JSON.parse(bible.competitors);
      if (Array.isArray(competitors) && competitors.length > 0)
        parts.push(`Competitors: ${JSON.stringify(competitors)}`);
    } catch {}
  }
  if (bible.differentiators) {
    try {
      const diffs = JSON.parse(bible.differentiators);
      if (Array.isArray(diffs) && diffs.length > 0)
        parts.push(`Differentiators: ${JSON.stringify(diffs)}`);
    } catch {}
  }
  return parts.join('\n\n');
}

/**
 * Generate content opportunities from a single analyzed signal.
 */
async function generateOpportunityFromSignal(
  signal: SignalWithArticle,
  bible: MessagingBible,
): Promise<GeneratedOpportunity | null> {
  if (!anthropic) return null;

  const narrativeContext = buildNarrativeContext(bible);

  const prompt = `You are a Strategy Partner — a senior B2B content strategist for an insurance/insurtech company. Your job is to create a COMPLETE strategy recommendation object BEFORE any content is drafted.

COMPANY CONTEXT:
${narrativeContext}

MARKET SIGNAL:
Title: ${signal.title}
Summary: ${signal.summary || ''}
Source: ${signal.source || ''}
Category: ${signal.category || ''}
Signal usefulness score: ${signal.usefulness_score || 'N/A'}/10
Signal narrative fit: ${signal.narrative_fit}
Why it matters: ${signal.why_it_matters}
Why it matters to buyers: ${signal.why_it_matters_to_buyers}
Competitor context: ${signal.competitor_context}
Strongest stakeholder: ${signal.strongest_stakeholder || 'Unknown'}
Secondary stakeholder: ${signal.secondary_stakeholder || 'Unknown'}
Signal reasoning: ${signal.reasoning || ''}

Based on this signal and the company's narrative, create ONE complete strategy recommendation. This is NOT content — it is the strategic brief that will later drive content production.

Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:
- type (string, one of: "Signal-Led", "Theme-Led", "Rival-Led"):
  - Signal-Led: Directly responds to the news/event
  - Theme-Led: Connects to a broader theme the signal is part of
  - Rival-Led: Exploits a competitor gap or narrative whitespace
- title (string): A compelling, specific title for this content opportunity (max 120 chars)
- source_development (string): 1-2 sentences on what happened — the underlying event/news
- summary (string): 2-3 sentences describing the opportunity and what content to create
- why_it_matters (string): 1-2 sentences on why this matters to THIS company specifically
- why_now (string): 1-2 sentences on why timing matters — what makes this urgent or time-sensitive
- narrative_alignment (string): Which messaging pillar this aligns with, and how
- competitor_context (string): What competitors are/aren't saying, and the whitespace this creates
- buyer_relevance (string): Which buyer personas care and why. Reference specific ICP profiles if available.
- strongest_stakeholder (string): The primary audience role (e.g. "CTO / CIO", "Head of Underwriting")
- secondary_stakeholder (string): The secondary audience role
- recommended_angle (string): The core argument — the specific point of view to take. Be concrete, not generic.
- recommended_proof_type (string, one of: "Data/Statistics", "Case Study", "Expert Opinion", "Regulatory Reference", "Market Comparison", "Client Testimonial"): What type of evidence strengthens this angle
- recommended_format (string, one of: "LinkedIn Post", "Email Commentary", "Trade Media Pitch", "Briefing Snippet"): Best format for this opportunity
- urgency_score (integer 1-10): How time-sensitive is this opportunity?
- opportunity_score (integer 1-10): Overall quality considering narrative fit, buyer interest, and competitive whitespace.
- stage (string, one of: "Monitor", "Analyse", "Draft", "Review", "Ready"): Recommended workflow stage

Be specific and strategic. Generic advice like "position as a thought leader" is not helpful. Reference the actual signal, actual buyer types, and actual competitive dynamics.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validFormats = ['LinkedIn Post', 'Email Commentary', 'Trade Media Pitch', 'Briefing Snippet'];
    const validTypes = ['Signal-Led', 'Theme-Led', 'Rival-Led'];
    const validStages = ['Monitor', 'Analyse', 'Draft', 'Review', 'Ready'];
    const validProofTypes = ['Data/Statistics', 'Case Study', 'Expert Opinion', 'Regulatory Reference', 'Market Comparison', 'Client Testimonial'];

    return {
      type: validTypes.includes(parsed.type) ? parsed.type : 'Signal-Led',
      title: String(parsed.title || '').slice(0, 200),
      summary: String(parsed.summary || ''),
      recommended_angle: String(parsed.recommended_angle || ''),
      recommended_format: validFormats.includes(parsed.recommended_format)
        ? parsed.recommended_format
        : 'LinkedIn Post',
      urgency_score: Math.max(1, Math.min(10, Math.round(Number(parsed.urgency_score) || 5))),
      opportunity_score: Math.max(1, Math.min(10, Math.round(Number(parsed.opportunity_score) || 5))),
      narrative_alignment: String(parsed.narrative_alignment || ''),
      buyer_relevance: String(parsed.buyer_relevance || ''),
      competitor_context: String(parsed.competitor_context || ''),
      source_signal_id: signal.id,
      source_article_title: signal.title,
      // Strategy Partner fields
      why_now: String(parsed.why_now || ''),
      strongest_stakeholder: String(parsed.strongest_stakeholder || ''),
      secondary_stakeholder: String(parsed.secondary_stakeholder || ''),
      recommended_proof_type: validProofTypes.includes(parsed.recommended_proof_type)
        ? parsed.recommended_proof_type
        : String(parsed.recommended_proof_type || 'Expert Opinion'),
      core_argument: String(parsed.recommended_angle || ''),
      stage: validStages.includes(parsed.stage) ? parsed.stage : 'Analyse',
      source_development: String(parsed.source_development || ''),
    };
  } catch (error) {
    console.error(`[opportunities] Failed to generate opportunity for signal ${signal.id}:`, error);
    return null;
  }
}

/**
 * Get top signals that don't already have opportunities generated,
 * generate opportunities from them, and store in DB.
 * Returns both newly generated and existing opportunities.
 */
export async function generateOpportunitiesFromSignals(
  companyId: string,
  maxToGenerate: number = 5,
): Promise<{ generated: number; total: number }> {
  await getDb();

  // Get the messaging bible
  const bibleResult = await sql`
    SELECT * FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
  `;
  if (!bibleResult.rows.length) {
    return { generated: 0, total: 0 };
  }
  const bible = bibleResult.rows[0] as unknown as MessagingBible;

  // Find top signals that DON'T already have opportunities.
  // Prefer usefulness_score >= 6 (enhanced scoring) but fall back to narrative_fit > 40 (legacy scoring).
  const topSignals = await sql`
    SELECT sa.*, na.title, na.summary, na.source, na.source_url, na.category
    FROM signal_analyses sa
    JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    AND (
      (sa.usefulness_score IS NOT NULL AND sa.usefulness_score >= 6)
      OR (sa.usefulness_score IS NULL AND sa.narrative_fit > 40)
    )
    AND NOT EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.company_id = ${companyId}
      AND o.source_signal_ids LIKE '%' || sa.id || '%'
    )
    ORDER BY COALESCE(sa.usefulness_score, sa.narrative_fit / 10.0) DESC
    LIMIT ${maxToGenerate}
  `;

  if (topSignals.rows.length === 0) {
    // Count existing opportunities
    const countResult = await sql`
      SELECT COUNT(*) as count FROM opportunities WHERE company_id = ${companyId} AND dismissed = false
    `;
    return { generated: 0, total: parseInt(countResult.rows[0]?.count as string || '0') };
  }

  const signals = topSignals.rows as unknown as SignalWithArticle[];

  // Generate opportunities in parallel (limited to maxToGenerate)
  const results = await Promise.allSettled(
    signals.map(signal => generateOpportunityFromSignal(signal, bible))
  );

  let generatedCount = 0;

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const opp = result.value;

    const id = uuidv4();
    try {
      await sql`
        INSERT INTO opportunities (
          id, company_id, type, title, summary,
          source_signal_ids, why_it_matters, why_it_matters_to_buyers,
          competitor_context, buyer_relevance, recommended_angle, recommended_format,
          urgency_score, opportunity_score, narrative_pillar, stage,
          why_now, recommended_proof_type, strongest_stakeholder, secondary_stakeholder, core_argument
        ) VALUES (
          ${id}, ${companyId}, ${opp.type}, ${opp.title}, ${opp.summary},
          ${JSON.stringify([opp.source_signal_id])}, ${opp.narrative_alignment}, ${opp.buyer_relevance},
          ${opp.competitor_context}, ${opp.buyer_relevance}, ${opp.recommended_angle}, ${opp.recommended_format},
          ${opp.urgency_score}, ${opp.opportunity_score}, ${opp.narrative_alignment}, ${opp.stage.toLowerCase()},
          ${opp.why_now}, ${opp.recommended_proof_type}, ${opp.strongest_stakeholder}, ${opp.secondary_stakeholder}, ${opp.core_argument}
        )
      `;
      generatedCount++;
    } catch (err) {
      console.error(`[opportunities] Failed to store opportunity:`, err);
    }
  }

  const countResult = await sql`
    SELECT COUNT(*) as count FROM opportunities WHERE company_id = ${companyId} AND dismissed = false
  `;

  return {
    generated: generatedCount,
    total: parseInt(countResult.rows[0]?.count as string || '0'),
  };
}
