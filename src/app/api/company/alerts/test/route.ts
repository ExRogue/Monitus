import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { sendSlackAlert } from '@/lib/alerts';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`alert-test:${user.id}`, 3, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many test requests. Wait a minute.' }, { status: 429 });

  await getDb();

  const result = await sql`SELECT slack_webhook_url FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  const webhookUrl = result.rows[0]?.slack_webhook_url as string;

  if (!webhookUrl) {
    return NextResponse.json({ error: 'No Slack webhook URL configured' }, { status: 400 });
  }

  const ok = await sendSlackAlert(webhookUrl, {
    usefulness_score: 9.2,
    recommended_action: 'act_now',
    why_it_matters: 'This is a test alert from Monitus. If you see this in Slack, your webhook is working correctly.',
    strongest_stakeholder: 'Test',
  }, {
    title: 'Test Signal Alert from Monitus',
    source_url: 'https://www.monitus.ai',
  });

  if (ok) {
    return NextResponse.json({ success: true, message: 'Test alert sent to Slack' });
  }
  return NextResponse.json({ error: 'Failed to send test alert. Check your webhook URL.' }, { status: 400 });
}
