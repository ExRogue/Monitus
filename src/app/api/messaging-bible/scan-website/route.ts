import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`scan-website:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { url } = body;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the homepage and common about pages
    const pages = [parsedUrl.toString()];
    const aboutPaths = ['/about', '/about-us', '/company', '/who-we-are', '/solutions', '/products'];
    for (const path of aboutPaths) {
      pages.push(new URL(path, parsedUrl.origin).toString());
    }

    const results: string[] = [];
    let networkErrorCount = 0;
    let timeoutErrorCount = 0;
    let emptyContentCount = 0;

    for (const pageUrl of pages) {
      try {
        const res = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Monitus/1.0 (Content Platform; website scanner)',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;
        const html = await res.text();

        // Extract text content - strip HTML tags, scripts, styles
        const cleaned = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleaned.length > 100) {
          results.push(`--- ${pageUrl} ---\n${cleaned.substring(0, 3000)}`);
        } else {
          emptyContentCount++;
        }
      } catch (fetchError: any) {
        const errMsg = fetchError?.message || fetchError?.name || '';
        if (errMsg.includes('TimeoutError') || errMsg.includes('AbortError') || errMsg.includes('timeout')) {
          timeoutErrorCount++;
        } else {
          networkErrorCount++;
        }
      }
    }

    if (results.length === 0) {
      // Provide a specific error based on what went wrong
      if (timeoutErrorCount > 0 && networkErrorCount === 0) {
        return NextResponse.json(
          { error: 'The website took too long to respond. Try again or skip to the interview.' },
          { status: 400 }
        );
      }
      if (networkErrorCount > 0) {
        return NextResponse.json(
          { error: 'Could not reach that website. Check the URL is correct and the site is publicly accessible.' },
          { status: 400 }
        );
      }
      // Pages loaded but no useful content extracted
      return NextResponse.json(
        { error: "We couldn't extract enough content from that website. Try adding /about or /company to the URL." },
        { status: 400 }
      );
    }

    const rawText = results.join('\n\n').substring(0, 10000);

    // Use Claude to extract structured company information
    if (!anthropic) {
      // Fallback without API key - return raw text only
      return NextResponse.json({
        url: parsedUrl.toString(),
        rawText,
        pagesScanned: results.length,
        extracted: {
          company_name: parsedUrl.hostname.replace('www.', '').split('.')[0],
          what_they_do: '',
          target_market: '',
          value_proposition: '',
          key_differentiators: '',
          competitors_mentioned: '',
          tone_of_voice: '',
          product_features: '',
          team_info: '',
          summary: 'Website content extracted but AI analysis unavailable.',
        },
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyse the following website content and extract key company information. Return ONLY valid JSON with no additional text or markdown.

Website content:
${rawText}

Return this exact JSON structure (use empty string "" if information is not found):
{
  "company_name": "The company's name",
  "what_they_do": "2-3 sentence description of what the company does",
  "target_market": "Who their ideal customers/buyers are",
  "value_proposition": "Their core value proposition",
  "key_differentiators": "What makes them different, unique advantages",
  "competitors_mentioned": "Any competitors or alternatives mentioned",
  "tone_of_voice": "The tone/voice of the website (professional, casual, technical, bold, etc.)",
  "product_features": "Key products or features mentioned",
  "team_info": "Any team or leadership information found",
  "summary": "A comprehensive 4-5 sentence summary of everything known about this company from the website"
}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '{}';

    let extracted: Record<string, string> = {};
    try {
      const cleaned = text
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim();
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = {
        company_name: parsedUrl.hostname.replace('www.', '').split('.')[0],
        what_they_do: '',
        target_market: '',
        value_proposition: '',
        key_differentiators: '',
        competitors_mentioned: '',
        tone_of_voice: '',
        product_features: '',
        team_info: '',
        summary: text.substring(0, 500),
      };
    }

    return NextResponse.json({
      url: parsedUrl.toString(),
      rawText,
      pagesScanned: results.length,
      extracted,
    });
  } catch (error: any) {
    console.error('Website scan error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to scan website. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
