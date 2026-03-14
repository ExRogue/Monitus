import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getArticlesByIds } from '@/lib/news';
import { generateContent, getContentByCompany } from '@/lib/generate';
import { trackUsage, checkAndCreateUsageAlerts, getUsageSummary } from '@/lib/billing';
import { createNotification } from '@/lib/notifications';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit } from '@/lib/validation';

const VALID_CONTENT_TYPES = ['newsletter', 'linkedin', 'podcast', 'briefing', 'trade_media', 'email'];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`generate:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { articleIds, contentTypes, channel, department } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0 || articleIds.length > 20) {
      return NextResponse.json({ error: 'Select between 1 and 20 articles' }, { status: 400 });
    }

    if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
      return NextResponse.json({ error: 'Select at least one content type' }, { status: 400 });
    }

    const validTypes = contentTypes.filter((t: string) => VALID_CONTENT_TYPES.includes(t));
    if (validTypes.length === 0) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const safeIds = articleIds.map((id: string) => sanitizeString(String(id), 100)).filter(Boolean);

    await getDb();
    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const articles = await getArticlesByIds(safeIds);
    if (articles.length === 0) {
      return NextResponse.json({ error: 'No valid articles found' }, { status: 400 });
    }

    // Enforce usage limits before generating content (skip for unlimited plans with very high caps)
    const usage = await getUsageSummary(user.id);
    if (usage.content_pieces_limit > 0 && usage.content_pieces_limit < 99999 && usage.content_pieces_used >= usage.content_pieces_limit) {
      return NextResponse.json(
        { error: `You've reached your monthly content limit (${usage.content_pieces_limit} pieces). Upgrade your plan to continue generating content.` },
        { status: 403 }
      );
    }
    // Also check if this request would exceed the limit (each content type = 1 piece)
    if (usage.content_pieces_limit > 0 && usage.content_pieces_limit < 99999 && usage.content_pieces_used + validTypes.length > usage.content_pieces_limit) {
      const remaining = usage.content_pieces_limit - usage.content_pieces_used;
      return NextResponse.json(
        { error: `You can only generate ${remaining} more content piece(s) this month. You selected ${validTypes.length} content type(s). Remove some content types or upgrade your plan.` },
        { status: 403 }
      );
    }

    const results = await generateContent(articles, company as any, validTypes, { channel, department });
    // Track one usage event per content type generated (not per request)
    for (const ct of validTypes) {
      await trackUsage(user.id, 'content_generated', { articleCount: articles.length, contentType: ct });
    }

    // Create notification for content generated
    if (results.length > 0) {
      const contentType = validTypes[0] || 'content';
      await createNotification(
        user.id,
        'content_generated',
        `Content Generated: ${contentType}`,
        `${results.length} piece(s) of ${contentType} content have been generated.`,
        '/content'
      );
    }

    // Check and create usage alerts if thresholds are reached
    await checkAndCreateUsageAlerts(user.id);

    return NextResponse.json({ content: results });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ content: [] });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;
  const search = searchParams.get('search') || '';
  const limitParam = parseInt(searchParams.get('limit') || '50');
  const limit = Math.min(Math.max(limitParam, 1), 100);

  if (type && !VALID_CONTENT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid content type filter' }, { status: 400 });
  }

  let content = await getContentByCompany(company.id as string, type);

  // Client-side search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    content = content.filter((c: any) =>
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.content_type && c.content_type.toLowerCase().includes(q)) ||
      (c.content && c.content.toLowerCase().includes(q))
    );
  }

  content = content.slice(0, limit);
  return NextResponse.json({ content });
}
