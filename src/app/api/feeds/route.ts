import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Monitus/1.0 Insurance Content Platform' },
});

// Feed limits by plan slug
const FEED_LIMITS: Record<string, number> = {
  trial: 5,
  starter: 5,
  professional: 10, // Growth plan
  enterprise: 20,   // Intelligence plan
};

async function getFeedLimit(userId: string): Promise<number> {
  const subResult = await sql`
    SELECT sp.slug FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = ${userId} AND s.status = 'active'
    ORDER BY s.created_at DESC LIMIT 1
  `;
  const slug = subResult.rows[0]?.slug || 'trial';
  return FEED_LIMITS[slug] || 5;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ feeds: [], limit: 5 });

  const feedLimit = await getFeedLimit(user.id);

  const result = await sql`
    SELECT * FROM custom_feeds WHERE company_id = ${companyId} ORDER BY created_at DESC
  `;

  return NextResponse.json({ feeds: result.rows, limit: feedLimit });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`feeds:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  await getDb();

  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ error: 'Set up your company first' }, { status: 400 });

  const url = sanitizeString(body.url || '', 2000).trim();
  const name = sanitizeString(body.name || '', 200).trim();
  const category = sanitizeString(body.category || 'custom', 50).trim();

  if (!url) return NextResponse.json({ error: 'Feed URL is required' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Feed name is required' }, { status: 400 });

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // Check feed limit and duplicate URL in a single query
  const feedLimit = await getFeedLimit(user.id);
  const checkResult = await sql`
    SELECT
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE url = ${url}) as dup_count
    FROM custom_feeds WHERE company_id = ${companyId}
  `;
  const currentCount = parseInt(checkResult.rows[0]?.total_count || '0', 10);
  const dupCount = parseInt(checkResult.rows[0]?.dup_count || '0', 10);

  if (dupCount > 0) {
    return NextResponse.json({ error: 'This feed URL has already been added' }, { status: 409 });
  }

  if (currentCount >= feedLimit) {
    return NextResponse.json(
      { error: `Feed limit reached (${feedLimit}). Upgrade your plan for more feeds.` },
      { status: 403 }
    );
  }

  // Validate the feed by test-parsing it
  try {
    await parser.parseURL(url);
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not parse RSS feed at this URL. Please check the URL and try again.' },
      { status: 400 }
    );
  }

  const id = uuidv4();
  try {
    await sql`
      INSERT INTO custom_feeds (id, company_id, url, name, category, status)
      VALUES (${id}, ${companyId}, ${url}, ${name}, ${category}, 'active')
    `;

    return NextResponse.json({
      feed: { id, company_id: companyId, url, name, category, status: 'active', last_error: '' },
    });
  } catch (error) {
    console.error('Feed creation error:', error);
    return NextResponse.json({ error: 'Failed to add feed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  const feedId = sanitizeString(body.id || '', 100);
  if (!feedId) return NextResponse.json({ error: 'Feed ID is required' }, { status: 400 });

  await getDb();

  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ error: 'Company not found' }, { status: 400 });

  // Verify ownership before deleting
  const existing = await sql`SELECT id FROM custom_feeds WHERE id = ${feedId} AND company_id = ${companyId}`;
  if (!existing.rows[0]) return NextResponse.json({ error: 'Feed not found' }, { status: 404 });

  await sql`DELETE FROM custom_feeds WHERE id = ${feedId} AND company_id = ${companyId}`;
  return NextResponse.json({ success: true });
}
