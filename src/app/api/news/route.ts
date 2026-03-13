import { NextRequest, NextResponse } from 'next/server';
import { getLatestNews, searchNews, fetchNewsFeeds } from '@/lib/news';
import { getCurrentUser } from '@/lib/auth';
import { trackUsage } from '@/lib/billing';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');

  if (query) {
    const articles = await searchNews(query, limit);
    await trackUsage(user.id, 'article_view', { query, count: articles.length });
    return NextResponse.json({ articles });
  }

  const articles = await getLatestNews(limit, category);
  await trackUsage(user.id, 'article_view', { category, count: articles.length });
  return NextResponse.json({ articles });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await fetchNewsFeeds();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch news feeds' }, { status: 500 });
  }
}
