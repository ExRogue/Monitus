import Anthropic from '@anthropic-ai/sdk';
import { NewsArticle } from './news';

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
  // New fields
  strongest_stakeholder: string;
  secondary_stakeholder: string;
  reasoning: string;
  created_at?: string;
}

function safeParseJson(value: string | undefined | null, fallback: unknown[] = []): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildNarrativeContext(bible: MessagingBible): string {
  // messaging_pillars may be stored as markdown text (from quick-start) or JSON array
  let pillarsText = '';
  if (bible.messaging_pillars && typeof bible.messaging_pillars === 'string' && bible.messaging_pillars.trim()) {
    const trimmed = bible.messaging_pillars.trim();
    if (trimmed.startsWith('[')) {
      // Looks like JSON array
      const parsed = safeParseJson(trimmed, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        pillarsText = JSON.stringify(parsed);
      }
    } else {
      // Plain text / markdown — use as-is
      pillarsText = trimmed;
    }
  }
  const icpProfiles = safeParseJson(bible.icp_profiles, []);
  const competitors = safeParseJson(bible.competitors, []);
  const audiences = safeParseJson(bible.target_audiences, []);
  const differentiators = safeParseJson(bible.differentiators, []);

  const parts: string[] = [];

  if (bible.elevator_pitch) {
    parts.push(`Elevator pitch: ${bible.elevator_pitch}`);
  }
  if (bible.company_description) {
    parts.push(`Company description: ${bible.company_description}`);
  }
  if (pillarsText) {
    parts.push(`Messaging pillars: ${pillarsText}`);
  }
  if (Array.isArray(icpProfiles) && icpProfiles.length > 0) {
    parts.push(`Target buyer profiles (ICP): ${JSON.stringify(icpProfiles)}`);
  }
  if (Array.isArray(audiences) && audiences.length > 0) {
    parts.push(`Target audiences: ${JSON.stringify(audiences)}`);
  }
  if (Array.isArray(competitors) && competitors.length > 0) {
    parts.push(`Competitors: ${JSON.stringify(competitors)}`);
  }
  if (Array.isArray(differentiators) && differentiators.length > 0) {
    parts.push(`Differentiators: ${JSON.stringify(differentiators)}`);
  }

  // Include stakeholder matrix if available
  if (bible.stakeholder_matrix) {
    const stakeholders = safeParseJson(bible.stakeholder_matrix, []);
    if (Array.isArray(stakeholders) && stakeholders.length > 0) {
      parts.push(`Stakeholder matrix (key decision-makers and their priorities): ${JSON.stringify(stakeholders)}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Compute the weighted usefulness score from the 8 dimensions.
 * Each dimension is 1-10. Weights sum to 1.0.
 */
function computeUsefulnessScore(dims: {
  narrative_fit: number;
  icp_fit: number;
  stakeholder_fit_score: number;
  right_to_say: number;
  strategic_significance: number;
  timeliness: number;
  competitor_relevance: number;
  actionability: number;
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
  return Math.round(score * 10) / 10; // one decimal place
}

/**
 * Determine recommended action from usefulness score.
 * 8-10: act_now, 6-7.9: monitor, below 6: ignore
 */
function deriveRecommendedAction(usefulnessScore: number): 'act_now' | 'monitor' | 'ignore' {
  if (usefulnessScore >= 8) return 'act_now';
  if (usefulnessScore >= 6) return 'monitor';
  return 'ignore';
}

function clampDimension(value: unknown, min = 1, max = 10): number {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 1)));
}

export async function analyzeSignalRelevance(
  article: NewsArticle,
  bible: MessagingBible
): Promise<SignalAnalysis> {
  if (!anthropic) {
    // Fallback when no API key -- return a neutral analysis
    return {
      company_id: bible.company_id,
      article_id: article.id,
      narrative_fit: 1,
      icp_fit: 1,
      stakeholder_fit_score: 1,
      right_to_say: 1,
      strategic_significance: 1,
      timeliness: 1,
      competitor_relevance: 1,
      actionability: 1,
      usefulness_score: 1,
      urgency: 0,
      why_it_matters: '',
      why_it_matters_to_buyers: '',
      recommended_action: 'ignore',
      competitor_context: '',
      themes: [],
      strongest_stakeholder: '',
      secondary_stakeholder: '',
      reasoning: '',
    };
  }

  const narrativeContext = buildNarrativeContext(bible);

  const prompt = `You are a senior market intelligence analyst for an insurtech/insurance company. Score this article on 8 dimensions to determine its usefulness to the company.

COMPANY CONTEXT:
${narrativeContext}

ARTICLE:
Title: ${article.title}
Summary: ${article.summary || ''}
Source: ${article.source || ''}
Category: ${article.category || ''}

Return ONLY valid JSON (no markdown, no code fences) with exactly these fields. Each dimension is an integer 1-10:

- narrative_fit (1-10): Does this map to one of the company's real narrative pillars? 1 = no connection, 10 = perfect alignment with a specific pillar
- icp_fit (1-10): Does this matter to a target ICP/buyer persona? 1 = irrelevant to all buyers, 10 = directly impacts a named ICP's decision-making
- stakeholder_fit (1-10): How strongly does this matter to a specific stakeholder/department inside the buyer organisation? 1 = nobody cares, 10 = a named stakeholder's top priority
- right_to_say (1-10): Does this company have credibility, expertise, or data to comment on this topic? 1 = no authority, 10 = undeniable subject-matter authority
- strategic_significance (1-10): How materially important is the underlying development? 1 = trivial, 10 = market-shaping event
- timeliness (1-10): How time-sensitive is this? 1 = evergreen/stale, 10 = breaking news requiring immediate response
- competitor_relevance (1-10): Are competitors visibly active on this topic? 1 = nobody else commenting, 10 = competitors are leading the conversation
- actionability (1-10): Can this become a useful output (post, briefing, pitch)? 1 = no clear output, 10 = ready-made content opportunity

Also return:
- why_it_matters (string): 1-2 sentences on why this matters for the market. Be specific, not generic.
- why_it_matters_to_buyers (string): 1-2 sentences on why the company's target buyers care about this. Reference specific buyer types from the ICP if possible.
- competitor_context (string): Any competitive implications. Empty string if none.
- themes (array of strings): 2-5 theme tags (e.g. "cyber risk", "regulation", "Lloyd's market", "AI underwriting")
- strongest_stakeholder (string): The primary stakeholder/role who cares most (e.g. "CTO / CIO", "Head of Underwriting", "Chief Risk Officer")
- secondary_stakeholder (string): A secondary stakeholder who would also care
- reasoning (string): 2-3 sentences explaining WHY this article scored as it did across the dimensions. Be concrete.

Be honest in scoring. Most articles will average 3-5 across dimensions. Only exceptional articles should average above 7.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Parse JSON, stripping any markdown fences
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const dims = {
      narrative_fit: clampDimension(parsed.narrative_fit),
      icp_fit: clampDimension(parsed.icp_fit),
      stakeholder_fit_score: clampDimension(parsed.stakeholder_fit),
      right_to_say: clampDimension(parsed.right_to_say),
      strategic_significance: clampDimension(parsed.strategic_significance),
      timeliness: clampDimension(parsed.timeliness),
      competitor_relevance: clampDimension(parsed.competitor_relevance),
      actionability: clampDimension(parsed.actionability),
    };

    const usefulnessScore = computeUsefulnessScore(dims);
    const recommendedAction = deriveRecommendedAction(usefulnessScore);

    // Map timeliness to legacy urgency field (1-10 → 0-100 scale)
    const urgency = Math.round(dims.timeliness * 10);

    return {
      company_id: bible.company_id,
      article_id: article.id,
      ...dims,
      usefulness_score: usefulnessScore,
      urgency,
      why_it_matters: String(parsed.why_it_matters || ''),
      why_it_matters_to_buyers: String(parsed.why_it_matters_to_buyers || ''),
      recommended_action: recommendedAction,
      competitor_context: String(parsed.competitor_context || ''),
      themes: Array.isArray(parsed.themes) ? parsed.themes.map(String) : [],
      strongest_stakeholder: String(parsed.strongest_stakeholder || ''),
      secondary_stakeholder: String(parsed.secondary_stakeholder || ''),
      reasoning: String(parsed.reasoning || ''),
    };
  } catch (error) {
    console.error(`[signals] Failed to analyze article ${article.id}:`, error);
    return {
      company_id: bible.company_id,
      article_id: article.id,
      narrative_fit: 1,
      icp_fit: 1,
      stakeholder_fit_score: 1,
      right_to_say: 1,
      strategic_significance: 1,
      timeliness: 1,
      competitor_relevance: 1,
      actionability: 1,
      usefulness_score: 1,
      urgency: 0,
      why_it_matters: '',
      why_it_matters_to_buyers: '',
      recommended_action: 'ignore',
      competitor_context: '',
      themes: [],
      strongest_stakeholder: '',
      secondary_stakeholder: '',
      reasoning: '',
    };
  }
}

export async function analyzeBatch(
  articles: NewsArticle[],
  bible: MessagingBible,
  maxConcurrent: number = 5
): Promise<SignalAnalysis[]> {
  // Process in sequential rounds of maxConcurrent to avoid rate limits
  const allResults: SignalAnalysis[] = [];

  for (let i = 0; i < articles.length; i += maxConcurrent) {
    const batch = articles.slice(i, i + maxConcurrent);
    const results = await Promise.allSettled(
      batch.map(article => analyzeSignalRelevance(article, bible))
    );

    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<SignalAnalysis> => r.status === 'fulfilled')
      .map(r => r.value);

    allResults.push(...fulfilled);
  }

  return allResults;
}
