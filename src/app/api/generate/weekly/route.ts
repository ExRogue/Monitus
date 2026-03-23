import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateContent } from '@/lib/generate';
import { trackUsage, checkAndCreateUsageAlerts, getUsageSummary, getUserSubscription } from '@/lib/billing';
import { createNotification } from '@/lib/notifications';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/validation';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

export const maxDuration = 60;

// Weekly LinkedIn draft limits per plan
const WEEKLY_LINKEDIN_LIMITS: Record<string, number | null> = {
  'plan-trial': 3,
  'plan-starter': 3,
  'plan-professional': 10,
  'plan-enterprise': null,
};

/**
 * POST /api/generate/weekly
 * Auto-picks the top 5 most relevant news articles from the last 7 days
 * and generates newsletter + linkedin content in one click.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`generate-weekly:${user.id}`, 2, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before generating again.' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Check usage limits
    const usage = await getUsageSummary(user.id);
    const contentTypes: ('newsletter' | 'linkedin')[] = ['newsletter', 'linkedin'];

    // Check Growth+ for extended formats — weekly only generates newsletter + linkedin so no tier gate needed
    if (usage.content_pieces_limit !== null && usage.content_pieces_used >= usage.content_pieces_limit) {
      return NextResponse.json(
        { error: `You've reached your monthly content limit (${usage.content_pieces_limit} pieces). Upgrade your plan to continue.` },
        { status: 403 }
      );
    }
    if (usage.content_pieces_limit !== null && usage.content_pieces_used + contentTypes.length > usage.content_pieces_limit) {
      const remaining = usage.content_pieces_limit - usage.content_pieces_used;
      return NextResponse.json(
        { error: `Only ${remaining} content piece(s) remaining this month. Weekly generation needs 2 slots.` },
        { status: 403 }
      );
    }

    // Enforce weekly LinkedIn limit
    const subscription = await getUserSubscription(user.id);
    const planId = subscription?.plan_id || 'plan-trial';
    const weeklyLimit = WEEKLY_LINKEDIN_LIMITS[planId] ?? null;
    if (weeklyLimit !== null) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const linkedinCountResult = await sql`
        SELECT COUNT(*) as count FROM usage_events
        WHERE user_id = ${user.id}
          AND event_type = 'content_generated'
          AND (metadata::json->>'contentType') = 'linkedin'
          AND created_at >= ${sevenDaysAgo}
      `;
      const linkedinUsed = parseInt(linkedinCountResult.rows[0]?.count || '0');
      if (linkedinUsed >= weeklyLimit) {
        // Only generate newsletter if LinkedIn limit hit
        contentTypes.splice(contentTypes.indexOf('linkedin'), 1);
      }
    }

    if (contentTypes.length === 0) {
      return NextResponse.json({ error: 'All content limits reached. Upgrade your plan to generate more.' }, { status: 403 });
    }

    // Pick top 5 most recent articles from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const articlesResult = await sql`
      SELECT id, title, summary, source, url, category, published_at, tags
      FROM news_articles
      WHERE published_at >= ${sevenDaysAgo}
      ORDER BY published_at DESC
      LIMIT 5
    `;

    if (articlesResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No recent news articles found. Refresh your news feeds first.' },
        { status: 400 }
      );
    }

    const articles = articlesResult.rows.map((row: any) => ({
      ...row,
      tags: (() => { try { return JSON.parse(row.tags || '[]'); } catch { return []; } })(),
    }));

    const results = await generateContent(articles as any, company as any, contentTypes, {});

    // Track usage
    for (const ct of contentTypes) {
      await trackUsage(user.id, 'content_generated', { articleCount: articles.length, contentType: ct, source: 'weekly' });
    }

    if (results.length > 0) {
      await createNotification(
        user.id,
        'content_generated',
        `Weekly Content Generated`,
        `${results.length} piece(s) of content generated automatically from this week's top news.`,
        '/content'
      );
    }

    await checkAndCreateUsageAlerts(user.id);

    return NextResponse.json({
      content: results,
      articles_used: articles.length,
      formats_generated: contentTypes,
    });
  } catch (error) {
    console.error('Weekly generation error:', error);
    return NextResponse.json({ error: 'Weekly content generation failed' }, { status: 500 });
  }
}
