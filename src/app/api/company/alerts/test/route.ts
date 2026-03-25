import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { sendSlackAlert } from '@/lib/alerts';
import { decrypt } from '@/lib/crypto';

const testSignal = {
  usefulness_score: 9.2,
  recommended_action: 'act_now',
  why_it_matters: 'This is a test alert from Monitus. If you see this in Slack, your integration is working correctly.',
  strongest_stakeholder: 'Test',
};

const testArticle = {
  title: 'Test Signal Alert from Monitus',
  source_url: 'https://www.monitus.ai',
};

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`alert-test:${user.id}`, 3, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many test requests. Wait a minute.' }, { status: 429 });

  await getDb();

  const companyResult = await sql`SELECT slack_webhook_url, slack_channel_id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  const company = companyResult.rows[0];

  // Try OAuth first
  const slackConn = await sql`
    SELECT access_token FROM oauth_connections
    WHERE user_id = ${user.id} AND provider = 'slack' LIMIT 1
  `;

  let ok = false;

  if (slackConn.rows[0] && company?.slack_channel_id) {
    const accessToken = decrypt(slackConn.rows[0].access_token as string);
    ok = await sendSlackAlert({ accessToken, channelId: company.slack_channel_id as string }, testSignal, testArticle);
  } else if (company?.slack_webhook_url) {
    // Legacy webhook fallback
    ok = await sendSlackAlert({ webhookUrl: company.slack_webhook_url as string }, testSignal, testArticle);
  } else {
    return NextResponse.json({ error: 'Slack not connected. Connect Slack first.' }, { status: 400 });
  }

  if (ok) {
    return NextResponse.json({ success: true, message: 'Test alert sent to Slack' });
  }
  return NextResponse.json({ error: 'Failed to send test alert. Check your Slack connection.' }, { status: 400 });
}
