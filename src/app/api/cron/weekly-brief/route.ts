import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 300;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';
const LOOPS_DIGEST_ID = process.env.LOOPS_DIGEST_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

interface WeeklyBriefData {
  topThemes: { name: string; description: string; score: number }[];
  topAngles: { title: string; summary: string }[];
  competitorMove: string;
  contentMix: { format: string; topic: string }[];
  thingToIgnore: string;
  fullContent: string;
}

async function generateWeeklyBrief(
  companyId: string,
  companyName: string,
  narrativeContext: string,
): Promise<WeeklyBriefData | null> {
  if (!anthropic) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get signals from the last 7 days
  const signalsResult = await sql`
    SELECT sa.usefulness_score, sa.narrative_fit, sa.why_it_matters, sa.why_it_matters_to_buyers,
           sa.competitor_context, sa.themes, sa.recommended_action, sa.strongest_stakeholder,
           na.title, na.summary, na.source, na.category
    FROM signal_analyses sa
    INNER JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
    AND sa.created_at >= ${weekAgo}
    ORDER BY sa.usefulness_score DESC NULLS LAST
    LIMIT 30
  `;

  if (signalsResult.rows.length < 2) return null;

  // Get themes
  const themesResult = await sql`
    SELECT name, description, classification, score, momentum_7d, recommended_action
    FROM themes
    WHERE company_id = ${companyId}
    ORDER BY score DESC
    LIMIT 10
  `;

  // Get opportunities generated this week
  const oppsResult = await sql`
    SELECT title, summary, type, recommended_format, urgency_score, opportunity_score
    FROM opportunities
    WHERE company_id = ${companyId}
    AND dismissed = false
    AND created_at >= ${weekAgo}
    ORDER BY opportunity_score DESC
    LIMIT 10
  `;

  // Get competitor mentions
  const competitorResult = await sql`
    SELECT competitor_name, mention_context, sentiment
    FROM competitive_mentions
    WHERE company_id = ${companyId}
    AND created_at >= ${weekAgo}
    ORDER BY created_at DESC
    LIMIT 5
  `;

  const signalsSummary = signalsResult.rows.map((s, i) =>
    `${i + 1}. "${s.title}" (score: ${s.usefulness_score}/10, action: ${s.recommended_action})\n   Why: ${s.why_it_matters}\n   Themes: ${s.themes}`
  ).join('\n');

  const themesSummary = themesResult.rows.map(t =>
    `- ${t.name} (${t.classification}, score: ${t.score}, 7d momentum: ${t.momentum_7d})`
  ).join('\n');

  const oppsSummary = oppsResult.rows.map(o =>
    `- ${o.title} (${o.type}, ${o.recommended_format}, urgency: ${o.urgency_score}/10)`
  ).join('\n');

  const competitorSummary = competitorResult.rows.map(c =>
    `- ${c.competitor_name}: ${c.mention_context} (${c.sentiment})`
  ).join('\n');

  const prompt = `You are a senior market intelligence strategist creating a Monday morning weekly briefing for an insurance/insurtech company.

COMPANY CONTEXT:
${narrativeContext}

SIGNALS FROM LAST 7 DAYS (${signalsResult.rows.length} total):
${signalsSummary}

ACTIVE THEMES:
${themesSummary || 'None detected yet.'}

NEW OPPORTUNITIES THIS WEEK:
${oppsSummary || 'None generated.'}

COMPETITOR ACTIVITY:
${competitorSummary || 'No competitor mentions this week.'}

Create a concise, actionable weekly intelligence briefing. Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:

- top_themes: array of exactly 3 objects, each with "name" (string), "description" (1 sentence on why it matters this week), "score" (1-10)
- top_angles: array of exactly 2 objects, each with "title" (compelling angle title), "summary" (2-3 sentences on the angle and how to use it)
- competitor_move: string, 1-2 sentences about the most notable competitor activity this week. If none, describe a competitive whitespace opportunity.
- content_mix: array of 3-4 objects, each with "format" (e.g. "LinkedIn Post", "Email Commentary", "Briefing Note") and "topic" (specific topic to cover)
- thing_to_ignore: string, 1-2 sentences about a trend or topic that looks important but the company should NOT spend time on, and why.
- full_content: string, a 3-4 paragraph executive summary of the week's intelligence landscape. Be specific and strategic, referencing actual signals and themes.

Be concrete and specific. Reference actual signal titles, theme names, and competitive dynamics.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      topThemes: Array.isArray(parsed.top_themes) ? parsed.top_themes.slice(0, 3).map((t: any) => ({
        name: String(t.name || ''),
        description: String(t.description || ''),
        score: Math.max(1, Math.min(10, Math.round(Number(t.score) || 5))),
      })) : [],
      topAngles: Array.isArray(parsed.top_angles) ? parsed.top_angles.slice(0, 2).map((a: any) => ({
        title: String(a.title || ''),
        summary: String(a.summary || ''),
      })) : [],
      competitorMove: String(parsed.competitor_move || ''),
      contentMix: Array.isArray(parsed.content_mix) ? parsed.content_mix.slice(0, 4).map((c: any) => ({
        format: String(c.format || ''),
        topic: String(c.topic || ''),
      })) : [],
      thingToIgnore: String(parsed.thing_to_ignore || ''),
      fullContent: String(parsed.full_content || ''),
    };
  } catch (error) {
    console.error(`[weekly-brief] Failed to generate brief for company ${companyId}:`, error);
    return null;
  }
}

async function sendWeeklyDigestEmail(
  email: string,
  firstName: string,
  brief: WeeklyBriefData,
): Promise<void> {
  if (!LOOPS_API_KEY || !LOOPS_DIGEST_ID) {
    console.log('[weekly-brief] [DEV] Would send weekly digest to:', email);
    return;
  }

  const themesFormatted = brief.topThemes
    .map((t, i) => `${i + 1}. ${t.name} (${t.score}/10) — ${t.description}`)
    .join('\n');

  const anglesFormatted = brief.topAngles
    .map((a, i) => `${i + 1}. ${a.title}\n   ${a.summary}`)
    .join('\n');

  const contentMixFormatted = brief.contentMix
    .map(c => `- ${c.format}: ${c.topic}`)
    .join('\n');

  await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      transactionalId: LOOPS_DIGEST_ID,
      addToAudience: false,
      dataVariables: {
        firstName,
        topThemes: themesFormatted,
        topAngles: anglesFormatted,
        competitorMove: brief.competitorMove,
        contentMix: contentMixFormatted,
        thingToIgnore: brief.thingToIgnore,
        fullSummary: brief.fullContent,
        dashboardUrl: `${APP_URL}/dashboard`,
        signalsUrl: `${APP_URL}/signals`,
      },
    }),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let usersProcessed = 0;
  let briefsGenerated = 0;
  let emailsSent = 0;

  try {
    await getDb();

    // Find all active users with a completed narrative
    const usersResult = await sql`
      SELECT DISTINCT u.id, u.email, u.name, c.id as company_id, c.name as company_name,
             mb.elevator_pitch, mb.company_description, mb.messaging_pillars, mb.icp_profiles, mb.competitors
      FROM users u
      INNER JOIN companies c ON c.user_id = u.id
      INNER JOIN messaging_bibles mb ON mb.company_id = c.id
      WHERE mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10
    `;

    // Calculate week boundaries
    const now = new Date();
    const weekEnd = now.toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

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

        const brief = await generateWeeklyBrief(companyId, companyName, narrativeContext);
        if (!brief) {
          console.log(`[cron/weekly-brief] Skipped company ${companyId}: insufficient data`);
          continue;
        }

        // Store in weekly_priority_views table
        const id = uuidv4();
        await sql`
          INSERT INTO weekly_priority_views (
            id, company_id, week_start, week_end,
            top_themes, recommended_angles, competitor_move,
            content_mix, thing_to_ignore, full_content
          ) VALUES (
            ${id}, ${companyId}, ${weekStart}, ${weekEnd},
            ${JSON.stringify(brief.topThemes)}, ${JSON.stringify(brief.topAngles)}, ${brief.competitorMove},
            ${JSON.stringify(brief.contentMix)}, ${brief.thingToIgnore}, ${brief.fullContent}
          )
        `;
        briefsGenerated++;

        console.log(`[cron/weekly-brief] Generated weekly brief for company ${companyId}`);

        // Send email
        const firstName = ((user.name as string) || 'there').split(' ')[0];
        try {
          await sendWeeklyDigestEmail(user.email as string, firstName, brief);
          emailsSent++;
        } catch (emailErr) {
          console.error(`[cron/weekly-brief] Failed to send email to ${user.email}:`, emailErr);
        }
      } catch (userErr) {
        console.error(`[cron/weekly-brief] Error processing user ${user.id}:`, userErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[cron/weekly-brief] Complete: ${usersProcessed} users, ${briefsGenerated} briefs generated, ${emailsSent} emails sent in ${duration}ms`);

    return NextResponse.json({
      success: true,
      usersProcessed,
      briefsGenerated,
      emailsSent,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cron/weekly-brief] Fatal error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Weekly brief generation failed', duration_ms: duration },
      { status: 500 }
    );
  }
}
