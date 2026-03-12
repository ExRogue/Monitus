import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getArticlesByIds } from '@/lib/news';
import { generateContent, getContentByCompany } from '@/lib/generate';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { articleIds, contentTypes } = await request.json();

  if (!articleIds?.length || !contentTypes?.length) {
    return NextResponse.json({ error: 'Select articles and content types' }, { status: 400 });
  }

  await getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
  }

  const articles = await getArticlesByIds(articleIds);
  if (articles.length === 0) {
    return NextResponse.json({ error: 'No valid articles found' }, { status: 400 });
  }

  try {
    const results = await generateContent(articles, company as any, contentTypes);
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

  const content = await getContentByCompany(company.id as string, type);
  return NextResponse.json({ content });
}
