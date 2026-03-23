import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * POST /api/sentiment
 *
 * Async sentiment analysis endpoint. Called fire-and-forget from the
 * competitive monitoring flow so the main response returns within Vercel's 10s timeout.
 *
 * Body: { mentions: Array<{ id: string, competitor_name: string, mention_context: string }> }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`sentiment:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (!anthropic) {
      return NextResponse.json({ analysed: false, reason: 'no api key' });
    }

    const { mentions } = body;

    if (!Array.isArray(mentions) || mentions.length === 0) {
      return NextResponse.json({ error: 'Missing mentions array' }, { status: 400 });
    }

    // Cap at 100 to avoid huge prompts
    const toAnalyse = mentions.slice(0, 100);

    const mentionTexts = toAnalyse.map((m: any, i: number) =>
      `${i + 1}. Company: "${m.competitor_name}" | Context: "${m.mention_context}"`
    ).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyse the sentiment of each company mention below. For each, respond with just the number and sentiment (positive, neutral, or negative) in format "1:positive". One per line, no other text.\n\n${mentionTexts}`,
      }],
    });

    const sentimentText = response.content[0].type === 'text' ? response.content[0].text : '';
    const lines = sentimentText.split('\n').filter(Boolean);

    await getDb();

    for (const line of lines) {
      const match = line.match(/^(\d+)\s*:\s*(positive|neutral|negative)/i);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        if (idx >= 0 && idx < toAnalyse.length) {
          const sentiment = match[2].toLowerCase();
          const mentionId = toAnalyse[idx].id;
          await sql`
            UPDATE competitive_mentions
            SET sentiment = ${sentiment}
            WHERE id = ${mentionId}
          `;
        }
      }
    }

    return NextResponse.json({ analysed: true, count: lines.length });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json({ error: 'Sentiment analysis failed' }, { status: 500 });
  }
}
