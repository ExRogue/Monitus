import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { analyzeBatch, MessagingBible } from '@/lib/signals';
import { generateOpportunitiesFromSignals } from '@/lib/opportunities';
import { NewsArticle } from '@/lib/news';

export const maxDuration = 60;

/**
 * POST /api/onboarding/bootstrap
 * Phase 2 of onboarding: analyse recent articles against the newly created narrative.
 * Called automatically by the dashboard after quick-start completes.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  // Get company and messaging bible
  const companyResult = await sql`SELECT id, name, description FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  if (!companyResult.rows[0]) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  const company = companyResult.rows[0];
  const companyId = company.id as string;

  const bibleResult = await sql`
    SELECT * FROM messaging_bibles WHERE company_id = ${companyId} AND status = 'complete' ORDER BY updated_at DESC LIMIT 1
  `;
  if (!bibleResult.rows[0]) {
    return NextResponse.json({ error: 'Narrative not ready yet. Complete onboarding first.' }, { status: 400 });
  }
  const bible = bibleResult.rows[0];

  // Check if bootstrap already ran (avoid duplicate work)
  const existingSignals = await sql`
    SELECT COUNT(*) as count FROM signal_analyses WHERE company_id = ${companyId}
  `;
  if (parseInt(existingSignals.rows[0].count as string) > 0) {
    return NextResponse.json({ success: true, skipped: true, message: 'Bootstrap already completed' });
  }

  // Fetch recent articles
  const recentArticles = await sql`
    SELECT id, title, summary, source, source_url, category, tags, published_at
    FROM news_articles
    WHERE published_at >= NOW() - INTERVAL '7 days'
    ORDER BY published_at DESC
    LIMIT 10
  `;

  if (recentArticles.rows.length === 0) {
    return NextResponse.json({ success: true, signalCount: 0, opportunities: 0 });
  }

  const bibleForAnalysis: MessagingBible = {
    id: bible.id as string,
    company_id: companyId,
    elevator_pitch: (bible.elevator_pitch || '') as string,
    messaging_pillars: (bible.messaging_pillars || '') as string,
    icp_profiles: (bible.icp_profiles || '[]') as string,
    competitors: (bible.competitors || '[]') as string,
    target_audiences: (bible.target_audiences || '[]') as string,
    company_description: (bible.company_description || company.description || '') as string,
    differentiators: (bible.differentiators || '[]') as string,
    stakeholder_matrix: (bible.stakeholder_matrix || '[]') as string,
  };

  const articles = recentArticles.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    summary: (r.summary || '') as string,
    source: (r.source || '') as string,
    source_url: (r.source_url || '') as string,
    category: (r.category || '') as string,
    tags: (r.tags || '[]') as string,
    published_at: (r.published_at || '') as string,
    content: '',
    fetched_at: '',
  })) as NewsArticle[];

  // Analyse in batches of 5 (fits within 60s timeout for ~15-20 articles)
  let storedCount = 0;
  try {
    const analysisResults = await analyzeBatch(articles, bibleForAnalysis, 3);

    for (const analysis of analysisResults) {
      try {
        await sql`
          INSERT INTO signal_analyses (
            id, company_id, article_id, narrative_fit, urgency,
            why_it_matters, why_it_matters_to_buyers, recommended_action,
            competitor_context, themes,
            icp_fit, stakeholder_fit_score, right_to_say, strategic_significance,
            timeliness, competitor_relevance, actionability, usefulness_score,
            strongest_stakeholder, secondary_stakeholder, reasoning
          ) VALUES (
            ${uuidv4()}, ${analysis.company_id}, ${analysis.article_id},
            ${analysis.narrative_fit}, ${analysis.urgency},
            ${analysis.why_it_matters}, ${analysis.why_it_matters_to_buyers},
            ${analysis.recommended_action}, ${analysis.competitor_context},
            ${JSON.stringify(analysis.themes)},
            ${analysis.icp_fit}, ${analysis.stakeholder_fit_score}, ${analysis.right_to_say},
            ${analysis.strategic_significance}, ${analysis.timeliness},
            ${analysis.competitor_relevance}, ${analysis.actionability},
            ${analysis.usefulness_score}, ${analysis.strongest_stakeholder},
            ${analysis.secondary_stakeholder}, ${analysis.reasoning}
          )
          ON CONFLICT (company_id, article_id) DO NOTHING
        `;
        storedCount++;
      } catch (insertErr) {
        console.error('[bootstrap] Failed to store signal:', insertErr);
      }
    }
  } catch (err) {
    console.error('[bootstrap] Signal analysis failed:', err);
  }

  // Auto-generate opportunities from high-scoring signals
  let opportunityCount = 0;
  try {
    const oppResult = await generateOpportunitiesFromSignals(companyId, 3);
    opportunityCount = oppResult.generated;
  } catch (err) {
    console.error('[bootstrap] Opportunity generation failed:', err);
  }

  return NextResponse.json({
    success: true,
    signalCount: storedCount,
    opportunities: opportunityCount,
  });
}
