import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getUsageSummary } from '@/lib/billing';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id, name, niche FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [contentStats, distStats, voiceStats, usage, totalContent] = await Promise.all([
      // Content generation stats
      sql`
        SELECT
          content_type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE compliance_status = 'passed') as compliant,
          COUNT(*) FILTER (WHERE compliance_status = 'flagged') as flagged,
          COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp) as this_month,
          COUNT(*) FILTER (WHERE created_at >= ${weekAgo}::timestamp) as this_week
        FROM generated_content
        WHERE company_id = ${company.id}
        GROUP BY content_type
        ORDER BY count DESC
      `,
      // Distribution stats
      sql`
        SELECT
          channel,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COALESCE(SUM(engagement_clicks), 0) as total_clicks,
          COALESCE(SUM(engagement_views), 0) as total_views,
          COALESCE(SUM(engagement_reactions), 0) as total_reactions
        FROM content_distributions
        WHERE company_id = ${company.id}
        GROUP BY channel
      `,
      // Voice learning stats
      sql`
        SELECT COUNT(*) as total_edits,
          COUNT(*) FILTER (WHERE created_at >= ${monthStart}::timestamp) as edits_this_month
        FROM voice_edits
        WHERE company_id = ${company.id}
      `,
      // Usage summary
      getUsageSummary(user.id),
      // Total content count
      sql`SELECT COUNT(*) as total FROM generated_content WHERE company_id = ${company.id}`,
    ]);

    return NextResponse.json({
      company: { id: company.id, name: company.name, niche: company.niche },
      summary: {
        total_content_pieces: Number(totalContent.rows[0]?.total || 0),
        plan: usage.plan_name,
        usage: {
          articles: { used: usage.articles_used, limit: usage.articles_limit },
          content: { used: usage.content_pieces_used, limit: usage.content_pieces_limit },
        },
      },
      content_by_type: contentStats.rows,
      distribution_by_channel: distStats.rows,
      voice_learning: {
        total_edits: Number(voiceStats.rows[0]?.total_edits || 0),
        edits_this_month: Number(voiceStats.rows[0]?.edits_this_month || 0),
      },
      available_reports: [
        { type: 'monthly', endpoint: '/api/reports/monthly', description: 'Monthly content performance report' },
        { type: 'quarterly', endpoint: '/api/reports/quarterly', description: 'Quarterly positioning review' },
        { type: 'recommendations', endpoint: '/api/reports/recommendations', description: 'Content strategy recommendations' },
      ],
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
