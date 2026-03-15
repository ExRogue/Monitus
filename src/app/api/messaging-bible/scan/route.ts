import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`scan:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
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

    // Fetch the homepage
    const pages = [parsedUrl.toString()];
    // Try common about pages
    const aboutPaths = ['/about', '/about-us', '/company', '/who-we-are'];
    for (const path of aboutPaths) {
      pages.push(new URL(path, parsedUrl.origin).toString());
    }

    const results: string[] = [];

    for (const pageUrl of pages) {
      try {
        const res = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Monitus/1.0 (Content Platform; website scanner)' },
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
        }
      } catch {
        // Skip failed pages
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract content from that website. Please check the URL and try again.' },
        { status: 400 }
      );
    }

    const extractedText = results.join('\n\n').substring(0, 8000);

    return NextResponse.json({
      url: parsedUrl.toString(),
      extractedText,
      pagesScanned: results.length,
    });
  } catch (error) {
    console.error('Website scan error:', error);
    return NextResponse.json({ error: 'Failed to scan website' }, { status: 500 });
  }
}
