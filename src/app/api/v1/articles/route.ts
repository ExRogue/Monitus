import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import * as crypto from 'crypto';
import { rateLimit } from '@/lib/validation';

async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  const key = apiKeyHeader || authHeader?.replace('Bearer ', '');

  if (!key || !key.startsWith('mnt_')) return null;

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  await getDb();

  const result = await sql`SELECT user_id FROM api_keys WHERE key_hash = ${keyHash} AND revoked_at IS NULL`;
  if (!result.rows[0]) return null;

  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ${keyHash}`;
  return result.rows[0].user_id;
}

export async function GET(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const rl = rateLimit(`api:${userId}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    await getDb();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let result;
    if (category) {
      result = await sql`
        SELECT id, title, summary, source, category, tags, published_at
        FROM news_articles WHERE category = ${category}
        ORDER BY published_at DESC LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT id, title, summary, source, category, tags, published_at
        FROM news_articles ORDER BY published_at DESC LIMIT ${limit}
      `;
    }

    return NextResponse.json({ articles: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('API v1 articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
