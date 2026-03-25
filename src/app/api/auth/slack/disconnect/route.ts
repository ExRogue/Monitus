import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`slack-disconnect:${user.id}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  await getDb();

  await sql`DELETE FROM oauth_connections WHERE user_id = ${user.id} AND provider = 'slack'`;
  await sql`
    UPDATE companies
    SET slack_channel_id = '', slack_channel_name = '', slack_team_name = ''
    WHERE user_id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
