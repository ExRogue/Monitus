import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * POST /api/tag-content
 *
 * Async pillar-tagging endpoint. Called fire-and-forget from the content
 * generation flow so the main response can return within Vercel's 10s timeout.
 *
 * Body: { contentId: string, companyId: string, contentSnippet: string }
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { contentId, companyId, contentSnippet } = body;

    if (!contentId || !companyId || !contentSnippet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await getDb();

    // Fetch messaging pillars
    const bibleResult = await sql`
      SELECT messaging_pillars FROM messaging_bibles
      WHERE company_id = ${companyId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    const pillarsRaw = bibleResult.rows[0]?.messaging_pillars;
    const pillars: string[] = pillarsRaw ? JSON.parse(pillarsRaw) : [];

    if (pillars.length === 0) {
      return NextResponse.json({ tagged: false, reason: 'no pillars' });
    }

    let pillarTags: string[] = [];

    if (anthropic) {
      try {
        const tagMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: `Given these messaging pillars: ${JSON.stringify(pillars)}\n\nAnd this content:\n${contentSnippet.substring(0, 2000)}\n\nReturn a JSON array of which pillars this content aligns with. Return ONLY the JSON array, nothing else.`,
          }],
        });
        const tagText = tagMsg.content[0].type === 'text' ? tagMsg.content[0].text.trim() : '[]';
        const match = tagText.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          pillarTags = parsed.filter((t: string) => pillars.includes(t));
        }
      } catch {
        // Fall back to keyword matching
        pillarTags = keywordMatchPillars(contentSnippet, pillars);
      }
    } else {
      pillarTags = keywordMatchPillars(contentSnippet, pillars);
    }

    // Update the content record with pillar tags
    await sql`
      UPDATE generated_content
      SET pillar_tags = ${JSON.stringify(pillarTags)}
      WHERE id = ${contentId}
    `;

    return NextResponse.json({ tagged: true, pillarTags });
  } catch (error) {
    console.error('Tag-content error:', error);
    return NextResponse.json({ error: 'Tagging failed' }, { status: 500 });
  }
}

function keywordMatchPillars(content: string, pillars: string[]): string[] {
  const contentLower = content.toLowerCase();
  return pillars.filter((pillar) => {
    const keywords = pillar.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    return keywords.some((keyword) => contentLower.includes(keyword));
  });
}
