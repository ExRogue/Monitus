import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 300;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

async function generateMonthlyReport(
  companyId: string,
  companyName: string,
  narrativeContext: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ title: string; content: string; metadata: Record<string, unknown> } | null> {
  if (!anthropic) return null;

  // Gather monthly stats
  const signalStats = await sql`
    SELECT
      COUNT(*) as total_signals,
      COUNT(*) FILTER (WHERE usefulness_score >= 8) as high_score_signals,
      COUNT(*) FILTER (WHERE recommended_action = 'act_now') as act_now_count,
      AVG(usefulness_score) as avg_usefulness
    FROM signal_analyses
    WHERE company_id = ${companyId}
    AND created_at >= ${periodStart}
    AND created_at < ${periodEnd}
  `;

  const oppStats = await sql`
    SELECT
      COUNT(*) as total_opportunities,
      COUNT(*) FILTER (WHERE urgency_score >= 8) as urgent_opportunities,
      AVG(opportunity_score) as avg_opportunity_score
    FROM opportunities
    WHERE company_id = ${companyId}
    AND created_at >= ${periodStart}
    AND created_at < ${periodEnd}
  `;

  const themeStats = await sql`
    SELECT name, classification, score, momentum_30d, recommended_action
    FROM themes
    WHERE company_id = ${companyId}
    ORDER BY score DESC
    LIMIT 10
  `;

  const contentStats = await sql`
    SELECT
      COUNT(*) as total_content,
      COUNT(*) FILTER (WHERE status = 'published') as published_count
    FROM generated_content
    WHERE company_id = ${companyId}
    AND created_at >= ${periodStart}
    AND created_at < ${periodEnd}
  `;

  // Top signals of the month
  const topSignals = await sql`
    SELECT sa.usefulness_score, sa.why_it_matters, sa.recommended_action,
           na.title, na.source
    FROM signal_analyses sa
    INNER JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    AND sa.created_at >= ${periodStart}
    AND sa.created_at < ${periodEnd}
    ORDER BY sa.usefulness_score DESC NULLS LAST
    LIMIT 10
  `;

  const competitorMentions = await sql`
    SELECT competitor_name, COUNT(*) as mention_count,
           MODE() WITHIN GROUP (ORDER BY sentiment) as dominant_sentiment
    FROM competitive_mentions
    WHERE company_id = ${companyId}
    AND created_at >= ${periodStart}
    AND created_at < ${periodEnd}
    GROUP BY competitor_name
    ORDER BY mention_count DESC
    LIMIT 5
  `;

  const stats = signalStats.rows[0] || {};
  const opps = oppStats.rows[0] || {};
  const content = contentStats.rows[0] || {};

  const signalsSummary = topSignals.rows.map((s, i) =>
    `${i + 1}. "${s.title}" (${s.source}, score: ${s.usefulness_score}/10) — ${s.why_it_matters}`
  ).join('\n');

  const themesSummary = themeStats.rows.map(t =>
    `- ${t.name} (${t.classification}, score: ${t.score}, 30d momentum: ${t.momentum_30d})`
  ).join('\n');

  const competitorSummary = competitorMentions.rows.map(c =>
    `- ${c.competitor_name}: ${c.mention_count} mentions (${c.dominant_sentiment} sentiment)`
  ).join('\n');

  const monthName = new Date(periodStart).toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const prompt = `You are a senior market intelligence strategist creating a monthly intelligence report for an insurance/insurtech company.

COMPANY: ${companyName}
PERIOD: ${monthName}

COMPANY CONTEXT:
${narrativeContext}

MONTHLY STATISTICS:
- Signals analysed: ${stats.total_signals || 0}
- High-scoring signals (8+): ${stats.high_score_signals || 0}
- Act-now signals: ${stats.act_now_count || 0}
- Average usefulness score: ${Number(stats.avg_usefulness || 0).toFixed(1)}/10
- Opportunities generated: ${opps.total_opportunities || 0}
- Urgent opportunities: ${opps.urgent_opportunities || 0}
- Average opportunity score: ${Number(opps.avg_opportunity_score || 0).toFixed(1)}/10
- Content pieces generated: ${content.total_content || 0}
- Content published: ${content.published_count || 0}

TOP 10 SIGNALS:
${signalsSummary || 'No signals analysed this month.'}

ACTIVE THEMES:
${themesSummary || 'No themes detected.'}

COMPETITOR ACTIVITY:
${competitorSummary || 'No competitor mentions tracked.'}

Generate a comprehensive monthly intelligence report. Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:

- title: string, a compelling report title for ${monthName} (e.g. "March 2026 Intelligence Report: [key theme]")
- executive_summary: string, 2-3 paragraph executive summary of the month's intelligence landscape
- key_developments: array of 3-5 strings, each a 1-2 sentence description of a key market development
- theme_analysis: string, 2-3 paragraphs analysing how themes evolved during the month
- competitive_landscape: string, 1-2 paragraphs on competitive positioning and movements
- content_performance: string, 1 paragraph summarising content generation and opportunities acted on
- recommendations: array of 3-5 strings, each a specific, actionable recommendation for next month
- risks_to_watch: array of 2-3 strings, each a risk or threat to monitor

Be specific, data-driven, and strategic. Reference actual signals, themes, and numbers.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Assemble full report content
    const fullContent = [
      `# ${parsed.title || `${monthName} Intelligence Report`}`,
      '',
      '## Executive Summary',
      parsed.executive_summary || '',
      '',
      '## Key Developments',
      ...(Array.isArray(parsed.key_developments) ? parsed.key_developments.map((d: string, i: number) => `${i + 1}. ${d}`) : []),
      '',
      '## Theme Analysis',
      parsed.theme_analysis || '',
      '',
      '## Competitive Landscape',
      parsed.competitive_landscape || '',
      '',
      '## Content Performance',
      parsed.content_performance || '',
      '',
      '## Recommendations for Next Month',
      ...(Array.isArray(parsed.recommendations) ? parsed.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`) : []),
      '',
      '## Risks to Watch',
      ...(Array.isArray(parsed.risks_to_watch) ? parsed.risks_to_watch.map((r: string) => `- ${r}`) : []),
    ].join('\n');

    return {
      title: String(parsed.title || `${monthName} Intelligence Report`),
      content: fullContent,
      metadata: {
        total_signals: Number(stats.total_signals || 0),
        high_score_signals: Number(stats.high_score_signals || 0),
        total_opportunities: Number(opps.total_opportunities || 0),
        total_content: Number(content.total_content || 0),
        key_developments: parsed.key_developments || [],
        recommendations: parsed.recommendations || [],
        risks_to_watch: parsed.risks_to_watch || [],
      },
    };
  } catch (error) {
    console.error(`[monthly-report] Failed to generate report for company ${companyId}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let usersProcessed = 0;
  let reportsGenerated = 0;

  try {
    await getDb();

    // Calculate period: previous full calendar month
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1); // 1st of previous month

    const periodStartStr = periodStart.toISOString();
    const periodEndStr = periodEnd.toISOString();

    // Find all active users with a completed narrative
    const usersResult = await sql`
      SELECT DISTINCT u.id, u.email, u.name, c.id as company_id, c.name as company_name,
             mb.elevator_pitch, mb.company_description, mb.messaging_pillars, mb.icp_profiles, mb.competitors
      FROM users u
      INNER JOIN companies c ON c.user_id = u.id
      INNER JOIN messaging_bibles mb ON mb.company_id = c.id
      WHERE mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10
    `;

    for (const user of usersResult.rows) {
      usersProcessed++;
      const companyId = user.company_id as string;
      const companyName = user.company_name as string;

      try {
        // Build narrative context
        const narrativeContext = [
          user.elevator_pitch && `Elevator pitch: ${user.elevator_pitch}`,
          user.company_description && `Company: ${user.company_description}`,
          user.messaging_pillars && `Messaging pillars: ${user.messaging_pillars}`,
          user.icp_profiles && `Target buyers: ${user.icp_profiles}`,
          user.competitors && `Competitors: ${user.competitors}`,
        ].filter(Boolean).join('\n');

        const report = await generateMonthlyReport(
          companyId,
          companyName,
          narrativeContext,
          periodStartStr,
          periodEndStr,
        );

        if (!report) {
          console.log(`[cron/monthly-report] Skipped company ${companyId}: generation failed or no API key`);
          continue;
        }

        // Store in intelligence_reports table
        const id = uuidv4();
        await sql`
          INSERT INTO intelligence_reports (
            id, company_id, report_type, period_start, period_end,
            title, content, metadata
          ) VALUES (
            ${id}, ${companyId}, 'monthly', ${periodStartStr}, ${periodEndStr},
            ${report.title}, ${report.content}, ${JSON.stringify(report.metadata)}
          )
        `;
        reportsGenerated++;

        console.log(`[cron/monthly-report] Generated monthly report for company ${companyId}: "${report.title}"`);
      } catch (userErr) {
        console.error(`[cron/monthly-report] Error processing user ${user.id}:`, userErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[cron/monthly-report] Complete: ${usersProcessed} users, ${reportsGenerated} reports generated in ${duration}ms`);

    return NextResponse.json({
      success: true,
      usersProcessed,
      reportsGenerated,
      period: {
        start: periodStartStr,
        end: periodEndStr,
      },
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cron/monthly-report] Fatal error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Monthly report generation failed', duration_ms: duration },
      { status: 500 }
    );
  }
}
