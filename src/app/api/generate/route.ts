import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getArticlesByIds } from '@/lib/news';
import { generateContent, getContentByCompany } from '@/lib/generate';
import { trackUsage } from '@/lib/billing';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit } from '@/lib/validation';

const VALID_CONTENT_TYPES = ['newsletter', 'linkedin', 'podcast_script', 'executive_briefing'];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`generate:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { articleIds, contentTypes } = await request.json();

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

    const results = await generateContent(articles, company as any, validTypes);
    await trackUsage(user.id, 'content_generated', { articleCount: articles.length, contentTypes: validTypes });
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
