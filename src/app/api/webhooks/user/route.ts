import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getUserSubscription } from '@/lib/billing';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export const runtime = 'nodejs';

const ALLOWED_EVENTS = [
  'content.generated',
  'content.approved',
  'content.published',
  'signal.created',
  'opportunity.created',
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  try {
    await getDb();
    const result = await sql`
      SELECT id, url, events, active, last_fired_at, last_status, created_at
      FROM user_webhooks
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ webhooks: result.rows });
  } catch {
    return NextResponse.json({ error: 'Failed to load webhooks', code: 'WH_001' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  // Webhooks require Growth tier or above
  const subscription = await getUserSubscription(user.id);
  const planId = (subscription as any)?.plan_id || '';
  if (!planId || planId === 'plan-trial' || planId === 'plan-starter') {
    return NextResponse.json({ error: 'Webhooks require the Growth plan or above. Upgrade at /billing', code: 'TIER_003' }, { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'WH_002' }, { status: 400 });
  }

  const { url, events } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required', code: 'WH_003' }, { status: 400 });
  }

  try { new URL(url); } catch {
    return NextResponse.json({ error: 'url must be a valid HTTPS URL', code: 'WH_004' }, { status: 400 });
  }

  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'url must use HTTPS', code: 'WH_005' }, { status: 400 });
  }

  const selectedEvents: string[] = Array.isArray(events)
    ? events.filter((e: string) => ALLOWED_EVENTS.includes(e))
    : ALLOWED_EVENTS;

  try {
    await getDb();

    // Max 10 webhooks per user
    const count = await sql`SELECT COUNT(*) FROM user_webhooks WHERE user_id = ${user.id}`;
    if (parseInt(count.rows[0].count as string) >= 10) {
      return NextResponse.json({ error: 'Maximum 10 webhooks per account', code: 'WH_006' }, { status: 400 });
    }

    const id = uuidv4();
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    await sql`
      INSERT INTO user_webhooks (id, user_id, url, events, secret)
      VALUES (${id}, ${user.id}, ${url}, ${JSON.stringify(selectedEvents)}, ${secret})
      ON CONFLICT (user_id, url) DO UPDATE SET
        events = ${JSON.stringify(selectedEvents)},
        active = true
    `;

    return NextResponse.json({ id, url, events: selectedEvents, secret, active: true });
  } catch {
    return NextResponse.json({ error: 'Failed to create webhook', code: 'WH_007' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'WH_002' }, { status: 400 });
  }

  const { id, active } = body;
  if (!id) return NextResponse.json({ error: 'id is required', code: 'WH_008' }, { status: 400 });

  try {
    await getDb();
    await sql`
      UPDATE user_webhooks SET active = ${active}
      WHERE id = ${id} AND user_id = ${user.id}
    `;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update webhook', code: 'WH_009' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'WH_002' }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id is required', code: 'WH_008' }, { status: 400 });

  try {
    await getDb();
    await sql`DELETE FROM user_webhooks WHERE id = ${id} AND user_id = ${user.id}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete webhook', code: 'WH_010' }, { status: 500 });
  }
}
