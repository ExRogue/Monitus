import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

export const maxDuration = 60;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Check if a narrative exists
    const bibleResult = await sql`
      SELECT id FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    if (!bibleResult.rows.length) {
      return NextResponse.json({ report: null, needsNarrative: true });
    }

    // Get latest weekly priority view for this week (less than 7 days old)
    const weeklyResult = await sql`
      SELECT * FROM weekly_priority_views
      WHERE company_id = ${company.id}
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (weeklyResult.rows[0]) {
      const row = weeklyResult.rows[0];
      return NextResponse.json({
        report: {
          id: row.id,
          top_themes: row.top_themes,
          recommended_angles: row.recommended_angles,
          competitor_move: row.competitor_move,
          content_mix: row.content_mix,
          thing_to_ignore: row.thing_to_ignore,
          full_content: row.full_content,
          week_start: row.week_start,
          created_at: row.created_at,
        },
      });
    }

    // Check if signal analyses exist for the last 7 days
    const signalCount = await sql`
      SELECT COUNT(*) as cnt FROM signal_analyses
      WHERE company_id = ${company.id}
        AND created_at >= NOW() - INTERVAL '7 days'
    `;

    const hasSignals = parseInt(signalCount.rows[0]?.cnt || '0') > 0;

    return NextResponse.json({
      report: null,
      canGenerate: hasSignals,
      message: hasSignals
        ? 'Weekly Priority View available. Click Generate to create it from your analyzed signals.'
        : 'No analyzed signals this week. Go to Signals and analyze recent articles first.',
    });
  } catch (error) {
    console.error('Weekly report GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkTierAccess(user.id, 'monthly_report');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  const rl = rateLimit(`report-weekly:${user.id}`, 5, 86400_000);
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

    // Get messaging bible
    const bibleResult = await sql`
      SELECT * FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const bible = bibleResult.rows[0];
    if (!bible) {
      return NextResponse.json({ error: 'No narrative found. Complete your Narrative first.' }, { status: 400 });
    }

    // Fetch this week's signal analyses with article data
    const signalsResult = await sql`
      SELECT sa.*, na.title as article_title, na.summary as article_summary, na.source as article_source, na.category as article_category
      FROM signal_analyses sa
      JOIN news_articles na ON na.id = sa.article_id
      WHERE sa.company_id = ${company.id}
        AND sa.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY (sa.narrative_fit * 2 + sa.urgency) DESC
      LIMIT 30
    `;
    const signals = signalsResult.rows;

    if (signals.length === 0) {
      // Fallback: try to use raw articles if no signals analyzed yet
      const articlesResult = await sql`
        SELECT id, title, summary, source, category, tags, published_at
        FROM news_articles
        WHERE published_at >= NOW() - INTERVAL '7 days'
        ORDER BY published_at DESC
        LIMIT 20
      `;

      if (articlesResult.rows.length === 0) {
        return NextResponse.json({ error: 'No signals or articles available this week. Refresh your feeds and analyze signals first.' }, { status: 400 });
      }

      // Use raw articles as fallback context (less rich, but functional)
      return await generateFromRawArticles(articlesResult.rows, company, bible);
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // Build signal context for Claude
    const signalContext = signals.map((s, i) => {
      const themes = (() => { try { return JSON.parse(s.themes || '[]'); } catch { return []; } })();
      return `Signal ${i + 1}: "${s.article_title}"
Source: ${s.article_source} | Category: ${s.article_category}
Narrative fit: ${s.narrative_fit}/100 | Urgency: ${s.urgency}/100 | Action: ${s.recommended_action}
Why it matters: ${s.why_it_matters}
Why buyers care: ${s.why_it_matters_to_buyers}
Competitor context: ${s.competitor_context || 'None'}
Themes: ${themes.join(', ')}`;
    }).join('\n\n');

    // Build narrative context
    const narrativeContext = buildNarrativeContext(company, bible);

    const prompt = `You are a sharp market intelligence analyst producing a Weekly Priority View for ${company.name}.

Your job is NOT to summarise news. Your job is to tell the company what matters, what to act on, and what to ignore -- based on signals that have already been scored for relevance.

COMPANY CONTEXT:
${narrativeContext}

THIS WEEK'S ANALYZED SIGNALS (${signals.length} total, sorted by relevance):
${signalContext}

Using ONLY the real signals above, produce a Weekly Priority View as JSON with this exact structure. Be specific, direct, and commercially relevant. No filler. No pleasantries. British English. No em-dashes.

{
  "top_themes": [
    {
      "name": "string -- concise theme name derived from actual signal themes",
      "reason": "string -- 1-2 sentences on why this matters this week, referencing specific signals"
    }
  ],
  "recommended_angles": [
    {
      "angle": "string -- a specific content angle the company should own this week",
      "format": "string -- e.g. 'LinkedIn post', 'Email commentary', 'Trade media pitch', 'LinkedIn post + email'"
    }
  ],
  "competitor_move": "string -- synthesise competitor context from the signals. If no competitor activity was observed, say so honestly. Reference specific competitors by name if mentioned in signals.",
  "content_mix": ["string -- e.g. '2x LinkedIn posts'", "1x email commentary"],
  "thing_to_ignore": "string -- one topic from the signals that looks important but is NOT worth acting on for this company, with a clear reason why",
  "narrative_note": "string or null -- one observation about how the company's positioning should evolve based on this week's signals, or null if no change needed"
}

Rules:
- Top 3 themes maximum, drawn from the actual signal themes and analysis
- Top 2 angles maximum, grounded in real signals not generic advice
- Be ruthlessly selective -- only reference what actually appeared in the signals
- Content mix should be a practical recommendation for the week
- The "thing to ignore" must reference something that actually appeared in the signals

Return ONLY valid JSON. No markdown. No code fences.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : '{}';

    let weeklyData;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      weeklyData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse weekly report JSON:', rawContent.substring(0, 200));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Store in weekly_priority_views table
    const viewId = uuidv4();
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const topThemes = JSON.stringify(weeklyData.top_themes || []);
    const recommendedAngles = JSON.stringify(weeklyData.recommended_angles || []);
    const competitorMove = weeklyData.competitor_move || '';
    const contentMix = JSON.stringify(weeklyData.content_mix || []);
    const thingToIgnore = weeklyData.thing_to_ignore || '';
    const fullContent = JSON.stringify(weeklyData);

    await sql`
      INSERT INTO weekly_priority_views (id, company_id, week_start, week_end, top_themes, recommended_angles, competitor_move, content_mix, thing_to_ignore, full_content, created_at)
      VALUES (${viewId}, ${company.id}, ${weekStart.toISOString()}, ${now.toISOString()}, ${topThemes}, ${recommendedAngles}, ${competitorMove}, ${contentMix}, ${thingToIgnore}, ${fullContent}, NOW())
    `;

    return NextResponse.json({
      report: {
        id: viewId,
        top_themes: topThemes,
        recommended_angles: recommendedAngles,
        competitor_move: competitorMove,
        content_mix: contentMix,
        thing_to_ignore: thingToIgnore,
        full_content: fullContent,
        week_start: weekStart.toISOString(),
        created_at: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Weekly report POST error:', error);
    return NextResponse.json({ error: 'Failed to generate weekly report' }, { status: 500 });
  }
}

function buildNarrativeContext(company: any, bible: any): string {
  const parts: string[] = [];
  parts.push(`Company: ${company.name}`);
  parts.push(`Niche: ${company.niche || 'insurance technology'}`);
  if (bible.company_description || company.description) {
    parts.push(`Description: ${bible.company_description || company.description}`);
  }
  if (bible.elevator_pitch) {
    parts.push(`Elevator pitch: ${bible.elevator_pitch}`);
  }
  if (bible.messaging_pillars) {
    parts.push(`Messaging pillars: ${bible.messaging_pillars}`);
  }
  if (bible.target_audiences) {
    parts.push(`Target audiences: ${bible.target_audiences}`);
  }
  if (bible.competitors) {
    parts.push(`Competitors: ${bible.competitors}`);
  }
  if (bible.differentiators) {
    parts.push(`Differentiators: ${bible.differentiators}`);
  }
  return parts.join('\n');
}

async function generateFromRawArticles(articles: any[], company: any, bible: any) {
  if (!anthropic) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const narrativeContext = buildNarrativeContext(company, bible);
  const articleSummaries = articles.map((a: any, i: number) => {
    const tags = (() => { try { return JSON.parse(a.tags || '[]'); } catch { return []; } })();
    return `${i + 1}. "${a.title}" (${a.source}, category: ${a.category}, tags: ${tags.join(', ')})
   Summary: ${a.summary || 'No summary'}`;
  }).join('\n');

  const prompt = `You are a sharp market intelligence analyst producing a Weekly Priority View for ${company.name}.

Note: These articles have NOT been scored for relevance yet. Use your best judgement to assess fit.

COMPANY CONTEXT:
${narrativeContext}

ARTICLES THIS WEEK (${articles.length}):
${articleSummaries}

Produce a Weekly Priority View as JSON. Top 3 themes max. Top 2 angles max. British English. No em-dashes.

{
  "top_themes": [{ "name": "string", "reason": "string" }],
  "recommended_angles": [{ "angle": "string", "format": "string" }],
  "competitor_move": "string",
  "content_mix": ["string"],
  "thing_to_ignore": "string",
  "narrative_note": "string or null"
}

Return ONLY valid JSON. No markdown. No code fences.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawContent = response.content[0].type === 'text' ? response.content[0].text : '{}';

  let weeklyData;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    weeklyData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  const viewId = uuidv4();
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const topThemes = JSON.stringify(weeklyData.top_themes || []);
  const recommendedAngles = JSON.stringify(weeklyData.recommended_angles || []);
  const competitorMove = weeklyData.competitor_move || '';
  const contentMix = JSON.stringify(weeklyData.content_mix || []);
  const thingToIgnore = weeklyData.thing_to_ignore || '';
  const fullContent = JSON.stringify(weeklyData);

  await sql`
    INSERT INTO weekly_priority_views (id, company_id, week_start, week_end, top_themes, recommended_angles, competitor_move, content_mix, thing_to_ignore, full_content, created_at)
    VALUES (${viewId}, ${company.id}, ${weekStart.toISOString()}, ${now.toISOString()}, ${topThemes}, ${recommendedAngles}, ${competitorMove}, ${contentMix}, ${thingToIgnore}, ${fullContent}, NOW())
  `;

  return NextResponse.json({
    report: {
      id: viewId,
      top_themes: topThemes,
      recommended_angles: recommendedAngles,
      competitor_move: competitorMove,
      content_mix: contentMix,
      thing_to_ignore: thingToIgnore,
      full_content: fullContent,
      week_start: weekStart.toISOString(),
      created_at: now.toISOString(),
    },
  });
}
