import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';

function getCutoffDate(period: string): string {
  const now = new Date();
  if (period === '7d') {
    now.setDate(now.getDate() - 7);
  } else if (period === 'all') {
    now.setFullYear(now.getFullYear() - 1);
  } else {
    now.setDate(now.getDate() - 30);
  }
  return now.toISOString();
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  if (!companyResult.rows[0]) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  const companyId = companyResult.rows[0].id as string;

  const period = request.nextUrl.searchParams.get('period') || '30d';
  const cutoff = getCutoffDate(period);

  try {
    const [signalsRes, contentRes, sharesRes, reachRes, streakRes, signalTrendRes, contentTrendRes] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM signal_analyses WHERE company_id = ${companyId} AND recommended_action IN ('act_now', 'monitor') AND created_at >= ${cutoff}::timestamp`,

      sql`SELECT COUNT(*) as count FROM generated_content WHERE company_id = ${companyId} AND created_at >= ${cutoff}::timestamp`,

      sql`SELECT COUNT(*) as count FROM shared_items WHERE company_id = ${companyId} AND created_at >= ${cutoff}::timestamp`,

      sql`SELECT COALESCE(SUM(engagement_views), 0) as views FROM content_distributions WHERE company_id = ${companyId} AND created_at >= ${cutoff}::timestamp`,

      sql`SELECT DISTINCT DATE(created_at) as d FROM usage_events WHERE user_id = ${user.id} AND created_at >= NOW() - INTERVAL '90 days' ORDER BY d DESC`,

      sql`SELECT DATE(created_at) as date, COUNT(*) as count FROM signal_analyses WHERE company_id = ${companyId} AND recommended_action IN ('act_now', 'monitor') AND created_at >= ${cutoff}::timestamp GROUP BY DATE(created_at) ORDER BY date ASC`,

      sql`SELECT DATE(created_at) as date, COUNT(*) as count FROM generated_content WHERE company_id = ${companyId} AND created_at >= ${cutoff}::timestamp GROUP BY DATE(created_at) ORDER BY date ASC`,
    ]);

    const signalCount = parseInt(String(signalsRes.rows[0]?.count)) || 0;
    const contentCount = parseInt(String(contentRes.rows[0]?.count)) || 0;
    const shareCount = parseInt(String(sharesRes.rows[0]?.count)) || 0;
    const reach = parseInt(String(reachRes.rows[0]?.views)) || 0;

    // Compute active streak (consecutive days from today)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = new Set(
      streakRes.rows.map(r => {
        const d = new Date(r.d as string);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      if (dates.has(checkDate.getTime())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const hoursSaved = Math.round(signalCount * 0.5 + contentCount * 2);

    return NextResponse.json({
      signals_surfaced: signalCount,
      content_generated: contentCount,
      hours_saved: hoursSaved,
      team_shares: shareCount,
      distribution_reach: reach,
      active_streak: streak,
      signals_trend: signalTrendRes.rows.map(r => ({ date: r.date, count: parseInt(String(r.count)) || 0 })),
      content_trend: contentTrendRes.rows.map(r => ({ date: r.date, count: parseInt(String(r.count)) || 0 })),
      period,
    });
  } catch (error) {
    console.error('[insights] API error:', error);
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}
