import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function getQuarterBounds(date: Date): { start: Date; end: Date; label: string } {
  const quarter = Math.floor(date.getMonth() / 3);
  const year = date.getFullYear();
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 0, 23, 59, 59);
  const qLabel = `Q${quarter + 1} ${year}`;
  return { start, end, label: qLabel };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const reportResult = await sql`
      SELECT * FROM intelligence_reports
      WHERE company_id = ${company.id} AND report_type = 'quarterly'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (reportResult.rows[0]) {
      return NextResponse.json({ report: reportResult.rows[0] });
    }

    return NextResponse.json({ report: null, message: 'No quarterly review generated yet. Use POST to generate.' });
  } catch (error) {
    console.error('Quarterly report GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`report-quarterly:${user.id}`, 2, 600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before generating another review.' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const bibleResult = await sql`
      SELECT * FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const bible = bibleResult.rows[0];

    const { start: periodStart, end: periodEnd, label: quarterLabel } = getQuarterBounds(new Date());

    // Fetch articles for the quarter
    const articlesResult = await sql`
      SELECT id, title, summary, source, category, tags, published_at
      FROM news_articles
      WHERE published_at >= ${periodStart.toISOString()} AND published_at <= ${periodEnd.toISOString()}
      ORDER BY published_at DESC
      LIMIT 500
    `;
    const articles = articlesResult.rows;

    // Fetch generated content for the quarter
    const contentResult = await sql`
      SELECT id, content_type, title, content, compliance_status, created_at
      FROM generated_content
      WHERE company_id = ${company.id}
        AND created_at >= ${periodStart.toISOString()}
        AND created_at <= ${periodEnd.toISOString()}
      ORDER BY created_at DESC
    `;
    const contentPieces = contentResult.rows;

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const articleCategories: Record<string, number> = {};
    for (const a of articles) {
      const cat = a.category || 'uncategorised';
      articleCategories[cat] = (articleCategories[cat] || 0) + 1;
    }

    const contentByType: Record<string, number> = {};
    const complianceBreakdown: Record<string, number> = {};
    for (const c of contentPieces) {
      contentByType[c.content_type] = (contentByType[c.content_type] || 0) + 1;
      complianceBreakdown[c.compliance_status] = (complianceBreakdown[c.compliance_status] || 0) + 1;
    }

    const bibleContext = bible
      ? `Company description: ${bible.company_description || 'N/A'}
Messaging pillars: ${bible.messaging_pillars || '[]'}
ICP profiles: ${bible.icp_profiles || '[]'}
Competitors: ${bible.competitors || '[]'}
Differentiators: ${bible.differentiators || '[]'}
Target audiences: ${bible.target_audiences || '[]'}
Elevator pitch: ${bible.elevator_pitch || 'N/A'}`
      : 'No messaging bible configured.';

    const prompt = `You are a strategic positioning consultant for insurance and financial services companies. Generate a quarterly positioning review for ${company.name} covering ${quarterLabel}.

COMPANY & MESSAGING BIBLE:
${bibleContext}

MARKET DATA (${articles.length} articles this quarter):
Category breakdown: ${JSON.stringify(articleCategories)}
Key article titles (sample of up to 20):
${articles.slice(0, 20).map((a, i) => `${i + 1}. "${a.title}" (${a.source}, ${a.category})`).join('\n')}

CONTENT OUTPUT (${contentPieces.length} pieces this quarter):
Type breakdown: ${JSON.stringify(contentByType)}
Compliance breakdown: ${JSON.stringify(complianceBreakdown)}
Content titles (sample):
${contentPieces.slice(0, 15).map((c) => `- "${c.title}" (${c.content_type})`).join('\n') || 'No content generated.'}

Generate the review in this exact markdown structure:

# Quarterly Positioning Review: ${quarterLabel}

## Positioning Health Score
(Score from 1-10 with a breakdown across: messaging consistency, audience reach, competitive differentiation, market responsiveness, compliance adherence. Format as a table.)

## Messaging Pillar Alignment
(Analyse how the content generated maps to the stated messaging pillars. Identify pillars that are well-covered and those that are underrepresented.)

## ICP Coverage
(Which target audiences/ICPs received content this quarter? Which were neglected? Provide specific recommendations.)

## Market Shifts
(Based on the news articles, identify 3-5 key market shifts that may affect the company's positioning. Be specific about implications.)

## Competitor Landscape Update
(Based on available data, provide insights on competitor activity and share of voice. Note any significant competitor moves.)

## Recommended Bible Updates
(Provide 3-5 specific suggestions for updating the messaging bible based on the quarter's data. Be concrete and actionable.)

Be strategic, specific, and data-driven. Reference actual content and articles where relevant.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const reportContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const reportTitle = `Quarterly Positioning Review: ${quarterLabel}`;
    const reportId = uuidv4();

    const metadata = JSON.stringify({
      article_count: articles.length,
      content_count: contentPieces.length,
      article_categories: articleCategories,
      content_by_type: contentByType,
      compliance_breakdown: complianceBreakdown,
    });

    await sql`
      INSERT INTO intelligence_reports (id, company_id, report_type, period_start, period_end, title, content, metadata, created_at)
      VALUES (${reportId}, ${company.id}, 'quarterly', ${periodStart.toISOString()}, ${periodEnd.toISOString()}, ${reportTitle}, ${reportContent}, ${metadata}, NOW())
    `;

    const report = {
      id: reportId,
      company_id: company.id,
      report_type: 'quarterly',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      title: reportTitle,
      content: reportContent,
      metadata,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Quarterly report POST error:', error);
    return NextResponse.json({ error: 'Failed to generate review' }, { status: 500 });
  }
}
