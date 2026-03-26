import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

export const maxDuration = 300;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkTierAccess(user.id, 'monthly_report');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Get the latest monthly report for this company
    const reportResult = await sql`
      SELECT * FROM intelligence_reports
      WHERE company_id = ${company.id} AND report_type = 'monthly'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (reportResult.rows[0]) {
      return NextResponse.json({ report: reportResult.rows[0] });
    }

    // No report exists — check if we should auto-generate
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Only auto-generate if there are articles to analyse
    const articleCount = await sql`
      SELECT COUNT(*) as cnt FROM news_articles
      WHERE published_at >= ${periodStart.toISOString()} AND published_at <= ${periodEnd.toISOString()}
    `;

    if (parseInt(articleCount.rows[0]?.cnt || '0') === 0) {
      return NextResponse.json({ report: null, message: 'No articles available for this period' });
    }

    return NextResponse.json({ report: null, message: 'No report generated yet for this period. Use POST to generate.' });
  } catch (error) {
    console.error('Monthly report GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gatePost = await checkTierAccess(user.id, 'monthly_report');
  if (!gatePost.allowed) return NextResponse.json(tierDeniedResponse(gatePost), { status: 403 });

  const rl = rateLimit(`report-monthly:${user.id}`, 3, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before generating another report.' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Get messaging bible for context
    const bibleResult = await sql`
      SELECT * FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const bible = bibleResult.rows[0];

    // Determine period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch articles from the period
    const articlesResult = await sql`
      SELECT id, title, summary, source, category, tags, published_at
      FROM news_articles
      WHERE published_at >= ${periodStart.toISOString()} AND published_at <= ${periodEnd.toISOString()}
      ORDER BY published_at DESC
      LIMIT 200
    `;
    const articles = articlesResult.rows;

    // Fetch generated content from the period
    const contentResult = await sql`
      SELECT id, content_type, title, compliance_status, created_at
      FROM generated_content
      WHERE company_id = ${company.id}
        AND created_at >= ${periodStart.toISOString()}
        AND created_at <= ${periodEnd.toISOString()}
      ORDER BY created_at DESC
    `;
    const contentPieces = contentResult.rows;

    // Fetch usage stats
    const usageResult = await sql`
      SELECT event_type, COUNT(*) as cnt
      FROM usage_events
      WHERE user_id = ${user.id}
        AND created_at >= ${periodStart.toISOString()}
        AND created_at <= ${periodEnd.toISOString()}
      GROUP BY event_type
    `;
    const usageStats = usageResult.rows;

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const articleSummaries = articles.map((a, i) => {
      const tags = (() => { try { return JSON.parse(a.tags || '[]'); } catch { return []; } })();
      return `${i + 1}. "${a.title}" (${a.source}, ${a.category}, tags: ${tags.join(', ')})`;
    }).join('\n');

    const contentSummaries = contentPieces.map((c) =>
      `- ${c.title} (${c.content_type}, compliance: ${c.compliance_status})`
    ).join('\n');

    const usageSummaries = usageStats.map((u) => `- ${u.event_type}: ${u.cnt}`).join('\n');

    const bibleContext = bible
      ? `Messaging pillars: ${bible.messaging_pillars || '[]'}
ICP profiles: ${bible.icp_profiles || '[]'}
Company description: ${bible.company_description || 'N/A'}`
      : 'No narrative configured.';

    const monthName = periodStart.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

    const prompt = `You are an insurance market intelligence analyst. Generate a monthly intelligence report for ${company.name} covering ${monthName}.

COMPANY CONTEXT:
${bibleContext}

ARTICLES THIS MONTH (${articles.length} total):
${articleSummaries || 'No articles found.'}

CONTENT GENERATED THIS MONTH (${contentPieces.length} pieces):
${contentSummaries || 'No content generated.'}

USAGE STATISTICS:
${usageSummaries || 'No usage data.'}

Generate the report in this exact markdown structure:

# Monthly Intelligence Report: ${monthName}

## Executive Summary
(3-4 sentences summarising the month's key themes, content output, and market direction)

## Key Market Themes This Month
(Top 5 themes identified from the articles, each with a count of relevant articles and a brief explanation)

## Content Performance Summary
(Total pieces generated, breakdown by type, average compliance score, notable pieces)

## Emerging Trends to Watch
(3 forward-looking items based on article patterns and market signals)

## Recommended Actions for Next Month
(5 specific, actionable recommendations for content and positioning)

## Appendix: Full Article List
(Numbered list of all articles with source)

Be specific, data-driven, and actionable. Use the actual article titles and data provided.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const reportContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const reportTitle = `Monthly Intelligence Report: ${monthName}`;
    const reportId = uuidv4();

    const metadata = JSON.stringify({
      article_count: articles.length,
      content_count: contentPieces.length,
      usage_stats: usageStats,
    });

    await sql`
      INSERT INTO intelligence_reports (id, company_id, report_type, period_start, period_end, title, content, metadata, created_at)
      VALUES (${reportId}, ${company.id}, 'monthly', ${periodStart.toISOString()}, ${periodEnd.toISOString()}, ${reportTitle}, ${reportContent}, ${metadata}, NOW())
    `;

    const report = {
      id: reportId,
      company_id: company.id,
      report_type: 'monthly',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      title: reportTitle,
      content: reportContent,
      metadata,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Monthly report POST error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
