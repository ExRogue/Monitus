import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';
const LOOPS_DIGEST_ID = process.env.LOOPS_DIGEST_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

async function sendDailyBrief(
  email: string,
  firstName: string,
  signalCount: number,
  topSignals: { title: string; score: number; summary: string }[],
): Promise<void> {
  if (!LOOPS_API_KEY || !LOOPS_DIGEST_ID) {
    console.log('[DAILY BRIEF DEV] Would send to:', email, {
      signalCount,
      topSignals: topSignals.length,
    });
    return;
  }

  // Format top signals for the email template
  const signalList = topSignals
    .map((s, i) => `${i + 1}. ${s.title} (${s.score}% match) — ${s.summary}`)
    .join('\n');

  await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      transactionalId: LOOPS_DIGEST_ID,
      addToAudience: false,
      dataVariables: {
        firstName,
        signalCount,
        signalList,
        signalsUrl: `${APP_URL}/signals`,
        dashboardUrl: `${APP_URL}/dashboard`,
      },
    }),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let emailsSent = 0;
  let usersProcessed = 0;

  try {
    await getDb();

    // Find all active users who have a narrative (messaging_bible)
    const usersResult = await sql`
      SELECT DISTINCT u.id, u.email, u.name
      FROM users u
      INNER JOIN companies c ON c.user_id = u.id
      WHERE c.messaging_bible IS NOT NULL
        AND c.messaging_bible != ''
    `;

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const user of usersResult.rows) {
      usersProcessed++;

      try {
        // Count new signals (news articles) in last 24 hours for this user
        const signalsResult = await sql`
          SELECT n.title, n.summary, n.source,
                 COALESCE(n.narrative_fit, 0) as narrative_fit
          FROM news_articles n
          INNER JOIN companies c ON c.user_id = ${user.id}
          WHERE n.created_at >= ${cutoff}
          ORDER BY n.narrative_fit DESC NULLS LAST
          LIMIT 20
        `;

        const allSignals = signalsResult.rows;

        // Skip if fewer than 2 new signals
        if (allSignals.length < 2) continue;

        // Find high-urgency signals (narrative_fit > 70)
        const highUrgency = allSignals.filter(
          (s) => Number(s.narrative_fit) >= 70
        );

        // Top 3 signals for the email
        const topSignals = allSignals.slice(0, 3).map((s) => ({
          title: (s.title as string) || 'Untitled',
          score: Number(s.narrative_fit) || 0,
          summary:
            ((s.summary as string) || '').substring(0, 120) ||
            'Signal detected — view details in your dashboard.',
        }));

        const firstName = ((user.name as string) || 'there').split(' ')[0];

        await sendDailyBrief(
          user.email as string,
          firstName,
          allSignals.length,
          topSignals,
        );

        emailsSent++;
      } catch (userError) {
        console.error(
          `[daily-brief] Error processing user ${user.id}:`,
          userError,
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[cron/daily-brief] Processed ${usersProcessed} users, sent ${emailsSent} briefs in ${duration}ms`,
    );

    return NextResponse.json({
      success: true,
      usersProcessed,
      emailsSent,
      durationMs: duration,
    });
  } catch (error) {
    console.error('[cron/daily-brief] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
