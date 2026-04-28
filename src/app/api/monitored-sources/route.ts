/**
 * GET /api/monitored-sources
 *
 * Distinct publication names observed in news_articles within the last 30 days,
 * paired with their saturation source_tier. Powers the page-level Sources
 * filter chip in Market Analyst.
 */

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const maxDuration = 15;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    const result = await sql`
      SELECT source, MAX(source_tier) AS source_tier, COUNT(*)::int AS article_count
      FROM news_articles
      WHERE published_at >= NOW() - INTERVAL '30 days'
        AND COALESCE(source, '') != ''
      GROUP BY source
      ORDER BY MAX(source_tier) NULLS LAST, source
    `;
    return NextResponse.json({
      sources: result.rows.map(r => ({
        name: String(r.source),
        tier: Number(r.source_tier ?? 3),
        article_count: Number(r.article_count),
      })),
    });
  } catch (error) {
    console.error('[monitored-sources] failed:', error);
    return NextResponse.json({ error: 'Failed to load sources' }, { status: 500 });
  }
}
