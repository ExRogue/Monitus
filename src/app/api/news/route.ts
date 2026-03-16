import { NextRequest, NextResponse } from 'next/server';
import { getLatestNews, searchNews, fetchNewsFeeds, getNewsByTimeframe } from '@/lib/news';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { trackUsage, getUsageSummary } from '@/lib/billing';
import { sanitizeString, rateLimit } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || searchParams.get('search');
  const category = searchParams.get('category') || 'all';
  const limitParam = parseInt(searchParams.get('limit') || '20');
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
  const offset = (page - 1) * limit;
  const timeframe = searchParams.get('timeframe') || '';

  // Enforce article view limit (skip for unlimited plans with very high caps)
  const usage = await getUsageSummary(user.id);
  if (usage.articles_limit !== null && usage.articles_used >= usage.articles_limit) {
    return NextResponse.json(
      { error: `You've reached your monthly article limit (${usage.articles_limit}). Upgrade your plan to access more articles.` },
      { status: 403 }
    );
  }

  let articles;
  if (query) {
    const sanitizedQuery = sanitizeString(query, 200);
    articles = await searchNews(sanitizedQuery, limit, offset);
    await trackUsage(user.id, 'article_view', { query: sanitizedQuery, count: articles.length });
  } else if (timeframe) {
    articles = await getNewsByTimeframe(timeframe, limit, category);
    await trackUsage(user.id, 'article_view', { timeframe, category, count: articles.length });
  } else {
    articles = await getLatestNews(limit, category, offset);
    await trackUsage(user.id, 'article_view', { category, count: articles.length });
  }
  return NextResponse.json({ articles, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`news-refresh:${ip}`, 3, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Feed refresh rate limited. Try again in a few minutes.' }, { status: 429 });
  }

  try {
    const result = await fetchNewsFeeds();
    return NextResponse.json(result);
  } catch (error) {
    console.error('News feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch news feeds' }, { status: 500 });
  }
}
