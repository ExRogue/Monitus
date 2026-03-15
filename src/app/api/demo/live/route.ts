import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`demo-live:${user.id}`, 5, 300_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Please wait a few minutes before running another demo.' },
      { status: 429 }
    );
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { companyName, companyType, niche, companyDescription, brandVoice } =
      body;

    if (!companyName || !niche) {
      return NextResponse.json(
        { error: 'Company name and niche are required' },
        { status: 400 }
      );
    }

    await getDb();

    // -------------------------------------------------------------------
    // Step 1: Find relevant articles for the company's niche
    // -------------------------------------------------------------------
    const nicheTerms = niche
      .toLowerCase()
      .split(/[,;&/]+/)
      .map((t: string) => t.trim())
      .filter(Boolean);

    // Build a flexible search: look for niche terms in title, summary, category, or tags
    let articles: any[] = [];

    // Try matching by niche keywords in title or summary
    for (const term of nicheTerms) {
      if (articles.length >= 5) break;
      const result = await sql`
        SELECT id, title, summary, source, source_url, category, tags, published_at
        FROM news_articles
        WHERE (LOWER(title) LIKE ${'%' + term + '%'}
           OR LOWER(summary) LIKE ${'%' + term + '%'}
           OR LOWER(category) LIKE ${'%' + term + '%'}
           OR LOWER(tags) LIKE ${'%' + term + '%'})
        ORDER BY published_at DESC
        LIMIT 10
      `;
      for (const row of result.rows) {
        if (!articles.find((a) => a.id === row.id)) {
          articles.push(row);
        }
      }
    }

    // If no niche-specific results, also try by company type
    if (articles.length === 0 && companyType) {
      const typeResult = await sql`
        SELECT id, title, summary, source, source_url, category, tags, published_at
        FROM news_articles
        WHERE (LOWER(title) LIKE ${'%' + companyType.toLowerCase() + '%'}
           OR LOWER(summary) LIKE ${'%' + companyType.toLowerCase() + '%'}
           OR LOWER(tags) LIKE ${'%' + companyType.toLowerCase() + '%'})
        ORDER BY published_at DESC
        LIMIT 5
      `;
      articles = typeResult.rows;
    }

    // Final fallback: latest articles from the DB
    if (articles.length === 0) {
      const fallbackResult = await sql`
        SELECT id, title, summary, source, source_url, category, tags, published_at
        FROM news_articles
        ORDER BY published_at DESC
        LIMIT 5
      `;
      articles = fallbackResult.rows;
    }

    // Pick the single most relevant article (first match is best since ordered by recency)
    const article = articles[0];

    if (!article) {
      return NextResponse.json(
        { error: 'No news articles available for demo. Please refresh news feeds first.' },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------
    // Step 2: Generate a LinkedIn post + trade media pitch in brand voice
    // -------------------------------------------------------------------
    const voiceGuidance = brandVoice
      ? `The brand voice is: ${brandVoice}`
      : 'Use a professional, authoritative but accessible tone typical of the insurance industry.';

    const demoPrompt = `You are generating a live demo for ${companyName}, a ${companyType || 'company'} operating in the ${niche} space.
${companyDescription ? `Company description: ${companyDescription}` : ''}
${voiceGuidance}

Based on this real news article:
Title: "${article.title}"
Summary: "${article.summary}"
Source: ${article.source}

Generate the following two pieces of content:

1. **LINKEDIN POST**: A compelling LinkedIn post (800-1500 characters) written as if from ${companyName}'s perspective. Include:
   - A bold, attention-grabbing opening hook (first line)
   - 2-3 insight paragraphs that demonstrate ${companyName}'s expertise in ${niche}
   - A thought-provoking closing question or call to engagement
   - 2-3 relevant hashtags
   - Use line breaks between paragraphs for readability

2. **TRADE MEDIA PITCH**: A short trade media pitch (200-400 words) that ${companyName} could send to a journalist at Insurance Times or The Insurer. Include:
   - A compelling subject line
   - Why this development matters for the ${niche} market
   - A sample spokesperson quote attributed to a senior leader at ${companyName}
   - What angle makes this newsworthy

3. **RELEVANCE EXPLANATION**: A 1-2 sentence explanation of why this article is relevant to ${companyName} and their ${niche} focus.

Return your response in this exact JSON format (no markdown code blocks):
{
  "linkedinDraft": "the full LinkedIn post text",
  "tradePitch": "the full trade media pitch text",
  "relevanceExplanation": "why this article matters for this company"
}`;

    let linkedinDraft: string;
    let tradePitch: string;
    let relevanceExplanation: string;

    if (anthropic) {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: demoPrompt }],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      try {
        // Try to parse as JSON first
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        linkedinDraft = parsed.linkedinDraft || '';
        tradePitch = parsed.tradePitch || '';
        relevanceExplanation = parsed.relevanceExplanation || '';
      } catch {
        // If JSON parsing fails, try to extract sections manually
        linkedinDraft = extractSection(responseText, 'LINKEDIN POST', 'TRADE MEDIA PITCH');
        tradePitch = extractSection(responseText, 'TRADE MEDIA PITCH', 'RELEVANCE EXPLANATION');
        relevanceExplanation = extractSection(responseText, 'RELEVANCE EXPLANATION', '');

        if (!linkedinDraft) {
          linkedinDraft = responseText.slice(0, 1500);
          tradePitch = '';
          relevanceExplanation = `This article in ${niche} is directly relevant to ${companyName}'s market positioning.`;
        }
      }
    } else {
      // Fallback when no API key is configured
      linkedinDraft = `The insurance industry is evolving fast. ${article.title}\n\n` +
        `At ${companyName}, we're watching this development closely. As a ${companyType || 'company'} focused on ${niche}, ` +
        `this has direct implications for how we serve our clients and approach the market.\n\n` +
        `The key takeaway? Companies that stay ahead of these shifts will be the ones that thrive. ` +
        `Those that don't will find themselves playing catch-up.\n\n` +
        `What's your take — how will this affect your business?\n\n` +
        `#Insurance #${niche.replace(/\s+/g, '')} #ThoughtLeadership`;

      tradePitch = `Subject: ${companyName} Commentary — ${article.title}\n\n` +
        `Dear Editor,\n\n` +
        `Following the recent developments covered in "${article.title}" (${article.source}), ` +
        `${companyName} would like to offer expert commentary on the implications for the ${niche} market.\n\n` +
        `"This is a pivotal moment for ${niche}," said a senior leader at ${companyName}. ` +
        `"Companies that understand the nuances here will be well-positioned for what comes next. ` +
        `At ${companyName}, we've been tracking this trend closely and believe it validates our approach."\n\n` +
        `We would be happy to provide further insight or arrange an interview.\n\n` +
        `Best regards,\n${companyName} Communications`;

      relevanceExplanation = `This article about ${article.category || 'insurance market'} developments is directly relevant to ${companyName}'s focus on ${niche}, providing an opportunity to demonstrate thought leadership.`;
    }

    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title,
        summary: article.summary,
        source: article.source,
        source_url: article.source_url,
        category: article.category,
        published_at: article.published_at,
      },
      linkedinDraft,
      tradePitch,
      relevanceExplanation,
    });
  } catch (error) {
    console.error('Live demo error:', error);
    return NextResponse.json(
      { error: 'Demo generation failed. Please try again.' },
      { status: 500 }
    );
  }
}

function extractSection(text: string, start: string, end: string): string {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return '';
  const afterStart = text.indexOf('\n', startIdx);
  if (afterStart === -1) return '';
  const endIdx = end ? text.indexOf(end, afterStart) : text.length;
  return text
    .slice(afterStart, endIdx === -1 ? undefined : endIdx)
    .trim();
}
