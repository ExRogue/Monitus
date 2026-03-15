import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const SYSTEM_PROMPT = `You are Monitus, a strategic messaging consultant for insurance and insurtech companies. You create comprehensive Narrative documents that define how a company should communicate across all channels.

Generate a complete Narrative document in Markdown format with these sections:

1. **Executive Summary** — 2-3 paragraph overview of the company's positioning and communication strategy
2. **Brand Voice & Tone Guidelines** — Detailed guide on how the company should sound (formal vs conversational, technical vs accessible, etc.)
3. **Elevator Pitch** — Both a 30-second and 60-second version
4. **Tagline Options** — 3 distinct options with rationale for each
5. **Ideal Customer Profiles (ICPs)** — For each target audience provided, create a detailed profile with:
   - Who they are (role, company type, seniority)
   - Their key pain points
   - What they care about
   - How to reach them
   - Key messages that resonate
6. **Messaging Pillars** — 3-5 core themes that everything hangs off. For each:
   - Pillar name
   - Why it matters
   - Proof points
   - Sample messaging
7. **Department-Specific Messaging** — For each department listed:
   - Key messages for this audience
   - Whether focus is strategic or operational
   - Sample talking points
   - Common objections and responses
8. **Channel-Specific Guidelines**:
   - **LinkedIn**: tone, post structure, content themes, frequency, example post
   - **Email Newsletter**: tone, format, section structure, frequency, example subject lines
   - **Trade Media/PR**: pitch angles, spokesperson quote templates, journalist relationship approach
9. **Competitive Differentiation** — How to position against each named competitor
10. **Do's and Don'ts** — Clear rules for brand communication

Write in British English. Be specific, actionable, and tailored to this exact company — not generic. Use the company's specific niche, competitors, and differentiators throughout.`;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`bible-gen:${user.id}`, 3, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Please wait a few minutes before generating again.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { bibleId, websiteContext } = body;
    if (!bibleId) return NextResponse.json({ error: 'Bible ID required' }, { status: 400 });

    await getDb();

    // Get the bible data
    const bibleResult = await sql`SELECT * FROM messaging_bibles WHERE id = ${bibleId}`;
    const bible = bibleResult.rows[0];
    if (!bible) return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });

    // Get the company
    const companyResult = await sql`SELECT * FROM companies WHERE id = ${bible.company_id}`;
    const company = companyResult.rows[0];
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    // Verify ownership
    if (company.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const targetAudiences = JSON.parse(bible.target_audiences || '[]');
    const competitors = JSON.parse(bible.competitors || '[]');
    const differentiators = JSON.parse(bible.differentiators || '[]');
    const keyChallenges = JSON.parse(bible.key_challenges || '[]');
    const departments = JSON.parse(bible.departments || '[]');
    const channels = JSON.parse(bible.channels || '[]');

    const userPrompt = `Create a complete Narrative for this company:

**Company:** ${company.name}
**Type:** ${company.type || 'Insurtech'}
**Niche:** ${company.niche || 'Insurance technology'}
**Description:** ${bible.company_description || company.description || 'Not provided'}

**Target Audiences:**
${targetAudiences.map((a: any, i: number) => `${i + 1}. ${a.name || a.role || 'Audience'} — Role: ${a.role || 'N/A'}, Pain points: ${a.painPoints || 'N/A'}`).join('\n') || 'Not specified'}

**Competitors:**
${competitors.map((c: any, i: number) => `${i + 1}. ${c.name || 'Competitor'} — ${c.difference || 'N/A'}`).join('\n') || 'Not specified'}

**Key Differentiators:**
${differentiators.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') || 'Not specified'}

**Key Challenges Customers Face:**
${keyChallenges.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n') || 'Not specified'}

**Departments Needing Buy-in:**
${departments.map((d: any) => `- ${d.name} (${d.focus || 'strategic'} focus)`).join('\n') || 'Not specified'}

**Priority Channels:** ${channels.join(', ') || 'LinkedIn, Email, Trade Media'}
${websiteContext ? `\n**Additional Context (from company website scan):**\n${String(websiteContext).substring(0, 6000)}\n` : ''}
Generate the complete Narrative now. Make it specific to ${company.name} — reference their actual niche, competitors, and differentiators throughout. Do not be generic.`;

    if (!anthropic) {
      // Fallback template — no streaming needed
      const fullDocument = generateFallbackBible(company, bible);

      await sql`
        UPDATE messaging_bibles SET
          full_document = ${fullDocument},
          status = 'complete',
          updated_at = NOW()
        WHERE id = ${bibleId}
      `;

      return NextResponse.json({ success: true, document: fullDocument });
    }

    // Use streaming to avoid Vercel's 10s timeout on this long generation.
    // The stream keeps the connection alive while tokens are generated.
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();
    let fullDocument = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text;
              fullDocument += text;
              // Send each chunk as a Server-Sent Event
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }

          // Generation complete — save to DB
          await sql`
            UPDATE messaging_bibles SET
              full_document = ${fullDocument},
              status = 'complete',
              updated_at = NOW()
            WHERE id = ${bibleId}
          `;

          // Update company brand voice from the bible
          const voiceMatch = fullDocument.match(/brand voice[^]*?(?=##|$)/i);
          if (voiceMatch) {
            const voiceSummary = voiceMatch[0].substring(0, 500);
            await sql`
              UPDATE companies SET
                brand_voice = ${voiceSummary},
                updated_at = NOW()
              WHERE id = ${company.id}
            `;
          }

          // Signal completion
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, document: fullDocument })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          console.error('Streaming error:', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Bible generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Narrative' }, { status: 500 });
  }
}

function generateFallbackBible(company: any, bible: any): string {
  const targetAudiences = JSON.parse(bible.target_audiences || '[]');
  const competitors = JSON.parse(bible.competitors || '[]');
  const differentiators = JSON.parse(bible.differentiators || '[]');
  const departments = JSON.parse(bible.departments || '[]');
  const name = company.name || 'Your Company';
  const niche = company.niche || 'insurance technology';

  return `# ${name} Narrative

## Executive Summary

${name} operates in the ${niche} space, serving ${targetAudiences.length > 0 ? targetAudiences.map((a: any) => a.name || a.role).join(', ') : 'insurance professionals'}. This Narrative defines how ${name} communicates across all channels to build authority, drive engagement, and convert prospects.

## Brand Voice & Tone Guidelines

${name} should communicate with **professional authority** while remaining **accessible and forward-thinking**. Avoid jargon for jargon's sake, but don't shy away from technical precision when speaking to technical audiences.

- **Tone:** Confident but not arrogant. Expert but not condescending.
- **Language:** British English. Clear, direct sentences.
- **Perspective:** Always lead with insight, not product features.

## Elevator Pitch

**30-second version:**
"${name} helps ${niche} companies ${differentiators[0] || 'transform their approach to market'}. We work with ${targetAudiences[0]?.name || 'insurance professionals'} who need ${targetAudiences[0]?.painPoints || 'better solutions'}, delivering results that matter."

**60-second version:**
"In today's rapidly evolving ${niche} landscape, ${name} provides ${differentiators.join(', ') || 'innovative solutions'}. Our clients — from ${targetAudiences.map((a: any) => a.name || a.role).join(' to ') || 'across the industry'} — rely on us because we understand their unique challenges. ${name} is where deep industry expertise meets modern technology."

## Tagline Options

1. **"${name}: Where ${niche} expertise meets innovation"** — Positions at intersection of old and new
2. **"${name}: Built for ${niche}, by ${niche} experts"** — Emphasises domain expertise
3. **"${name}: The intelligence advantage for ${niche}"** — Focuses on competitive edge

## Ideal Customer Profiles

${targetAudiences.map((a: any, i: number) => `### ICP ${i + 1}: ${a.name || a.role || 'Target Audience'}
- **Role:** ${a.role || 'Not specified'}
- **Pain Points:** ${a.painPoints || 'Not specified'}
- **Key Messages:** Focus on how ${name} directly addresses their challenges
`).join('\n') || '### ICP 1: To be defined\nComplete the wizard to generate detailed ICPs.\n'}

## Messaging Pillars

1. **Industry Expertise** — ${name} understands ${niche} from the inside
2. **Innovation** — Modern solutions for modern challenges
3. **Trust & Compliance** — Built with regulatory awareness from day one

## Department-Specific Messaging

${departments.map((d: any) => `### ${d.name}
- **Focus:** ${d.focus || 'Strategic'}
- **Key Message:** Tailored to ${d.name.toLowerCase()} priorities
- **Approach:** ${d.focus === 'operational' ? 'Lead with efficiency gains and practical implementation' : 'Lead with strategic vision and competitive advantage'}
`).join('\n') || 'Complete the wizard to generate department-specific messaging.\n'}

## Channel Guidelines

### LinkedIn
- Lead with bold, insight-driven hooks
- Keep posts under 1300 characters
- End with an engaging question
- Post 3-4 times per week

### Email Newsletter
- Weekly cadence with consistent structure
- Lead with the "so what" — why this matters to the reader
- Include clear CTAs

### Trade Media
- Lead with newsworthy angles
- Always include a spokesperson quote
- Make it easy for journalists to run the story

## Competitive Differentiation

${competitors.map((c: any) => `### vs ${c.name || 'Competitor'}
${c.difference || 'Differentiation to be defined'}
`).join('\n') || 'Complete the wizard to generate competitive positioning.\n'}

## Do's and Don'ts

**Do:**
- Lead with insight and expertise
- Reference specific market developments
- Use data and evidence to back claims
- Tailor messaging to the audience

**Don't:**
- Use empty superlatives ("best in class", "world-leading")
- Make promises about market outcomes
- Ignore regulatory context
- Use the same content across all channels without adaptation

---

*This Narrative was generated by Monitus. For a more detailed, AI-powered version, connect your Anthropic API key.*
`;
}
