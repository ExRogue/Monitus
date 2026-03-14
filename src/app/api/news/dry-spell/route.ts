import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

/* ────────────────────────────────────────────────────────────────────────────
 * Dry Spell Detection & Content Inspiration
 *
 * Checks if there have been relevant articles in the last 3 days.
 * If not, generates alternative content suggestions using the company's
 * messaging bible and positioning.
 * ──────────────────────────────────────────────────────────────────────────── */

const DRY_SPELL_DAYS = 3;

interface ContentSuggestion {
  id: string;
  type: 'evergreen' | 'thought_leadership' | 'event_based' | 'trend_analysis' | 'hot_take';
  title: string;
  description: string;
  suggestedChannel: string;
}

function generateFallbackSuggestions(companyName: string, niche: string): ContentSuggestion[] {
  return [
    {
      id: 'fallback-1',
      type: 'evergreen',
      title: `The Complete Guide to ${niche} in ${new Date().getFullYear()}`,
      description: `A comprehensive overview of the ${niche.toLowerCase()} landscape — trends, challenges, and opportunities. Positions ${companyName} as the go-to authority.`,
      suggestedChannel: 'email',
    },
    {
      id: 'fallback-2',
      type: 'thought_leadership',
      title: `What Most People Get Wrong About ${niche}`,
      description: `Challenge conventional wisdom in your space. Share a contrarian but well-reasoned perspective that demonstrates deep industry knowledge.`,
      suggestedChannel: 'linkedin',
    },
    {
      id: 'fallback-3',
      type: 'event_based',
      title: `Key Takeaways from Recent Industry Developments`,
      description: `Summarise and analyse recent industry events, conferences, or regulatory changes that your audience should know about.`,
      suggestedChannel: 'email',
    },
    {
      id: 'fallback-4',
      type: 'trend_analysis',
      title: `5 Trends Shaping ${niche} This Quarter`,
      description: `Data-driven analysis of emerging patterns in the market. Use internal data and industry reports to back up your claims.`,
      suggestedChannel: 'trade_media',
    },
    {
      id: 'fallback-5',
      type: 'hot_take',
      title: `Why the Biggest Risk in ${niche} Isn't What You Think`,
      description: `A bold, provocative piece that reframes a commonly discussed risk. Perfect for driving engagement and starting conversations.`,
      suggestedChannel: 'linkedin',
    },
  ];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`dry-spell:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await getDb();

    // Check for articles in the last N days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DRY_SPELL_DAYS);
    const cutoffIso = cutoff.toISOString();

    const recentResult = await sql`
      SELECT COUNT(*)::int as count
      FROM news_articles
      WHERE published_at >= ${cutoffIso}
    `;
    const recentCount = recentResult.rows[0]?.count || 0;

    const isDrySpell = recentCount === 0;

    if (!isDrySpell) {
      return NextResponse.json({
        isDrySpell: false,
        recentArticleCount: recentCount,
        suggestions: [],
      });
    }

    // Fetch company context for suggestion generation
    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    const companyName = company?.name || 'Your Company';
    const niche = company?.niche || 'Insurance';

    // Fetch messaging bible context
    let messagingContext = '';
    if (company) {
      const bibleResult = await sql`
        SELECT elevator_pitch, messaging_pillars, target_audiences, brand_voice_examples
        FROM messaging_bibles
        WHERE company_id = ${company.id} AND status = 'complete'
        ORDER BY updated_at DESC LIMIT 1
      `;
      const bible = bibleResult.rows[0];
      if (bible) {
        messagingContext = `
Elevator Pitch: ${bible.elevator_pitch || ''}
Messaging Pillars: ${bible.messaging_pillars || '[]'}
Target Audiences: ${bible.target_audiences || '[]'}
Brand Voice Examples: ${bible.brand_voice_examples || '[]'}`;
      }
    }

    // Fetch recent-ish articles that might still be relevant for hot takes
    const olderResult = await sql`
      SELECT title, summary, source, published_at
      FROM news_articles
      ORDER BY published_at DESC
      LIMIT 10
    `;
    const olderArticles = olderResult.rows;

    if (!anthropic) {
      return NextResponse.json({
        isDrySpell: true,
        recentArticleCount: 0,
        daysSinceLastArticle: DRY_SPELL_DAYS,
        suggestions: generateFallbackSuggestions(companyName, niche),
      });
    }

    const olderArticleContext = olderArticles.length > 0
      ? `\nRecent older articles that could still be relevant:\n${olderArticles.map(a => `- "${a.title}" (${a.source}, ${a.published_at})`).join('\n')}`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a content strategist helping a company maintain their publishing cadence during a news dry spell. There have been no relevant news articles in the last ${DRY_SPELL_DAYS} days.

Generate 5 content suggestions that don't require breaking news. Each suggestion should be actionable and specific to the company's positioning.

Types to include:
- "evergreen": Timeless educational content based on the company's expertise
- "thought_leadership": Bold opinions or frameworks that showcase authority
- "event_based": Content tied to upcoming industry events, dates, or seasonal patterns
- "trend_analysis": Data-driven analysis of longer-term industry trends
- "hot_take": Fresh perspective on an older story that's still relevant

Return ONLY valid JSON (no markdown, no code blocks) as an array:
[
  {
    "id": "suggestion-1",
    "type": "evergreen",
    "title": "Specific, compelling title",
    "description": "2-3 sentences explaining the angle, why it works, and what makes it timely despite no breaking news",
    "suggestedChannel": "linkedin" | "email" | "trade_media"
  },
  ...4 more
]`,
      messages: [{
        role: 'user',
        content: `Company: ${companyName}
Type: ${company?.type || 'Insurtech'}
Niche: ${niche}
Brand Voice: ${company?.brand_voice || 'Professional and authoritative'}${messagingContext}${olderArticleContext}

Generate 5 content suggestions for this dry spell period.`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

    let suggestions: ContentSuggestion[];
    try {
      suggestions = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : generateFallbackSuggestions(companyName, niche);
    }

    // Ensure each suggestion has an id
    suggestions = suggestions.map((s, i) => ({
      ...s,
      id: s.id || `suggestion-${i + 1}`,
    }));

    return NextResponse.json({
      isDrySpell: true,
      recentArticleCount: 0,
      daysSinceLastArticle: DRY_SPELL_DAYS,
      suggestions,
    });
  } catch (error) {
    console.error('Dry spell check error:', error);
    return NextResponse.json({ error: 'Failed to check for dry spell' }, { status: 500 });
  }
}
