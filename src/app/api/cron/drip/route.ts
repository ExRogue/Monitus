import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sendOnboardingDripEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await getDb();

    // Find all unsent drip emails that are due
    const due = await sql`
      SELECT id, user_id, drip_day, email, first_name
      FROM onboarding_drip_queue
      WHERE sent_at IS NULL
        AND scheduled_for <= NOW()
      LIMIT 100
    `;

    let sent = 0;
    let errors = 0;

    for (const row of due.rows) {
      try {
        await sendOnboardingDripEmail(row.email as string, row.first_name as string, row.drip_day as number);
        await sql`
          UPDATE onboarding_drip_queue SET sent_at = NOW() WHERE id = ${row.id}
        `;
        sent++;
      } catch (err) {
        console.error(`[cron/drip] Failed to send day ${row.drip_day} drip to ${row.email}:`, err);
        errors++;
      }
    }

    console.log(`[cron/drip] Sent ${sent} drip emails. Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      sent,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/drip] Failed:', error);
    return NextResponse.json({ error: 'Drip send failed' }, { status: 500 });
  }
}
