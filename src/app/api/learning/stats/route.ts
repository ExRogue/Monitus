import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`learning-stats:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    // Check if company has a narrative (messaging bible)
    const narrativeResult = await sql`
      SELECT id FROM messaging_bibles WHERE company_id = ${company.id} LIMIT 1
    `;
    const hasNarrative = narrativeResult.rows.length > 0;

    if (!hasNarrative) {
      return NextResponse.json({ has_narrative: false });
    }

    // 1. Source breakdown: group signal_analyses by article source
    const sourceBreakdown = await sql`
      SELECT
        na.source,
        COUNT(*)::int as count,
        ROUND(AVG(sa.narrative_fit), 1) as avg_fit
      FROM signal_analyses sa
      JOIN news_articles na ON sa.article_id = na.id
      WHERE sa.company_id = ${company.id}
        AND na.source IS NOT NULL AND na.source != ''
      GROUP BY na.source
      ORDER BY count DESC
      LIMIT 20
    `;

    // 2. Competitor mentions: extract from competitor_context
    const competitorRows = await sql`
      SELECT
        sa.competitor_context,
        sa.themes,
        na.title as article_title,
        sa.narrative_fit
      FROM signal_analyses sa
      JOIN news_articles na ON sa.article_id = na.id
      WHERE sa.company_id = ${company.id}
        AND sa.competitor_context IS NOT NULL
        AND sa.competitor_context != ''
        AND TRIM(sa.competitor_context) != ''
      ORDER BY sa.created_at DESC
      LIMIT 100
    `;

    // Group competitor mentions by extracting names/contexts
    const competitorMap = new Map<string, { count: number; themes: Set<string>; articles: string[] }>();
    for (const row of competitorRows.rows) {
      const context = (row.competitor_context || '').trim();
      if (!context) continue;

      // Use the first sentence or first 80 chars as the key for grouping
      const key = context.length > 80 ? context.slice(0, 80).trim() : context;

      if (!competitorMap.has(key)) {
        competitorMap.set(key, { count: 0, themes: new Set(), articles: [] });
      }
      const entry = competitorMap.get(key)!;
      entry.count++;
      if (row.article_title) entry.articles.push(row.article_title);

      // Parse themes JSON
      try {
        const themes = JSON.parse(row.themes || '[]');
        for (const t of themes) {
          if (typeof t === 'string') entry.themes.add(t);
        }
      } catch { /* ignore parse errors */ }
    }

    const competitorMentions = Array.from(competitorMap.entries())
      .map(([context, data]) => ({
        context,
        count: data.count,
        themes: Array.from(data.themes).slice(0, 5),
        sample_articles: data.articles.slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Find whitespace: themes from signal_analyses where NO competitor_context exists
    const whitespaceThemes = await sql`
      SELECT
        sa.themes,
        COUNT(*)::int as signal_count,
        ROUND(AVG(sa.narrative_fit), 1) as avg_fit
      FROM signal_analyses sa
      WHERE sa.company_id = ${company.id}
        AND (sa.competitor_context IS NULL OR sa.competitor_context = '' OR TRIM(sa.competitor_context) = '')
        AND sa.narrative_fit >= 50
      GROUP BY sa.themes
      ORDER BY signal_count DESC
      LIMIT 10
    `;

    // Parse whitespace theme names
    const whitespace: { theme: string; signal_count: number; avg_fit: number }[] = [];
    for (const row of whitespaceThemes.rows) {
      try {
        const themes = JSON.parse(row.themes || '[]');
        for (const t of themes) {
          if (typeof t === 'string' && t.trim()) {
            whitespace.push({
              theme: t.trim(),
              signal_count: Number(row.signal_count),
              avg_fit: Number(row.avg_fit),
            });
          }
        }
      } catch { /* ignore */ }
    }

    // 3. Recommendations based on real signal data
    const [actNowSignals, monitorSignals, ignoreSignals] = await Promise.all([
      // Act Now: high-fit signals with recommended_action = 'act_now' that don't have generated content
      sql`
        SELECT
          sa.id,
          na.title,
          sa.narrative_fit,
          sa.urgency,
          sa.why_it_matters,
          sa.recommended_action,
          sa.themes
        FROM signal_analyses sa
        JOIN news_articles na ON sa.article_id = na.id
        LEFT JOIN generated_content gc ON gc.signal_id = sa.id AND gc.company_id = ${company.id}
        WHERE sa.company_id = ${company.id}
          AND sa.recommended_action = 'act_now'
          AND gc.id IS NULL
        ORDER BY sa.narrative_fit DESC, sa.urgency DESC
        LIMIT 10
      `,
      // Monitor: signals with recommended_action = 'monitor'
      sql`
        SELECT
          sa.id,
          na.title,
          sa.narrative_fit,
          sa.urgency,
          sa.why_it_matters,
          sa.themes
        FROM signal_analyses sa
        JOIN news_articles na ON sa.article_id = na.id
        WHERE sa.company_id = ${company.id}
          AND sa.recommended_action = 'monitor'
        ORDER BY sa.narrative_fit DESC
        LIMIT 10
      `,
      // Ignore: low-fit signals
      sql`
        SELECT
          sa.id,
          na.title,
          sa.narrative_fit,
          sa.urgency,
          sa.themes
        FROM signal_analyses sa
        JOIN news_articles na ON sa.article_id = na.id
        WHERE sa.company_id = ${company.id}
          AND (sa.recommended_action = 'ignore' OR sa.narrative_fit < 30)
        ORDER BY sa.narrative_fit ASC
        LIMIT 10
      `,
    ]);

    // Reinforce: themes where content has been generated and distributed
    const reinforceResult = await sql`
      SELECT
        gc.title,
        gc.content_type,
        COALESCE(SUM(cd.engagement_views), 0)::int as views,
        COALESCE(SUM(cd.engagement_clicks), 0)::int as clicks,
        COALESCE(SUM(cd.engagement_reactions), 0)::int as reactions
      FROM generated_content gc
      JOIN content_distributions cd ON cd.content_id = gc.id AND cd.status = 'published'
      WHERE gc.company_id = ${company.id}
      GROUP BY gc.id, gc.title, gc.content_type
      HAVING COALESCE(SUM(cd.engagement_views), 0) + COALESCE(SUM(cd.engagement_clicks), 0) + COALESCE(SUM(cd.engagement_reactions), 0) > 0
      ORDER BY (COALESCE(SUM(cd.engagement_views), 0) + COALESCE(SUM(cd.engagement_clicks), 0) + COALESCE(SUM(cd.engagement_reactions), 0)) DESC
      LIMIT 10
    `;

    // 4. Content performance from distributions
    const contentPerformance = await sql`
      SELECT
        gc.title,
        gc.content_type,
        cd.channel,
        cd.engagement_views as views,
        cd.engagement_clicks as clicks,
        cd.engagement_reactions as reactions,
        cd.published_at
      FROM content_distributions cd
      JOIN generated_content gc ON cd.content_id = gc.id
      WHERE cd.company_id = ${company.id}
        AND cd.status = 'published'
      ORDER BY cd.published_at DESC
      LIMIT 15
    `;

    // Summary stats
    const summaryResult = await sql`
      SELECT
        COUNT(*)::int as total_signals,
        ROUND(AVG(narrative_fit), 1) as avg_narrative_fit,
        COUNT(*) FILTER (WHERE recommended_action = 'act_now')::int as act_now_count,
        COUNT(*) FILTER (WHERE recommended_action = 'monitor')::int as monitor_count,
        COUNT(*) FILTER (WHERE recommended_action = 'reinforce')::int as reinforce_count,
        COUNT(*) FILTER (WHERE recommended_action = 'ignore' OR narrative_fit < 30)::int as ignore_count
      FROM signal_analyses
      WHERE company_id = ${company.id}
    `;

    return NextResponse.json({
      has_narrative: true,
      summary: {
        total_signals: Number(summaryResult.rows[0]?.total_signals || 0),
        avg_narrative_fit: Number(summaryResult.rows[0]?.avg_narrative_fit || 0),
        act_now_count: Number(summaryResult.rows[0]?.act_now_count || 0),
        monitor_count: Number(summaryResult.rows[0]?.monitor_count || 0),
        reinforce_count: Number(summaryResult.rows[0]?.reinforce_count || 0),
        ignore_count: Number(summaryResult.rows[0]?.ignore_count || 0),
      },
      source_breakdown: sourceBreakdown.rows.map(r => ({
        source: r.source,
        count: Number(r.count),
        avg_fit: Number(r.avg_fit),
      })),
      competitor_mentions: competitorMentions,
      whitespace,
      recommendations: {
        act_now: actNowSignals.rows.map(r => ({
          id: r.id,
          title: r.title,
          narrative_fit: Number(r.narrative_fit),
          urgency: Number(r.urgency),
          why_it_matters: r.why_it_matters,
          themes: safeParseJsonArray(r.themes),
        })),
        reinforce: reinforceResult.rows.map(r => ({
          title: r.title,
          content_type: r.content_type,
          views: Number(r.views),
          clicks: Number(r.clicks),
          reactions: Number(r.reactions),
        })),
        monitor: monitorSignals.rows.map(r => ({
          id: r.id,
          title: r.title,
          narrative_fit: Number(r.narrative_fit),
          urgency: Number(r.urgency),
          why_it_matters: r.why_it_matters,
          themes: safeParseJsonArray(r.themes),
        })),
        ignore: ignoreSignals.rows.map(r => ({
          id: r.id,
          title: r.title,
          narrative_fit: Number(r.narrative_fit),
          urgency: Number(r.urgency),
          themes: safeParseJsonArray(r.themes),
        })),
      },
      content_performance: contentPerformance.rows.map(r => ({
        title: r.title,
        content_type: r.content_type,
        channel: r.channel,
        views: Number(r.views || 0),
        clicks: Number(r.clicks || 0),
        reactions: Number(r.reactions || 0),
        published_at: r.published_at,
      })),
    });
  } catch (error) {
    console.error('Learning stats GET error:', error);
    return NextResponse.json({ error: 'Failed to load learning stats' }, { status: 500 });
  }
}

function safeParseJsonArray(val: string | null): string[] {
  try {
    const arr = JSON.parse(val || '[]');
    return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
