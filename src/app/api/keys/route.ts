import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getUserSubscription } from '@/lib/billing';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { sanitizeString, rateLimit } from '@/lib/validation';

async function ensureTable() {
  await getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT DEFAULT '["read","generate"]',
      last_used_at TIMESTAMP,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  // Check plan allows API access (Intelligence tier)
  const subscription = await getUserSubscription(user.id);
  const planId = (subscription as any)?.plan_id || '';
  if (!planId || planId === 'plan-trial' || planId === 'plan-starter' || planId === 'plan-growth') {
    return NextResponse.json({ error: 'API keys require the Intelligence plan.', code: 'TIER_003' }, { status: 403 });
  }

  await ensureTable();

  const result = await sql`
    SELECT id, name, key_prefix, permissions as scopes, last_used_at, created_at
    FROM api_keys WHERE user_id = ${user.id} AND revoked_at IS NULL
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ keys: result.rows });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  const rl = rateLimit(`apikeys:${user.id}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests', code: 'RATE_001' }, { status: 429 });

  // Check plan allows API access (Intelligence tier)
  const subscription = await getUserSubscription(user.id);
  const planId = (subscription as any)?.plan_id || '';
  if (!planId || planId === 'plan-trial' || planId === 'plan-starter' || planId === 'plan-growth') {
    return NextResponse.json({ error: 'API keys require the Intelligence plan.', code: 'TIER_003' }, { status: 403 });
  }

  await ensureTable();

  // Limit to 5 active keys
  const activeKeys = await sql`
    SELECT COUNT(*) as count FROM api_keys WHERE user_id = ${user.id} AND revoked_at IS NULL
  `;
  if (parseInt(activeKeys.rows[0]?.count || '0') >= 5) {
    return NextResponse.json({ error: 'Maximum 5 active API keys. Revoke an existing key first.', code: 'KEY_001' }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'KEY_002' }, { status: 400 });
  }

  try {
    const name = sanitizeString(body.name || 'API Key', 100);

    // Generate API key: mnt_<random>
    const rawKey = `mnt_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 7) + '...';

    const id = uuidv4();
    await sql`
      INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix)
      VALUES (${id}, ${user.id}, ${name}, ${keyHash}, ${keyPrefix})
    `;

    // Return the full key ONCE — it cannot be retrieved again
    return NextResponse.json({
      key: rawKey,
      id,
      name,
      key_prefix: keyPrefix,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json({ error: 'Failed to create API key', code: 'KEY_003' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_001' }, { status: 401 });

  await ensureTable();

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'KEY_002' }, { status: 400 });
  }

  const keyId = body?.id;
  if (!keyId) return NextResponse.json({ error: 'Key ID required', code: 'KEY_004' }, { status: 400 });

  await sql`
    UPDATE api_keys SET revoked_at = NOW()
    WHERE id = ${keyId} AND user_id = ${user.id} AND revoked_at IS NULL
  `;

  return NextResponse.json({ success: true });
}
