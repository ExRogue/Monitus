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
}

export interface SignalAnalysis {
  id?: string;
  company_id: string;
  article_id: string;
  narrative_fit: number;
  urgency: number;
  why_it_matters: string;
  why_it_matters_to_buyers: string;
  recommended_action: 'act_now' | 'reinforce' | 'monitor' | 'ignore';
  competitor_context: string;
  themes: string[];
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
  const pillars = safeParseJson(bible.messaging_pillars, []);
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
  if (Array.isArray(pillars) && pillars.length > 0) {
    parts.push(`Messaging pillars: ${JSON.stringify(pillars)}`);
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

  return parts.join('\n\n');
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
      narrative_fit: 0,
      urgency: 0,
      why_it_matters: '',
      why_it_matters_to_buyers: '',
      recommended_action: 'ignore',
      competitor_context: '',
      themes: [],
    };
  }

  const narrativeContext = buildNarrativeContext(bible);

  const prompt = `You are a market intelligence analyst for an insurtech company.

${narrativeContext}

Analyze this article and score its relevance to the company's narrative and positioning.

Title: ${article.title}
Summary: ${article.summary || ''}
Source: ${article.source || ''}
Category: ${article.category || ''}

Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:
- narrative_fit (integer 0-100): How relevant is this to the company's positioning and narrative? 0 = completely irrelevant, 100 = perfectly aligned
- urgency (integer 0-100): How time-sensitive is this for the company to respond to? 0 = no urgency, 100 = must act immediately
- why_it_matters (string): 1-2 sentences on why this matters for the market. Be specific, not generic.
- why_it_matters_to_buyers (string): 1-2 sentences on why the company's target buyers care about this. Reference specific buyer types from the ICP if possible.
- recommended_action (string, one of: "act_now", "reinforce", "monitor", "ignore"): What should the company do?
  - act_now: narrative_fit > 70 AND urgency > 60, clear content opportunity
  - reinforce: narrative_fit > 50, supports existing messaging
  - monitor: somewhat relevant, worth tracking
  - ignore: not relevant to this company's narrative
- competitor_context (string): Any competitive implications. Empty string if none.
- themes (array of strings): 2-5 theme tags this maps to (e.g. "cyber risk", "regulation", "Lloyd's market", "AI underwriting")

Be honest in scoring. Most articles will score 20-60 on narrative_fit. Only truly aligned articles should score above 70.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Parse JSON, stripping any markdown fences
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      company_id: bible.company_id,
      article_id: article.id,
      narrative_fit: Math.max(0, Math.min(100, Math.round(Number(parsed.narrative_fit) || 0))),
      urgency: Math.max(0, Math.min(100, Math.round(Number(parsed.urgency) || 0))),
      why_it_matters: String(parsed.why_it_matters || ''),
      why_it_matters_to_buyers: String(parsed.why_it_matters_to_buyers || ''),
      recommended_action: ['act_now', 'reinforce', 'monitor', 'ignore'].includes(parsed.recommended_action)
        ? parsed.recommended_action
        : 'monitor',
      competitor_context: String(parsed.competitor_context || ''),
      themes: Array.isArray(parsed.themes) ? parsed.themes.map(String) : [],
    };
  } catch (error) {
    console.error(`[signals] Failed to analyze article ${article.id}:`, error);
    return {
      company_id: bible.company_id,
      article_id: article.id,
      narrative_fit: 0,
      urgency: 0,
      why_it_matters: '',
      why_it_matters_to_buyers: '',
      recommended_action: 'monitor',
      competitor_context: '',
      themes: [],
    };
  }
}

export async function analyzeBatch(
  articles: NewsArticle[],
  bible: MessagingBible,
  maxConcurrent: number = 5
): Promise<SignalAnalysis[]> {
  // Analyze up to maxConcurrent articles in parallel
  const batch = articles.slice(0, maxConcurrent);
  const results = await Promise.allSettled(
    batch.map(article => analyzeSignalRelevance(article, bible))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SignalAnalysis> => r.status === 'fulfilled')
    .map(r => r.value);
}
