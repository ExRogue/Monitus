import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const SYSTEM_PROMPT = `You are Monitus, a strategic messaging consultant for specialist insurance companies (MGAs, Lloyd's brokers, reinsurers, carriers). You produce stakeholder messaging matrices that help companies tailor their communications to each internal decision-maker.

You will receive a company's narrative/messaging bible and their ICP (Ideal Customer Profile) data. Based on this, generate a stakeholder messaging matrix — one entry per stakeholder role — that is deeply specific to this company's actual product, market, and buyers.

Return ONLY valid JSON — an array of objects. No markdown, no code fences, no explanation. Each object must have exactly these fields:

{
  "role": "string — the stakeholder title",
  "primaryConcern": "string — what this person cares about most, specific to this company's domain",
  "successCriteria": "string — how they measure success when evaluating this company's offering",
  "messageFocus": "string — what the company's messaging should emphasise for this person",
  "proofTypes": ["array of strings — types of evidence that resonate"],
  "languageToUse": ["array of strings — words and phrases to use"],
  "languageToAvoid": ["array of strings — words and phrases to avoid"],
  "scepticismTriggers": ["array of strings — what makes this person suspicious"],
  "likelyBlockers": ["array of strings — obstacles this person might raise"],
  "buyingRole": "one of: champion, blocker, approver, evaluator, user"
}

Include these stakeholder roles (and add any others relevant to this specific company):
- CTO / CIO
- Chief Underwriting Officer
- CFO
- CEO / MD
- Head of Distribution / Broking
- Head of Claims
- Chief Actuary
- Head of Operations
- Data / Analytics Leadership
- Innovation / Transformation

Be specific and tailored — reference the company's actual product, market positioning, and buyer pain points. Do not be generic. Write in British English.`;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`stakeholder-matrix-gen:${user.id}`, 3, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Please wait a few minutes before generating again.' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) return NextResponse.json({ error: 'No company found' }, { status: 404 });

    // Get the messaging bible
    const { searchParams } = new URL(request.url);
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine — we'll use query params
    }
    const narrativeId = body.narrative_id || searchParams.get('narrative_id') || null;

    let bibleResult;
    if (narrativeId) {
      bibleResult = await sql`
        SELECT * FROM messaging_bibles WHERE company_id = ${company.id} AND narrative_id = ${narrativeId} ORDER BY updated_at DESC LIMIT 1
      `;
    } else {
      bibleResult = await sql`
        SELECT * FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
      `;
    }

    const bible = bibleResult.rows[0];
    if (!bible) {
      return NextResponse.json({ error: 'No messaging bible found. Complete your narrative first.' }, { status: 404 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // Build context from the bible
    const contextParts: string[] = [];

    if (company.name) contextParts.push(`Company: ${company.name}`);
    if (company.type) contextParts.push(`Company type: ${company.type}`);
    if (company.niche) contextParts.push(`Niche: ${company.niche}`);
    if (company.description) contextParts.push(`Description: ${company.description}`);

    if (bible.elevator_pitch) contextParts.push(`\nElevator pitch:\n${bible.elevator_pitch}`);
    if (bible.full_document) {
      // Truncate to avoid token limits
      const doc = bible.full_document.length > 6000 ? bible.full_document.slice(0, 6000) + '...' : bible.full_document;
      contextParts.push(`\nFull narrative document:\n${doc}`);
    }
    if (bible.icp_profiles) {
      try {
        const icps = JSON.parse(bible.icp_profiles);
        if (Array.isArray(icps) && icps.length > 0) {
          contextParts.push(`\nICP Profiles:\n${JSON.stringify(icps, null, 2)}`);
        }
      } catch { /* ignore parse errors */ }
    }
    if (bible.messaging_pillars) contextParts.push(`\nMessaging pillars: ${bible.messaging_pillars}`);
    if (bible.competitors) {
      try {
        const comps = JSON.parse(bible.competitors);
        if (Array.isArray(comps) && comps.length > 0) {
          contextParts.push(`\nCompetitors:\n${JSON.stringify(comps, null, 2)}`);
        }
      } catch { /* ignore parse errors */ }
    }
    if (bible.brand_voice_guide) contextParts.push(`\nBrand voice: ${bible.brand_voice_guide}`);

    const userMessage = contextParts.join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Based on this company's narrative and buyer data, generate a tailored stakeholder messaging matrix:\n\n${userMessage}`,
        },
      ],
    });

    // Extract the text content
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON response
    let matrix: any[];
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      let jsonStr = textBlock.text.trim();
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      matrix = JSON.parse(jsonStr);
      if (!Array.isArray(matrix)) {
        throw new Error('Response is not an array');
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', textBlock.text.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Validate and clean up each entry
    const validBuyingRoles = ['champion', 'blocker', 'approver', 'evaluator', 'user'];
    const cleaned = matrix.map((entry: any) => ({
      role: String(entry.role || 'Unknown'),
      primaryConcern: String(entry.primaryConcern || entry.primary_concern || ''),
      successCriteria: String(entry.successCriteria || entry.success_criteria || ''),
      messageFocus: String(entry.messageFocus || entry.message_focus || ''),
      proofTypes: Array.isArray(entry.proofTypes || entry.proof_types) ? (entry.proofTypes || entry.proof_types) : [],
      languageToUse: Array.isArray(entry.languageToUse || entry.language_to_use) ? (entry.languageToUse || entry.language_to_use) : [],
      languageToAvoid: Array.isArray(entry.languageToAvoid || entry.language_to_avoid) ? (entry.languageToAvoid || entry.language_to_avoid) : [],
      scepticismTriggers: Array.isArray(entry.scepticismTriggers || entry.scepticism_triggers) ? (entry.scepticismTriggers || entry.scepticism_triggers) : [],
      likelyBlockers: Array.isArray(entry.likelyBlockers || entry.likely_blockers) ? (entry.likelyBlockers || entry.likely_blockers) : [],
      buyingRole: validBuyingRoles.includes(entry.buyingRole || entry.buying_role) ? (entry.buyingRole || entry.buying_role) : 'evaluator',
    }));

    return NextResponse.json({ matrix: cleaned });
  } catch (error) {
    console.error('Stakeholder matrix generation error:', error);
    return NextResponse.json({ error: 'Failed to generate stakeholder matrix' }, { status: 500 });
  }
}
