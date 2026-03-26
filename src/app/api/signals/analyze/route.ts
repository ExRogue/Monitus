import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { analyzeBatch, SignalAnalysis, MessagingBible } from '@/lib/signals';
import { NewsArticle } from '@/lib/news';
import { rateLimit } from '@/lib/validation';

export const maxDuration = 60;

// POST /api/signals/analyze — analyse unanalysed articles for the current company
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`signals-analyze:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  await getDb();

  // Get company
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  if (!companyResult.rows.length) {
    return NextResponse.json({ error: 'No company found' }, { status: 404 });
  }
  const companyId = companyResult.rows[0].id as string;

  // Get messaging bible (narrative)
  const bibleResult = await sql`
    SELECT * FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
  `;
  if (!bibleResult.rows.length) {
    return NextResponse.json({ error: 'No narrative found. Complete your Narrative first.' }, { status: 400 });
  }
  const bible = bibleResult.rows[0] as unknown as MessagingBible;

  // Find articles not yet analyzed for this company (last 7 days, up to 5)
  const unanalyzedResult = await sql`
    SELECT na.* FROM news_articles na
    WHERE na.published_at >= NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM signal_analyses sa
      WHERE sa.article_id = na.id AND sa.company_id = ${companyId}
    )
    ORDER BY na.published_at DESC
    LIMIT 15
  `;

  const articles = unanalyzedResult.rows as unknown as NewsArticle[];

  if (articles.length === 0) {
    // All recent articles are already analyzed -- return existing analyses
    const existingResult = await sql`
      SELECT sa.*, na.title, na.summary, na.source, na.source_url, na.category, na.tags, na.published_at
      FROM signal_analyses sa
      JOIN news_articles na ON na.id = sa.article_id
      WHERE sa.company_id = ${companyId}
      AND sa.narrative_fit >= 10
      ORDER BY (sa.narrative_fit * sa.urgency) DESC
      LIMIT 50
    `;
    return NextResponse.json({
      analyses: existingResult.rows,
      analyzed_count: 0,
      all_analyzed: true,
    });
  }

  // Run AI analysis on the batch
  // Process 15 articles in 3 sequential rounds of 5 to avoid API rate limits
  const analyses = await analyzeBatch(articles, bible, 5);

  // Store results — count only successfully stored
  let storedCount = 0;
  for (const analysis of analyses) {
    const id = uuidv4();
    try {
      await sql`
        INSERT INTO signal_analyses (id, company_id, article_id, narrative_fit, urgency, why_it_matters, why_it_matters_to_buyers, recommended_action, competitor_context, themes)
        VALUES (
          ${id},
          ${companyId},
          ${analysis.article_id},
          ${analysis.narrative_fit},
          ${analysis.urgency},
          ${analysis.why_it_matters},
          ${analysis.why_it_matters_to_buyers},
          ${analysis.recommended_action},
          ${analysis.competitor_context},
          ${JSON.stringify(analysis.themes)}
        )
        ON CONFLICT (company_id, article_id) DO NOTHING
      `;
      storedCount++;
    } catch (err) {
      console.error(`[signals/analyze] Failed to store analysis for article ${analysis.article_id}:`, err);
    }
  }

  // Return all analyses for this company (including newly created ones)
  const allResult = await sql`
    SELECT sa.*, na.title, na.summary, na.source, na.source_url, na.category, na.tags, na.published_at
    FROM signal_analyses sa
    JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    AND sa.narrative_fit >= 10
    ORDER BY (sa.narrative_fit * sa.urgency) DESC
    LIMIT 50
  `;

  return NextResponse.json({
    analyses: allResult.rows,
    analyzed_count: storedCount,
    all_analyzed: false,
  });
}

// GET /api/signals/analyze — get cached analyses without triggering new analysis
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getDb();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  if (!companyResult.rows.length) {
    return NextResponse.json({ analyses: [] });
  }
  const companyId = companyResult.rows[0].id as string;

  const result = await sql`
    SELECT sa.*, na.title, na.summary, na.source, na.source_url, na.category, na.tags, na.published_at
    FROM signal_analyses sa
    JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    AND sa.narrative_fit >= 10
    ORDER BY (sa.narrative_fit * sa.urgency) DESC
    LIMIT 50
  `;

  // Check if there are unanalyzed articles
  const unanalyzedCount = await sql`
    SELECT COUNT(*) as count FROM news_articles na
    WHERE na.published_at >= NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM signal_analyses sa
      WHERE sa.article_id = na.id AND sa.company_id = ${companyId}
    )
  `;

  return NextResponse.json({
    analyses: result.rows,
    pending_count: parseInt(unanalyzedCount.rows[0]?.count as string || '0'),
  });
}
