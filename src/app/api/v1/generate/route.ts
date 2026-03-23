import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getArticlesByIds } from '@/lib/news';
import { generateContent } from '@/lib/generate';
import { trackUsage, checkAndCreateUsageAlerts, getUsageSummary } from '@/lib/billing';
import * as crypto from 'crypto';
import { rateLimit } from '@/lib/validation';

async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  const key = apiKeyHeader || authHeader?.replace('Bearer ', '');

  if (!key || !key.startsWith('mnt_')) return null;

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  await getDb();

  const result = await sql`
    SELECT user_id FROM api_keys WHERE key_hash = ${keyHash} AND revoked_at IS NULL
  `;

  if (!result.rows[0]) return null;

  // Update last used
  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ${keyHash}`;

  return result.rows[0].user_id;
}

export async function POST(request: NextRequest) {
  const userId = await authenticateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const rl = rateLimit(`api:${userId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { articleIds, contentTypes } = body;

    if (!Array.isArray(articleIds) || articleIds.length === 0 || articleIds.length > 20) {
      return NextResponse.json({ error: 'Provide 1-20 article IDs' }, { status: 400 });
    }

    const validTypes = ['newsletter', 'linkedin', 'podcast', 'briefing', 'trade_media', 'email'];
    const types = (contentTypes || []).filter((t: string) => validTypes.includes(t));
    if (types.length === 0) {
      return NextResponse.json({ error: 'Provide at least one valid content type: ' + validTypes.join(', ') }, { status: 400 });
    }

    await getDb();

    // Check usage limits
    const usage = await getUsageSummary(userId);
    if (usage.content_pieces_limit !== null && usage.content_pieces_used + types.length > usage.content_pieces_limit) {
      return NextResponse.json({ error: 'Content limit exceeded. Upgrade your plan.' }, { status: 403 });
    }

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${userId}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    const articles = await getArticlesByIds(articleIds);
    if (articles.length === 0) {
      return NextResponse.json({ error: 'No valid articles found' }, { status: 400 });
    }

    const results = await generateContent(articles, company as any, types);

    for (const ct of types) {
      await trackUsage(userId, 'content_generated', { articleCount: articles.length, contentType: ct, source: 'api' });
    }
    await checkAndCreateUsageAlerts(userId);

    return NextResponse.json({ content: results });
  } catch (error) {
    console.error('API v1 generate error:', error);
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 });
  }
}
