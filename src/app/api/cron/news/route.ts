import { NextRequest, NextResponse } from 'next/server';
import { fetchNewsFeeds } from '@/lib/news';
import { createNotification } from '@/lib/notifications';
import { analyzeSignalRelevance, MessagingBible } from '@/lib/signals';
import { detectThemesFromSignals } from '@/lib/themes';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
    const { fetched, errors } = await fetchNewsFeeds();
    const duration = Date.now() - startTime;

    console.log(`[cron/news] Fetched ${fetched} articles in ${duration}ms. Errors: ${errors.length}`);

    // Notify active users about new articles
    if (fetched > 0) {
      try {
        await getDb();
        const usersWithCompanies = await sql`
          SELECT DISTINCT u.id
          FROM users u
          INNER JOIN companies c ON c.user_id = u.id
        `;

        for (const row of usersWithCompanies.rows) {
          await createNotification(
            row.id as string,
            'news_update',
            'New Articles Available',
            `${fetched} new insurance industry article${fetched === 1 ? '' : 's'} have been fetched. Head to the pipeline to review and generate content.`,
            '/signals'
          );
        }
      } catch (notifyErr) {
        console.error('[cron/news] Failed to notify users:', notifyErr);
      }
    }

    // Trigger signal analysis for new unanalysed articles
    try {
      await getDb();

      // Find companies with active narratives
      const companiesResult = await sql`
        SELECT DISTINCT c.id as company_id
        FROM companies c
        INNER JOIN messaging_bibles mb ON mb.company_id = c.id
        WHERE mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10
      `;

      for (const company of companiesResult.rows) {
        const companyId = company.company_id as string;

        try {
          // Get messaging bible for this company
          const bibleResult = await sql`
            SELECT * FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
          `;
          if (!bibleResult.rows.length) continue;
          const bible = bibleResult.rows[0] as unknown as MessagingBible;

          // Find unanalysed articles (no entry in signal_analyses for this company)
          const unanalysed = await sql`
            SELECT na.id, na.title, na.summary, na.content, na.source, na.source_url, na.category, na.tags, na.published_at, na.fetched_at
            FROM news_articles na
            WHERE NOT EXISTS (
              SELECT 1 FROM signal_analyses sa
              WHERE sa.article_id = na.id AND sa.company_id = ${companyId}
            )
            AND na.fetched_at >= NOW() - INTERVAL '24 hours'
            ORDER BY na.fetched_at DESC
            LIMIT 10
          `;

          if (unanalysed.rows.length === 0) continue;

          // Analyse each article and store the result
          const analysisPromises = unanalysed.rows.slice(0, 5).map(async (article) => {
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
            } catch (articleErr) {
              console.error(`[cron/news] Failed to analyse article ${article.id} for company ${companyId}:`, articleErr);
            }
          });

          await Promise.allSettled(analysisPromises);

          // If new signals were analysed, refresh themes
          if (signalsAnalyzed > 0) {
            try {
              const themes = await detectThemesFromSignals(companyId);
              themesRefreshed += themes.length;
              console.log(`[cron/news] Refreshed ${themes.length} themes for company ${companyId}`);
            } catch (themeErr) {
              console.error(`[cron/news] Failed to refresh themes for company ${companyId}:`, themeErr);
            }
          }
        } catch (companyErr) {
          console.error(`[cron/news] Error processing company ${companyId}:`, companyErr);
        }
      }
    } catch (analysisErr) {
      console.error('[cron/news] Signal analysis phase failed:', analysisErr);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[cron/news] Complete: ${fetched} articles fetched, ${signalsAnalyzed} signals analysed, ${themesRefreshed} themes refreshed in ${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      fetched,
      errors: errors.length,
      signalsAnalyzed,
      themesRefreshed,
      duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cron/news] Failed after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'News fetch failed', duration_ms: duration },
      { status: 500 }
    );
  }
}
