import { NextRequest, NextResponse } from 'next/server';
import { fetchNewsFeeds } from '@/lib/news';
import { createNotification } from '@/lib/notifications';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const { fetched, errors } = await fetchNewsFeeds();
    const duration = Date.now() - startTime;

    console.log(`[cron/news] Fetched ${fetched} articles in ${duration}ms. Errors: ${errors.length}`);

    // Notify active users about new articles
    if (fetched > 0) {
      try {
        await getDb();
        const usersWithCompanies = await sql`
          SELECT DISTINCT u.id
          FROM users u
          INNER JOIN companies c ON c.user_id = u.id
        `;

        for (const row of usersWithCompanies.rows) {
          await createNotification(
            row.id as string,
            'news_update',
            'New Articles Available',
            `${fetched} new insurance industry article${fetched === 1 ? '' : 's'} have been fetched. Head to the pipeline to review and generate content.`,
            '/pipeline'
          );
        }
      } catch (notifyErr) {
        console.error('[cron/news] Failed to notify users:', notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      fetched,
      errors: errors.length,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cron/news] Failed after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'News fetch failed', duration_ms: duration },
      { status: 500 }
    );
  }
}
