import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { MessagingBible } from '@/lib/signals';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

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
}

interface SignalWithArticle {
  id: string;
  company_id: string;
  article_id: string;
  narrative_fit: number;
  urgency: number;
  why_it_matters: string;
  why_it_matters_to_buyers: string;
  recommended_action: string;
  competitor_context: string;
  themes: string;
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

  const prompt = `You are a B2B content strategist for an insurance/insurtech company.

COMPANY CONTEXT:
${narrativeContext}

MARKET SIGNAL:
Title: ${signal.title}
Summary: ${signal.summary || ''}
Source: ${signal.source || ''}
Category: ${signal.category || ''}
Signal analysis narrative fit: ${signal.narrative_fit}/100
Signal urgency: ${signal.urgency}/100
Why it matters: ${signal.why_it_matters}
Why it matters to buyers: ${signal.why_it_matters_to_buyers}
Competitor context: ${signal.competitor_context}

Based on this signal and the company's narrative, identify ONE content opportunity. This should be a specific, actionable content idea that leverages this market signal to position the company as a thought leader.

Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:
- type (string, one of: "Signal-Led", "Theme-Led", "Rival-Led"):
  - Signal-Led: Directly responds to the news/event
  - Theme-Led: Connects to a broader theme the signal is part of
  - Rival-Led: Exploits a competitor gap or narrative whitespace
- title (string): A compelling, specific title for this content opportunity (max 120 chars)
- summary (string): 2-3 sentences describing the opportunity and what content to create
- recommended_angle (string): 1-2 sentences on the specific angle to take. Be concrete, not generic.
- recommended_format (string, one of: "LinkedIn Post", "Email Commentary", "Trade Media Pitch", "Briefing Snippet"): Best format for this opportunity
- urgency_score (integer 0-100): How time-sensitive is this opportunity? Consider news cycle relevance.
- opportunity_score (integer 0-100): Overall quality of this opportunity considering narrative fit, buyer interest, and competitive whitespace.
- narrative_alignment (string): 1-2 sentences on how this connects to the company's messaging pillars and positioning.
- buyer_relevance (string): 1-2 sentences on which buyer personas care and why. Reference specific ICP profiles if available.
- competitor_context (string): 1-2 sentences on what competitors are/aren't saying, and the whitespace this creates.

Be specific and strategic. Generic advice like "position as a thought leader" is not helpful. Reference the actual signal, actual buyer types, and actual competitive dynamics.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validFormats = ['LinkedIn Post', 'Email Commentary', 'Trade Media Pitch', 'Briefing Snippet'];
    const validTypes = ['Signal-Led', 'Theme-Led', 'Rival-Led'];

    return {
      type: validTypes.includes(parsed.type) ? parsed.type : 'Signal-Led',
      title: String(parsed.title || '').slice(0, 200),
      summary: String(parsed.summary || ''),
      recommended_angle: String(parsed.recommended_angle || ''),
      recommended_format: validFormats.includes(parsed.recommended_format)
        ? parsed.recommended_format
        : 'LinkedIn Post',
      urgency_score: Math.max(0, Math.min(100, Math.round(Number(parsed.urgency_score) || 50))),
      opportunity_score: Math.max(0, Math.min(100, Math.round(Number(parsed.opportunity_score) || 50))),
      narrative_alignment: String(parsed.narrative_alignment || ''),
      buyer_relevance: String(parsed.buyer_relevance || ''),
      competitor_context: String(parsed.competitor_context || ''),
      source_signal_id: signal.id,
      source_article_title: signal.title,
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

  // Find top signals (narrative_fit > 40) that DON'T already have opportunities
  // We check by looking at source_signal_ids in existing opportunities
  const topSignals = await sql`
    SELECT sa.*, na.title, na.summary, na.source, na.source_url, na.category
    FROM signal_analyses sa
    JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    AND sa.narrative_fit > 40
    AND NOT EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.company_id = ${companyId}
      AND o.source_signal_ids LIKE '%' || sa.id || '%'
    )
    ORDER BY (sa.narrative_fit * sa.urgency) DESC
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
          urgency_score, opportunity_score, narrative_pillar, stage
        ) VALUES (
          ${id}, ${companyId}, ${opp.type}, ${opp.title}, ${opp.summary},
          ${JSON.stringify([opp.source_signal_id])}, ${opp.narrative_alignment}, ${opp.buyer_relevance},
          ${opp.competitor_context}, ${opp.buyer_relevance}, ${opp.recommended_angle}, ${opp.recommended_format},
          ${opp.urgency_score}, ${opp.opportunity_score}, ${opp.narrative_alignment}, ${'analyse'}
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
