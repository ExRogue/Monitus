import { NextRequest, NextResponse } from 'next/server';
import { analyzeSignalRelevance, MessagingBible } from '@/lib/signals';
import { detectThemesFromSignals } from '@/lib/themes';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { dispatchSignalAlert } from '@/lib/alerts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let signalsAnalyzed = 0;
  let themesRefreshed = 0;

  try {
    await getDb();

    // Find companies with active narratives
    const companiesResult = await sql`
      SELECT DISTINCT c.id as company_id
      FROM companies c
      INNER JOIN messaging_bibles mb ON mb.company_id = c.id
      WHERE LENGTH(COALESCE(mb.elevator_pitch, '')) > 5
         OR LENGTH(COALESCE(mb.full_document, '')) > 10
         OR mb.status = 'complete'
    `;

    console.log(`[cron/analyse] Found ${companiesResult.rows.length} companies with narratives`);

    for (const company of companiesResult.rows) {
      const companyId = company.company_id as string;

      // Check time budget — stop if we've used 50s
      if (Date.now() - startTime > 50_000) {
        console.log(`[cron/analyse] Time budget exceeded at ${Date.now() - startTime}ms, stopping`);
        break;
      }

      try {
        // Get messaging bible for this company
        const bibleResult = await sql`
          SELECT * FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
        `;
        if (!bibleResult.rows.length) continue;
        const bible = bibleResult.rows[0] as unknown as MessagingBible;

        // Find unanalysed articles
        const unanalysed = await sql`
          SELECT na.id, na.title, na.summary, na.content, na.source, na.source_url, na.category, na.tags, na.published_at, na.fetched_at
          FROM news_articles na
          WHERE NOT EXISTS (
            SELECT 1 FROM signal_analyses sa
            WHERE sa.article_id = na.id AND sa.company_id = ${companyId}
          )
          ORDER BY na.published_at DESC NULLS LAST
          LIMIT 20
        `;

        console.log(`[cron/analyse] Company ${companyId}: ${unanalysed.rows.length} unanalysed articles found`);

        if (unanalysed.rows.length === 0) continue;

        // Analyse up to 10 articles per company
        const analysisPromises = unanalysed.rows.slice(0, 10).map(async (article) => {
          try {
            const analysis = await analyzeSignalRelevance(
              {
                id: article.id as string,
                title: article.title as string,
                summary: article.summary as string,
                content: article.content as string,
                source: article.source as string,
                source_url: article.source_url as string,
                category: article.category as string,
                tags: article.tags as string,
                published_at: article.published_at as string,
                fetched_at: article.fetched_at as string,
              },
              bible
            );

            const id = uuidv4();
            await sql`
              INSERT INTO signal_analyses (
                id, company_id, article_id,
                narrative_fit, icp_fit, stakeholder_fit_score, right_to_say,
                strategic_significance, timeliness, competitor_relevance, actionability,
                usefulness_score, urgency,
                why_it_matters, why_it_matters_to_buyers, recommended_action,
                competitor_context, themes,
                strongest_stakeholder, secondary_stakeholder, reasoning
              ) VALUES (
                ${id}, ${analysis.company_id}, ${analysis.article_id},
                ${analysis.narrative_fit}, ${analysis.icp_fit}, ${analysis.stakeholder_fit_score}, ${analysis.right_to_say},
                ${analysis.strategic_significance}, ${analysis.timeliness}, ${analysis.competitor_relevance}, ${analysis.actionability},
                ${analysis.usefulness_score}, ${analysis.urgency},
                ${analysis.why_it_matters}, ${analysis.why_it_matters_to_buyers}, ${analysis.recommended_action},
                ${analysis.competitor_context}, ${JSON.stringify(analysis.themes)},
                ${analysis.strongest_stakeholder}, ${analysis.secondary_stakeholder}, ${analysis.reasoning}
              )
            `;
            signalsAnalyzed++;

            // Dispatch real-time alert for high-value signals
            if (analysis.recommended_action === 'act_now') {
              try {
                const userResult = await sql`SELECT user_id FROM companies WHERE id = ${companyId}`;
                if (userResult.rows[0]) {
                  await dispatchSignalAlert(
                    companyId,
                    userResult.rows[0].user_id as string,
                    id,
                    analysis,
                    { title: article.title as string, source_url: article.source_url as string }
                  );
                }
              } catch (alertErr) {
                console.error(`[cron/analyse] Alert dispatch failed for signal ${id}:`, alertErr);
              }
            }
          } catch (articleErr) {
            console.error(`[cron/analyse] Failed to analyse article ${article.id} for company ${companyId}:`, articleErr);
          }
        });

        await Promise.allSettled(analysisPromises);

        // Refresh themes if new signals
        if (signalsAnalyzed > 0) {
          try {
            const themes = await detectThemesFromSignals(companyId);
            themesRefreshed += themes.length;
          } catch (themeErr) {
            console.error(`[cron/analyse] Theme refresh failed for company ${companyId}:`, themeErr);
          }
        }
      } catch (companyErr) {
        console.error(`[cron/analyse] Error processing company ${companyId}:`, companyErr);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[cron/analyse] Complete: ${signalsAnalyzed} signals, ${themesRefreshed} themes in ${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      signalsAnalyzed,
      themesRefreshed,
      duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cron/analyse] Failed after ${duration}ms:`, error);
    return NextResponse.json({ error: 'Analysis failed', duration_ms: duration }, { status: 500 });
  }
}
