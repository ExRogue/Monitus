import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

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

    // Get the latest weekly report for this company (less than 7 days old)
    const reportResult = await sql`
      SELECT * FROM intelligence_reports
      WHERE company_id = ${company.id} AND report_type = 'weekly'
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (reportResult.rows[0]) {
      return NextResponse.json({ report: reportResult.rows[0] });
    }

    // Check if articles exist for the last 7 days
    const articleCount = await sql`
      SELECT COUNT(*) as cnt FROM news_articles
      WHERE published_at >= NOW() - INTERVAL '7 days'
    `;

    if (parseInt(articleCount.rows[0]?.cnt || '0') === 0) {
      return NextResponse.json({ report: null, message: 'No articles available for this week' });
    }

    return NextResponse.json({ report: null, canGenerate: true, message: 'Weekly Priority View available. Use POST to generate.' });
  } catch (error) {
    console.error('Weekly report GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Weekly Priority View is available on Growth tier and above
  const gate = await checkTierAccess(user.id, 'monthly_report');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  const rl = rateLimit(`report-weekly:${user.id}`, 5, 86400_000); // 5 per day
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Weekly report limit reached. Try again tomorrow.' }, { status: 429 });
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

    // Fetch articles from the last 7 days
    const articlesResult = await sql`
      SELECT id, title, summary, source, category, tags, published_at
      FROM news_articles
      WHERE published_at >= NOW() - INTERVAL '7 days'
      ORDER BY published_at DESC
      LIMIT 50
    `;
    const articles = articlesResult.rows;

    if (articles.length === 0) {
      return NextResponse.json({ error: 'No articles available for this week' }, { status: 400 });
    }

    // Fetch generated content from the last 7 days
    const contentResult = await sql`
      SELECT id, content_type, title, compliance_status, created_at
      FROM generated_content
      WHERE company_id = ${company.id}
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
    `;
    const contentPieces = contentResult.rows;

    // Fetch competitor data if available
    const competitorResult = await sql`
      SELECT competitors FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const competitors = competitorResult.rows[0]?.competitors || '[]';

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const articleSummaries = articles.map((a, i) => {
      const tags = (() => { try { return JSON.parse(a.tags || '[]'); } catch { return []; } })();
      return `${i + 1}. "${a.title}" (${a.source}, tags: ${tags.join(', ')})`;
    }).join('\n');

    const contentSummaries = contentPieces.length > 0
      ? contentPieces.map((c) => `- ${c.title} (${c.content_type})`).join('\n')
      : 'No content generated this week.';

    const bibleContext = bible
      ? `Company: ${company.name}
Niche: ${company.niche || 'insurance technology'}
Description: ${bible.company_description || company.description || 'N/A'}
Messaging pillars: ${bible.messaging_pillars || '[]'}
Target audiences: ${bible.target_audiences || '[]'}
Competitors: ${competitors}
Differentiators: ${bible.differentiators || '[]'}`
      : `Company: ${company.name}\nNiche: ${company.niche || 'insurance technology'}`;

    const prompt = `You are a sharp insurance market analyst producing a Weekly Priority View for ${company.name}.

Your job is not to summarise news. Your job is to tell the company what matters, what to act on, and what to ignore.

COMPANY CONTEXT:
${bibleContext}

ARTICLES THIS WEEK (${articles.length} total):
${articleSummaries}

CONTENT PRODUCED THIS WEEK:
${contentSummaries}

Produce the Weekly Priority View as JSON with this exact structure. Be specific, direct, and commercially relevant. No filler. No pleasantries. British English. No em-dashes.

{
  "weekEnding": "YYYY-MM-DD",
  "themes": [
    {
      "name": "string -- concise theme name",
      "relevance": "high|medium",
      "summary": "string -- 1-2 sentences on why this matters to the company's buyers",
      "articleCount": number,
      "action": "respond|monitor|ignore"
    }
  ],
  "angles": [
    {
      "title": "string -- the angle the company should own",
      "hook": "string -- the opening line or contrarian take",
      "format": "linkedin|email|trade_media|briefing",
      "urgency": "this_week|next_week|ongoing"
    }
  ],
  "competitorMove": {
    "competitor": "string -- name or 'None observed'",
    "observation": "string -- what they did or said",
    "implication": "string -- what this means for the company"
  },
  "contentMix": {
    "recommendation": "string -- what to publish this week and why",
    "linkedin": number,
    "email": number,
    "tradMedia": number
  },
  "ignore": {
    "topic": "string -- one thing that looks important but is not worth acting on",
    "reason": "string -- why"
  },
  "narrativeNote": "string -- one observation about how the company's positioning should evolve based on this week's signals, or null if no change needed"
}

Return ONLY valid JSON. No markdown. No code fences. No explanation.
Top 3 themes maximum. Top 2 angles maximum. Be ruthlessly selective.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : '{}';

    // Parse the JSON response
    let weeklyData;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      weeklyData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse weekly report JSON:', rawContent.substring(0, 200));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Store as intelligence report
    const reportId = uuidv4();
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const reportTitle = `Weekly Priority View: ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    const metadata = JSON.stringify({
      article_count: articles.length,
      content_count: contentPieces.length,
      weekly_data: weeklyData,
    });

    await sql`
      INSERT INTO intelligence_reports (id, company_id, report_type, period_start, period_end, title, content, metadata, created_at)
      VALUES (${reportId}, ${company.id}, 'weekly', ${weekStart.toISOString()}, ${now.toISOString()}, ${reportTitle}, ${JSON.stringify(weeklyData)}, ${metadata}, NOW())
    `;

    return NextResponse.json({
      report: {
        id: reportId,
        company_id: company.id,
        report_type: 'weekly',
        title: reportTitle,
        content: JSON.stringify(weeklyData),
        metadata,
        created_at: now.toISOString(),
      },
      weeklyData,
    });
  } catch (error) {
    console.error('Weekly report POST error:', error);
    return NextResponse.json({ error: 'Failed to generate weekly report' }, { status: 500 });
  }
}
