import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

interface CompetitorInsight {
  name: string;
  mention_count: number;
  themes: string[];
  positioning_angles: string[];
  recent_articles: Array<{
    title: string;
    source: string;
    published_at: string;
    competitor_context: string;
    narrative_fit: number;
  }>;
}

/**
 * GET /api/competitive/insights
 *
 * Aggregates competitor_context from signal_analyses to produce AI-driven
 * competitive intelligence. No new Claude calls -- reuses existing analysis.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkTierAccess(user.id, 'competitor_monitoring');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  const rl = rateLimit(`competitive-insights:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const range = request.nextUrl.searchParams.get('range') || '30d';
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    // Get all signal analyses with non-empty competitor_context
    const analysesResult = await sql`
      SELECT
        sa.competitor_context,
        sa.themes,
        sa.narrative_fit,
        sa.urgency,
        sa.recommended_action,
        sa.created_at,
        na.title,
        na.summary,
        na.source,
        na.published_at
      FROM signal_analyses sa
      JOIN news_articles na ON na.id = sa.article_id
      WHERE sa.company_id = ${company.id}
        AND sa.competitor_context IS NOT NULL
        AND sa.competitor_context != ''
        AND sa.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
      ORDER BY sa.created_at DESC
    `;

    const analyses = analysesResult.rows;

    // Get competitor list from messaging bible for name matching
    const bibleResult = await sql`
      SELECT competitors FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const knownCompetitors: string[] = (() => {
      try {
        const raw = bibleResult.rows[0]?.competitors;
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((c: any) => typeof c === 'string' ? c : c.name || c.company || '').filter(Boolean) : [];
      } catch {
        return [];
      }
    })();

    // Group analyses by competitor mentioned
    const competitorMap = new Map<string, {
      articles: Array<{
        title: string;
        source: string;
        published_at: string;
        competitor_context: string;
        narrative_fit: number;
        themes: string[];
      }>;
    }>();

    for (const analysis of analyses) {
      const contextLower = (analysis.competitor_context as string).toLowerCase();
      let articleThemes: string[] = [];
      try {
        const raw = analysis.themes;
        articleThemes = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
      } catch {
        articleThemes = [];
      }

      // Match known competitors against the context text
      const matchedCompetitors: string[] = [];
      for (const comp of knownCompetitors) {
        if (contextLower.includes(comp.toLowerCase())) {
          matchedCompetitors.push(comp);
        }
      }

      // If no known competitor matched but there is context, file under "Other competitors"
      if (matchedCompetitors.length === 0) {
        matchedCompetitors.push('Other competitors');
      }

      for (const comp of matchedCompetitors) {
        if (!competitorMap.has(comp)) {
          competitorMap.set(comp, { articles: [] });
        }
        competitorMap.get(comp)!.articles.push({
          title: analysis.title as string,
          source: analysis.source as string,
          published_at: analysis.published_at as string,
          competitor_context: analysis.competitor_context as string,
          narrative_fit: analysis.narrative_fit as number,
          themes: articleThemes,
        });
      }
    }

    // Build insights per competitor
    const insights: CompetitorInsight[] = [];
    for (const [name, data] of competitorMap.entries()) {
      // Collect all themes across articles for this competitor
      const themeCount = new Map<string, number>();
      const positioningAngles: string[] = [];

      for (const article of data.articles) {
        for (const theme of article.themes) {
          themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
        }
        // Extract positioning from competitor_context (the AI analysis)
        if (article.competitor_context.length > 10) {
          positioningAngles.push(article.competitor_context);
        }
      }

      // Sort themes by frequency
      const sortedThemes = Array.from(themeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([theme]) => theme);

      // Deduplicate positioning angles (keep unique first sentences)
      const uniqueAngles = [...new Set(
        positioningAngles.map(p => {
          const firstSentence = p.split(/[.!?]/)[0]?.trim();
          return firstSentence || p.slice(0, 120);
        })
      )].slice(0, 5);

      insights.push({
        name,
        mention_count: data.articles.length,
        themes: sortedThemes.slice(0, 8),
        positioning_angles: uniqueAngles,
        recent_articles: data.articles.slice(0, 5).map(a => ({
          title: a.title,
          source: a.source,
          published_at: a.published_at,
          competitor_context: a.competitor_context,
          narrative_fit: a.narrative_fit,
        })),
      });
    }

    // Sort by mention count descending
    insights.sort((a, b) => b.mention_count - a.mention_count);

    // Identify whitespace: themes YOUR signals cover but competitors are silent on
    const allAnalysesResult = await sql`
      SELECT sa.themes
      FROM signal_analyses sa
      WHERE sa.company_id = ${company.id}
        AND sa.narrative_fit >= 40
        AND sa.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
    `;

    const yourThemeCount = new Map<string, number>();
    for (const row of allAnalysesResult.rows) {
      let themes: string[] = [];
      try {
        themes = Array.isArray(row.themes) ? row.themes : JSON.parse(row.themes || '[]');
      } catch {
        themes = [];
      }
      for (const theme of themes) {
        yourThemeCount.set(theme, (yourThemeCount.get(theme) || 0) + 1);
      }
    }

    // Competitor themes (from the insights we just built)
    const competitorThemes = new Set<string>();
    for (const insight of insights) {
      for (const theme of insight.themes) {
        competitorThemes.add(theme);
      }
    }

    // Whitespace = themes in YOUR narrative but NOT in competitor mentions
    const whitespace = Array.from(yourThemeCount.entries())
      .filter(([theme]) => !competitorThemes.has(theme))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, signal_count: count }));

    return NextResponse.json({
      insights,
      whitespace,
      total_analyses_with_competitor_context: analyses.length,
      range,
    });
  } catch (error) {
    console.error('Competitive insights error:', error);
    return NextResponse.json({ error: 'Failed to fetch competitive insights' }, { status: 500 });
  }
}
