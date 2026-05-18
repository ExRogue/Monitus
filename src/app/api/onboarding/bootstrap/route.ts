import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { analyzeBatch, MessagingBible } from '@/lib/signals';
import { generateOpportunitiesFromSignals } from '@/lib/opportunities';
import { NewsArticle } from '@/lib/news';
import { enrichProfileForCompany } from '@/lib/profile-enrich';
import { runClusteringPass } from '@/lib/clustering';
import { interpretStaleConversations } from '@/lib/conversation-interpreter';
import { generateMarketBrief } from '@/lib/market-brief';

export const maxDuration = 300;

/**
 * POST /api/onboarding/bootstrap
 *
 * Phase 2 of onboarding. Called by the dashboard immediately after
 * /api/onboarding/quick-start completes. Runs everything needed for a new
 * customer to land on a populated Market Brief on day 1 instead of waiting
 * for the Monday cron:
 *
 *   1. Profile enrichment — extract the rich CompanyProfile fields
 *      (buyerPersonas, claimsMade, commercialHooks, priorityTopics, etc.)
 *      from the narrative + legacy fields. ~1 Sonnet call.
 *   2. First-week intelligence backfill — score the last 30 days of news
 *      articles against this company's profile. ~30-60 articles × Haiku =
 *      ~$0.05/customer.
 *   3. Clustering pass — group those scored signals into market_conversations.
 *      ~1 Haiku call per 25 signals.
 *   4. Interpretation pass — produce score + interpretation for the top
 *      conversations. Up to 8 Sonnet calls.
 *   5. Market Brief synthesis — generate the first weekly Market Brief.
 *      ~1 Sonnet call.
 *   6. Legacy: opportunities generation (kept for backwards compat until
 *      Phase C cutover drops the Strategy Partner consumers entirely).
 *
 * Total cost: ~$0.30-0.80 per new customer at onboarding.
 * Total runtime: 2-4 minutes (within maxDuration=300).
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

  // ── Step 1: Profile enrichment ───────────────────────────────────────────
  // Pull rich CompanyProfile fields out of the narrative document so the
  // downstream scoring/clustering/interpretation passes have the full
  // structured context to work with, not just elevator_pitch + ICPs.
  let profileEnriched = false;
  try {
    const enrichResult = await enrichProfileForCompany(companyId);
    profileEnriched = enrichResult.enriched;
  } catch (err) {
    console.error('[bootstrap] Profile enrichment failed:', err);
  }

  // ── Step 2: First-week intelligence backfill ─────────────────────────────
  // Score the last 30 days of articles against this company so the Market
  // Brief isn't empty on day 1. Cap at 40 articles to stay within budget
  // and timeout (8 batches of 5 in parallel ≈ 60-90s).
  const recentArticles = await sql`
    SELECT id, title, summary, source, source_url, category, tags, published_at
    FROM news_articles
    WHERE published_at >= NOW() - INTERVAL '30 days'
    ORDER BY published_at DESC
    LIMIT 40
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

  // ── Step 3: Clustering ───────────────────────────────────────────────────
  // Group the freshly scored signals into market_conversations.
  let conversationsCreated = 0;
  let conversationsUpdated = 0;
  try {
    const c = await runClusteringPass(companyId);
    conversationsCreated = c.created;
    conversationsUpdated = c.updated;
  } catch (err) {
    console.error('[bootstrap] Clustering failed:', err);
  }

  // ── Step 4: Interpretation ───────────────────────────────────────────────
  // Score + interpret the top conversations so they appear in the Market Brief
  // with scores and narrative analysis. Capped to 8 to stay within budget.
  let interpretedCount = 0;
  try {
    const i = await interpretStaleConversations(companyId, 8);
    interpretedCount = i.interpreted;
  } catch (err) {
    console.error('[bootstrap] Interpretation failed:', err);
  }

  // ── Step 5: First Market Brief ───────────────────────────────────────────
  let briefId: string | null = null;
  try {
    const brief = await generateMarketBrief(companyId);
    if (brief) briefId = brief.id;
  } catch (err) {
    console.error('[bootstrap] Market Brief generation failed:', err);
  }

  // ── Step 6: Legacy opportunities (kept until Phase C cutover) ────────────
  let opportunityCount = 0;
  try {
    const oppResult = await generateOpportunitiesFromSignals(companyId, 3);
    opportunityCount = oppResult.generated;
  } catch (err) {
    console.error('[bootstrap] Opportunity generation failed:', err);
  }

  return NextResponse.json({
    success: true,
    profileEnriched,
    signalCount: storedCount,
    conversationsCreated,
    conversationsUpdated,
    interpretedCount,
    marketBriefId: briefId,
    opportunities: opportunityCount,
  });
}
