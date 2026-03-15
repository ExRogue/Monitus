import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, sanitizeString, safeParseJson } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const VALID_FORMATS = ['client_briefing', 'board_pack', 'team_update', 'regulatory_alert', 'meeting_briefing'] as const;
type BriefingFormat = typeof VALID_FORMATS[number];

const FORMAT_LABELS: Record<BriefingFormat, string> = {
  client_briefing: 'Client Briefing',
  board_pack: 'Board Pack Summary',
  team_update: 'Team Update',
  regulatory_alert: 'Regulatory Alert',
  meeting_briefing: 'Meeting Briefing',
};

const FORMAT_INSTRUCTIONS: Record<BriefingFormat, string> = {
  client_briefing: `Format as an external-facing client briefing. Tone should be professional, polished, and authoritative. Structure:
1. Key Headlines (bullet points of the most important developments)
2. Market Impact Assessment (how each article affects the client's interests)
3. Our Perspective (the company's expert viewpoint on these developments)
4. Recommended Actions (what the client should consider doing)
5. Looking Ahead (what to watch for in the coming weeks)`,

  board_pack: `Format as an internal board pack summary. Tone should be strategic and concise. Structure:
1. Executive Summary (3 sentences max)
2. Key Developments (each with strategic significance rated High/Medium/Low)
3. Competitive Implications (how these developments affect our market position)
4. Risk & Opportunity Matrix (table format)
5. Strategic Recommendations (numbered, actionable items for board consideration)`,

  team_update: `Format as an internal team update. Tone should be informative and operational. Structure:
1. This Week's Headlines (quick-scan bullet points)
2. What This Means for Us (practical implications for each team)
3. Action Items (specific tasks with suggested owners)
4. Client Talking Points (key messages for client-facing conversations)
5. Further Reading (links/references for deeper context)`,

  regulatory_alert: `Format as a compliance-focused regulatory alert. Tone should be precise and authoritative. Structure:
1. Alert Summary (what happened, when, and who is affected)
2. Regulatory Details (specific rules, deadlines, and requirements)
3. Impact Assessment (direct and indirect impacts on our business and clients)
4. Compliance Actions Required (specific steps with deadlines)
5. FAQ (anticipated questions from stakeholders with answers)`,

  meeting_briefing: `Format as a meeting preparation briefing. Tone should be strategic and conversational — designed to make the reader sound informed and insightful. Structure:
1. Executive Summary (3-4 bullet points on the most important market developments relevant to this meeting)
2. Market Developments (key news items with context for how they relate to the meeting agenda and counterpart's interests)
3. Competitive Landscape (relevant competitor activity or market positioning that may come up in discussion)
4. Our Position (talking points that demonstrate expertise and align with company messaging)
5. Conversation Starters (2-3 natural openers referencing recent developments that show you're plugged in)`,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkTierAccess(user.id, 'briefing_builder');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Return saved briefings (stored as intelligence_reports with type 'briefing')
    const briefingsResult = await sql`
      SELECT id, title, content, metadata, created_at
      FROM intelligence_reports
      WHERE company_id = ${company.id} AND report_type = 'briefing'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ briefings: briefingsResult.rows });
  } catch (error) {
    console.error('Briefing GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch briefings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkTierAccess(user.id, 'briefing_builder');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  const rl = rateLimit(`briefing:${user.id}`, 5, 120_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const { articleIds, format, notes, meetingContext } = body;

    if (!Array.isArray(articleIds) || articleIds.length === 0 || articleIds.length > 30) {
      return NextResponse.json({ error: 'Select between 1 and 30 articles' }, { status: 400 });
    }

    if (!format || !VALID_FORMATS.includes(format as BriefingFormat)) {
      return NextResponse.json({ error: `Invalid briefing format. Valid formats: ${VALID_FORMATS.join(', ')}` }, { status: 400 });
    }

    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Get messaging bible for tone
    const bibleResult = await sql`
      SELECT * FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const bible = bibleResult.rows[0];

    // Fetch selected articles — validate IDs as UUIDs and use parameterized query
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeIds = articleIds
      .map((id: unknown) => String(id).trim())
      .filter((id: string) => uuidRegex.test(id));

    if (safeIds.length === 0) {
      return NextResponse.json({ error: 'No valid article IDs provided' }, { status: 400 });
    }

    const articlesResult = await sql`
      SELECT id, title, summary, content, source, category, tags, published_at
      FROM news_articles
      WHERE id = ANY(${safeIds}::text[])
      ORDER BY published_at DESC
    `;
    const articles = articlesResult.rows;

    if (articles.length === 0) {
      return NextResponse.json({ error: 'No valid articles found' }, { status: 400 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // Parse per-article notes if provided
    const articleNotes: Record<string, string> = {};
    if (notes && typeof notes === 'object') {
      for (const [artId, note] of Object.entries(notes)) {
        if (typeof note === 'string' && note.trim()) {
          articleNotes[artId] = sanitizeString(note, 500);
        }
      }
    }

    const articleContext = articles.map((a, i) => {
      const tags = (() => { try { return JSON.parse(a.tags || '[]'); } catch { return []; } })();
      const noteStr = articleNotes[a.id] ? `\nAnalyst notes: ${articleNotes[a.id]}` : '';
      return `Article ${i + 1}: "${a.title}"
Source: ${a.source} | Category: ${a.category} | Tags: ${tags.join(', ')}
Published: ${new Date(a.published_at).toLocaleDateString('en-GB')}
Summary: ${a.summary || a.content?.slice(0, 300) || 'No summary available.'}${noteStr}`;
    }).join('\n\n');

    const bibleContext = bible
      ? `Brand voice: ${bible.brand_voice_guide || 'Professional'}
Messaging pillars: ${bible.messaging_pillars || '[]'}
Company description: ${bible.company_description || company.description || 'N/A'}`
      : `Company: ${company.name}\nDescription: ${company.description || 'N/A'}`;

    const formatLabel = FORMAT_LABELS[format as BriefingFormat];
    const formatInstructions = FORMAT_INSTRUCTIONS[format as BriefingFormat];

    // Build meeting context block if applicable
    let meetingBlock = '';
    if (format === 'meeting_briefing' && meetingContext && typeof meetingContext === 'object') {
      const mc = meetingContext as { meetingWith?: string; meetingRole?: string; meetingType?: string; agendaTopics?: string; meetingDate?: string };
      meetingBlock = `\n\nMEETING CONTEXT:
Meeting with: ${sanitizeString(mc.meetingWith || 'Not specified', 200)}
Their role: ${sanitizeString(mc.meetingRole || 'Not specified', 200)}
Meeting type: ${sanitizeString(mc.meetingType || 'General', 100)}
Date: ${sanitizeString(mc.meetingDate || 'Not specified', 50)}
Agenda / topics: ${sanitizeString(mc.agendaTopics || 'General discussion', 500)}

Tailor ALL sections to this specific meeting. Conversation starters should feel natural for a ${sanitizeString(mc.meetingType || 'general', 100)} with someone in the role of ${sanitizeString(mc.meetingRole || 'a senior executive', 200)}. Talking points should be relevant to what ${sanitizeString(mc.meetingWith || 'the counterpart', 200)} cares about.`;
    }

    const prompt = `You are an expert insurance communications professional preparing a ${formatLabel} for ${company.name}.

COMPANY CONTEXT:
${bibleContext}${meetingBlock}

SELECTED ARTICLES (${articles.length}):
${articleContext}

FORMAT: ${formatLabel}
${formatInstructions}

Generate the briefing as clean markdown. Title it "# ${formatLabel}: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}".

Be specific, reference the actual articles by name, and provide genuine insight rather than generic commentary.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const briefingContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const briefingTitle = `${formatLabel}: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const briefingId = uuidv4();
    const now = new Date();

    const metadata = JSON.stringify({
      format,
      format_label: formatLabel,
      article_count: articles.length,
      article_ids: safeIds,
      ...(format === 'meeting_briefing' && meetingContext ? { meeting_context: meetingContext } : {}),
    });

    await sql`
      INSERT INTO intelligence_reports (id, company_id, report_type, period_start, period_end, title, content, metadata, created_at)
      VALUES (${briefingId}, ${company.id}, 'briefing', ${now.toISOString()}, ${now.toISOString()}, ${briefingTitle}, ${briefingContent}, ${metadata}, NOW())
    `;

    return NextResponse.json({
      briefing: {
        id: briefingId,
        title: briefingTitle,
        content: briefingContent,
        format,
        metadata,
        created_at: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Briefing POST error:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}
