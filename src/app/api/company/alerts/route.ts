import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const result = await sql`
    SELECT slack_webhook_url, alert_threshold, alert_channels, quiet_hours_start, quiet_hours_end, alert_email_enabled
    FROM companies WHERE user_id = ${user.id} LIMIT 1
  `;

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const c = result.rows[0];
  return NextResponse.json({
    slack_webhook_url: c.slack_webhook_url || '',
    alert_threshold: parseInt(String(c.alert_threshold)) || 8,
    alert_channels: c.alert_channels || 'email',
    quiet_hours_start: c.quiet_hours_start || '',
    quiet_hours_end: c.quiet_hours_end || '',
    alert_email_enabled: c.alert_email_enabled !== false,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`alert-settings:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await getDb();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  if (!companyResult.rows[0]) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  const companyId = companyResult.rows[0].id as string;

  // Validate fields
  const updates: string[] = [];
  const {
    slack_webhook_url,
    alert_threshold,
    alert_channels,
    quiet_hours_start,
    quiet_hours_end,
    alert_email_enabled,
  } = body;

  if (slack_webhook_url !== undefined) {
    const url = String(slack_webhook_url).trim();
    if (url && !url.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json({ error: 'Invalid Slack webhook URL. Must start with https://hooks.slack.com/' }, { status: 400 });
    }
    await sql`UPDATE companies SET slack_webhook_url = ${url} WHERE id = ${companyId}`;
  }

  if (alert_threshold !== undefined) {
    const t = parseInt(String(alert_threshold));
    if (![6, 7, 8].includes(t)) {
      return NextResponse.json({ error: 'Threshold must be 6, 7, or 8' }, { status: 400 });
    }
    await sql`UPDATE companies SET alert_threshold = ${t} WHERE id = ${companyId}`;
  }

  if (alert_channels !== undefined) {
    if (!['email', 'slack', 'both'].includes(alert_channels)) {
      return NextResponse.json({ error: 'Channels must be email, slack, or both' }, { status: 400 });
    }
    await sql`UPDATE companies SET alert_channels = ${alert_channels} WHERE id = ${companyId}`;
  }

  if (quiet_hours_start !== undefined) {
    const v = String(quiet_hours_start).trim();
    if (v && !/^\d{2}:\d{2}$/.test(v)) {
      return NextResponse.json({ error: 'Quiet hours must be HH:MM format' }, { status: 400 });
    }
    await sql`UPDATE companies SET quiet_hours_start = ${v} WHERE id = ${companyId}`;
  }

  if (quiet_hours_end !== undefined) {
    const v = String(quiet_hours_end).trim();
    if (v && !/^\d{2}:\d{2}$/.test(v)) {
      return NextResponse.json({ error: 'Quiet hours must be HH:MM format' }, { status: 400 });
    }
    await sql`UPDATE companies SET quiet_hours_end = ${v} WHERE id = ${companyId}`;
  }

  if (alert_email_enabled !== undefined) {
    await sql`UPDATE companies SET alert_email_enabled = ${!!alert_email_enabled} WHERE id = ${companyId}`;
  }

  return NextResponse.json({ success: true });
}
