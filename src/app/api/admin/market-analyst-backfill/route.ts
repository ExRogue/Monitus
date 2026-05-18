/**
 * POST /api/admin/market-analyst-backfill
 *
 * Admin-only one-shot that brings ALL existing companies up to the new IA:
 *   - Enriches messaging_bibles with the rich CompanyProfile fields
 *   - Runs the full bootstrap pipeline (score 30 days, cluster, interpret, brief)
 *     for any company that hasn't been through it yet
 *
 * Use case: post-deploy, run this once to populate Market Brief / Market View
 * for every existing customer so they don't see empty surfaces.
 *
 * Body: { companyIds?: string[], skipBackfill?: boolean }
 *   - companyIds: restrict to specific companies. If omitted, processes all.
 *   - skipBackfill: only run profile enrichment, skip article scoring + brief
 *     (faster, useful as a first pass).
 *
 * Streams progress as JSON lines so the admin can watch in real-time.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { enrichProfileForCompany } from '@/lib/profile-enrich';
import { runClusteringPass } from '@/lib/clustering';
import { interpretStaleConversations } from '@/lib/conversation-interpreter';
import { generateMarketBrief } from '@/lib/market-brief';
import { analyzeBatch, type MessagingBible } from '@/lib/signals';
import type { NewsArticle } from '@/lib/news';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { companyIds?: string[]; skipBackfill?: boolean } = {};
  try { body = await request.json(); } catch {}
  const restrictTo = Array.isArray(body.companyIds) ? body.companyIds.filter(s => typeof s === 'string') : null;
  const skipBackfill = Boolean(body.skipBackfill);

  await getDb();

  // Find every company that has a messaging_bibles row (i.e. completed onboarding)
  const companiesResult = restrictTo
    ? await sql`
        SELECT c.id, c.name
        FROM companies c
        JOIN messaging_bibles mb ON mb.company_id = c.id
        WHERE c.id = ANY(${restrictTo as any}::text[])
        ORDER BY c.created_at ASC
      `
    : await sql`
        SELECT DISTINCT c.id, c.name
        FROM companies c
        JOIN messaging_bibles mb ON mb.company_id = c.id
        ORDER BY c.created_at ASC
      `;

  const companies = companiesResult.rows;
  const results: any[] = [];

  for (const company of companies) {
    const companyId = company.id as string;
    const companyName = company.name as string;
    const r: any = { companyId, companyName, steps: {} };

    // ── Profile enrichment
    try {
      const enr = await enrichProfileForCompany(companyId);
      r.steps.enrichment = enr;
    } catch (err: any) {
      r.steps.enrichment = { enriched: false, error: err?.message || String(err) };
    }

    if (skipBackfill) {
      results.push(r);
      continue;
    }

    // ── First-week scoring backfill (only if this company has no signals yet)
    const existingSignalsResult = await sql`SELECT COUNT(*)::int as n FROM signal_analyses WHERE company_id = ${companyId}`;
    const existingSignals = Number(existingSignalsResult.rows[0]?.n || 0);

    if (existingSignals === 0) {
      const bibleResult = await sql`
        SELECT * FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
      `;
      const bible = bibleResult.rows[0];

      const articlesResult = await sql`
        SELECT id, title, summary, source, source_url, category, tags, published_at
        FROM news_articles
        WHERE published_at >= NOW() - INTERVAL '30 days'
        ORDER BY published_at DESC
        LIMIT 40
      `;

      if (bible && articlesResult.rows.length > 0) {
        const bibleForAnalysis: MessagingBible = {
          id: bible.id as string,
          company_id: companyId,
          elevator_pitch: (bible.elevator_pitch || '') as string,
          messaging_pillars: (bible.messaging_pillars || '') as string,
          icp_profiles: (bible.icp_profiles || '[]') as string,
          competitors: (bible.competitors || '[]') as string,
          target_audiences: (bible.target_audiences || '[]') as string,
          company_description: (bible.company_description || '') as string,
          differentiators: (bible.differentiators || '[]') as string,
          stakeholder_matrix: (bible.stakeholder_matrix || '[]') as string,
        };
        const articles = articlesResult.rows.map(row => ({
          id: row.id as string,
          title: row.title as string,
          summary: (row.summary || '') as string,
          source: (row.source || '') as string,
          source_url: (row.source_url || '') as string,
          category: (row.category || '') as string,
          tags: (row.tags || '[]') as string,
          published_at: (row.published_at || '') as string,
          content: '',
          fetched_at: '',
        })) as NewsArticle[];

        try {
          const analyses = await analyzeBatch(articles, bibleForAnalysis, 3);
          let stored = 0;
          for (const analysis of analyses) {
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
              stored++;
            } catch {}
          }
          r.steps.signalScoring = { stored, considered: articles.length };
        } catch (err: any) {
          r.steps.signalScoring = { error: err?.message || String(err) };
        }
      } else {
        r.steps.signalScoring = { skipped: true, reason: bible ? 'No recent articles' : 'No messaging bible' };
      }
    } else {
      r.steps.signalScoring = { skipped: true, reason: `Already has ${existingSignals} signals` };
    }

    // ── Clustering
    try {
      const c = await runClusteringPass(companyId);
      r.steps.clustering = c;
    } catch (err: any) {
      r.steps.clustering = { error: err?.message || String(err) };
    }

    // ── Interpretation (top 8)
    try {
      const i = await interpretStaleConversations(companyId, 8);
      r.steps.interpretation = i;
    } catch (err: any) {
      r.steps.interpretation = { error: err?.message || String(err) };
    }

    // ── First Market Brief
    try {
      const brief = await generateMarketBrief(companyId);
      r.steps.marketBrief = brief ? { id: brief.id, conversationCount: brief.conversations.length } : { skipped: true };
    } catch (err: any) {
      r.steps.marketBrief = { error: err?.message || String(err) };
    }

    results.push(r);
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
