import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { listChannels } from '@/lib/slack';
import { decrypt } from '@/lib/crypto';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const connection = await sql`
    SELECT access_token FROM oauth_connections
    WHERE user_id = ${user.id} AND provider = 'slack' LIMIT 1
  `;

  if (!connection.rows[0]) {
    return NextResponse.json({ error: 'Slack not connected' }, { status: 400 });
  }

  try {
    const accessToken = decrypt(connection.rows[0].access_token as string);
    const channels = await listChannels(accessToken);
    return NextResponse.json({ channels });
  } catch (err) {
    console.error('[slack-channels] Failed to list channels:', err);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`slack-channel:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { channel_id, channel_name } = body;
  if (!channel_id || !channel_name) {
    return NextResponse.json({ error: 'channel_id and channel_name required' }, { status: 400 });
  }

  await getDb();

  await sql`
    UPDATE companies SET slack_channel_id = ${channel_id}, slack_channel_name = ${channel_name}
    WHERE user_id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
