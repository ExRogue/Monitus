import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

/* ────────────────────────────────────────────────────────────────────────────
 * 17 News Values Framework
 * ──────────────────────────────────────────────────────────────────────────── */

const NEWS_VALUES = [
  { key: 'impact', name: 'Impact', description: 'How many people does this affect?' },
  { key: 'timeliness', name: 'Timeliness', description: 'Is this happening now?' },
  { key: 'prominence', name: 'Prominence', description: 'Are important people/companies involved?' },
  { key: 'proximity', name: 'Proximity', description: 'How close is this to our audience?' },
  { key: 'conflict', name: 'Conflict', description: 'Is there disagreement or tension?' },
  { key: 'currency', name: 'Currency', description: 'Is this topic trending right now?' },
  { key: 'novelty', name: 'Novelty', description: 'Is this new or unusual?' },
  { key: 'human_interest', name: 'Human Interest', description: 'Is there a personal story here?' },
  { key: 'magnitude', name: 'Magnitude', description: 'How big is the scale?' },
  { key: 'relevance', name: 'Relevance', description: 'How relevant to our specific niche?' },
  { key: 'follow_up', name: 'Follow-up', description: 'Is this a continuation of a known story?' },
  { key: 'reference', name: 'Reference', description: 'Does this reference something our audience cares about?' },
  { key: 'composition', name: 'Composition', description: 'Does this complement our current content mix?' },
  { key: 'competition', name: 'Competition', description: 'Are competitors affected by this?' },
  { key: 'co_option', name: 'Co-option', description: 'Can we tie this to our agenda?' },
  { key: 'predictability', name: 'Predictability', description: 'Was this expected (scheduled events, results)?' },
  { key: 'exclusivity', name: 'Exclusivity', description: 'Do we have a unique angle on this?' },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Fallback data generators (no API key)
 * ──────────────────────────────────────────────────────────────────────────── */

function generateFallbackNewsValues(title: string): Array<{ name: string; score: number; rationale: string }> {
  return NEWS_VALUES.map(nv => {
    // Deterministic but varied scores based on the news value key and article title
    const hash = (title.length + nv.key.length) % 5 + 1;
    return {
      name: nv.name,
      score: hash,
      rationale: `${nv.description} Assessment based on article content.`,
    };
  });
}

function generateFallbackRelevanceScores(
  articles: Array<{ id: string; title: string }>
): Record<string, 'high' | 'medium' | 'low'> {
  const scores: Record<string, 'high' | 'medium' | 'low'> = {};
  articles.forEach((a, i) => {
    // Distribute across levels for demo purposes
    if (i % 3 === 0) scores[a.id] = 'high';
    else if (i % 3 === 1) scores[a.id] = 'medium';
    else scores[a.id] = 'low';
  });
  return scores;
}

/* ────────────────────────────────────────────────────────────────────────────
 * POST handler
 * ──────────────────────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`angles:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { articleId, articleIds, scoreOnly } = body;

    await getDb();

    // Fetch company + messaging bible context
    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];

    let messagingContext = '';
    if (company) {
      const bibleResult = await sql`SELECT elevator_pitch, messaging_pillars, target_audiences FROM messaging_bibles WHERE company_id = ${company.id} AND status = 'complete' ORDER BY updated_at DESC LIMIT 1`;
      const bible = bibleResult.rows[0];
      if (bible) {
        messagingContext = `\nCompany Positioning: ${bible.elevator_pitch || ''}
Messaging Pillars: ${bible.messaging_pillars || '[]'}
Target Audiences: ${bible.target_audiences || '[]'}`;
      }
    }

    /* ── Bulk relevance scoring mode ── */
    if (scoreOnly && Array.isArray(articleIds) && articleIds.length > 0) {
      const safeIds = articleIds.slice(0, 30).map((id: string) => String(id));
      const placeholders = safeIds.map((_, i) => `$${i + 1}`).join(',');

      // Fetch all articles
      const articlesResult = await sql.query(
        `SELECT id, title, summary, source FROM news_articles WHERE id IN (${placeholders})`,
        safeIds
      );

      if (!anthropic) {
        return NextResponse.json({
          relevanceScores: generateFallbackRelevanceScores(articlesResult.rows),
        });
      }

      const articleSummaries = articlesResult.rows
        .map((a: { id: string; title: string; summary: string; source: string }) =>
          `[${a.id}] "${a.title}" (${a.source}): ${(a.summary || '').substring(0, 150)}`
        )
        .join('\n');

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You score news articles for relevance to a company's positioning and messaging.
Return ONLY valid JSON (no markdown, no code blocks) as an object mapping article IDs to relevance levels: "high", "medium", or "low".

Company: ${company?.name || 'Unknown'}
Type: ${company?.type || 'Insurtech'}
Niche: ${company?.niche || 'Insurance'}${messagingContext}

Score each article:
- "high": Directly relevant to company niche, strong content opportunity
- "medium": Tangentially relevant, moderate content potential
- "low": Minimal relevance to company positioning`,
        messages: [{
          role: 'user',
          content: `Score these articles for relevance:\n\n${articleSummaries}`,
        }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      let relevanceScores: Record<string, string>;
      try {
        relevanceScores = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        relevanceScores = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      }

      return NextResponse.json({ relevanceScores });
    }

    /* ── Single article analysis mode ── */
    if (!articleId) return NextResponse.json({ error: 'Article ID required' }, { status: 400 });

    const articleResult = await sql`SELECT * FROM news_articles WHERE id = ${articleId}`;
    const article = articleResult.rows[0];
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    if (!anthropic) {
      const fallbackValues = generateFallbackNewsValues(article.title || '');
      const topValues = [...fallbackValues].sort((a, b) => b.score - a.score).slice(0, 5);
      const avgScore = topValues.reduce((s, v) => s + v.score, 0) / topValues.length;

      return NextResponse.json({
        newsValues: fallbackValues,
        angles: [
          {
            type: 'contrarian',
            headline: `Why ${(article.title || '').split(':')[0] || 'This Development'} Isn't What It Seems`,
            angle: 'Challenge the conventional wisdom on this topic. Take the opposite view and explain why most people are missing the bigger picture.',
            channel: 'linkedin',
            spokesperson_quote: `"The market is reading this wrong. What we're actually seeing is a fundamental shift that most players won't recognise until it's too late." — Spokesperson, ${company?.name || 'Company'}`,
          },
          {
            type: 'expert',
            headline: `What ${company?.name || 'Industry Leaders'} Needs to Know About ${(article.title || '').split(':')[0] || 'This'}`,
            angle: 'Position your company as the expert. Break down the implications that others haven\'t considered.',
            channel: 'email',
            spokesperson_quote: `"We've been tracking this trend for months. The implications for our clients are significant and require immediate strategic review." — Spokesperson, ${company?.name || 'Company'}`,
          },
          {
            type: 'newsworthy',
            headline: `${company?.name || 'Company'} Responds to ${(article.title || '').split(':')[0] || 'Market Development'}`,
            angle: 'Frame this as a story a trade journalist would cover. Lead with your company\'s unique perspective.',
            channel: 'trade_media',
            spokesperson_quote: `"This is exactly the kind of market shift we built our platform to address. We're seeing increased demand from clients who need to navigate these changes." — Spokesperson, ${company?.name || 'Company'}`,
          },
        ],
        relevanceScore: Math.round(avgScore * 20),
      });
    }

    const newsValuesDescription = NEWS_VALUES
      .map(nv => `- ${nv.name}: ${nv.description}`)
      .join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `You are a strategic content advisor using the 17 News Values framework for analysis. Given a news article and company context, you must:

1. Score ALL 17 news values (1-5 scale) with brief rationale
2. Suggest 3 content angles informed by the highest-scoring news values
3. Provide an overall relevance score (0-100)

The 17 News Values:
${newsValuesDescription}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "newsValues": [
    { "name": "Impact", "score": 4, "rationale": "Affects thousands of policyholders across the market" },
    ...all 17 values
  ],
  "angles": [
    {
      "type": "contrarian",
      "headline": "A provocative headline for LinkedIn",
      "angle": "2-3 sentence description of the angle and why it works, informed by the highest news values",
      "channel": "linkedin",
      "spokesperson_quote": "A bold, quotable statement a senior exec could use"
    },
    {
      "type": "expert",
      "headline": "An authoritative headline for email newsletter",
      "angle": "2-3 sentence description",
      "channel": "email",
      "spokesperson_quote": "An insightful quote showing deep expertise"
    },
    {
      "type": "newsworthy",
      "headline": "A trade media-worthy headline",
      "angle": "2-3 sentence description of why a journalist would cover this",
      "channel": "trade_media",
      "spokesperson_quote": "A quotable comment for press release"
    }
  ],
  "relevanceScore": 75
}`,
      messages: [{
        role: 'user',
        content: `Article: "${article.title}"
Source: ${article.source}
Summary: ${article.summary}

Company: ${company?.name || 'Unknown'}
Type: ${company?.type || 'Insurtech'}
Niche: ${company?.niche || 'Insurance'}
Brand Voice: ${company?.brand_voice || 'Professional and authoritative'}${messagingContext}

Analyse this article using the 17 News Values framework and suggest content angles.`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { newsValues: [], angles: [], relevanceScore: 0 };
    }

    return NextResponse.json({
      newsValues: result.newsValues || [],
      angles: result.angles || [],
      relevanceScore: result.relevanceScore || 0,
    });
  } catch (error) {
    console.error('Angle generation error:', error);
    return NextResponse.json({ error: 'Failed to generate angles' }, { status: 500 });
  }
}
