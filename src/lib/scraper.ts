/**
 * Direct website scraper for insurance news sites.
 * Supplements RSS feeds by visiting news pages directly and extracting articles.
 */

import { sql } from '@vercel/postgres';
import { getDb } from './db';

export interface ScrapeTarget {
  name: string;
  url: string;
  /** CSS-like hint for article container — used in regex matching */
  articlePattern?: string;
  priority: 'high' | 'standard' | 'low';
}

export interface ScrapedArticle {
  title: string;
  summary: string;
  content: string;
  source: string;
  source_url: string;
  published_at: string;
  source_type: 'website';
}

/**
 * Websites to scrape directly (supplement to RSS feeds).
 * These are sites that either don't have RSS or where RSS misses content.
 */
export const SCRAPE_TARGETS: ScrapeTarget[] = [
  { name: 'Reinsurance News', url: 'https://www.reinsurancene.ws/', priority: 'high' },
  { name: 'The Insurer', url: 'https://www.theinsurer.com/news/', priority: 'high' },
  { name: 'Insurance Journal', url: 'https://www.insurancejournal.com/news/', priority: 'standard' },
  { name: 'Risk & Insurance', url: 'https://riskandinsurance.com/news/', priority: 'standard' },
  { name: 'Captive International', url: 'https://www.captiveinternational.com/news', priority: 'standard' },
  { name: 'Global Reinsurance', url: 'https://www.globalreinsurance.com/', priority: 'standard' },
];

/**
 * Fetch a page and extract article links + titles using regex patterns.
 * No heavy DOM parser needed — we extract <a> tags with href and text.
 */
async function fetchAndExtractLinks(target: ScrapeTarget): Promise<{ title: string; url: string }[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(target.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitusBot/1.0; +https://www.monitus.ai)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[scraper] ${target.name}: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();

    // Extract article links: look for <a href="..." with titles
    // Matches: <a href="/article/..." ...>Title Text</a>
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]{10,120})<\/a>/gi;
    const links: { title: string; url: string }[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];
      const title = match[2].trim().replace(/\s+/g, ' ');

      // Skip navigation, social, category links
      if (
        href.includes('#') ||
        href.includes('javascript:') ||
        href.includes('/tag/') ||
        href.includes('/category/') ||
        href.includes('/author/') ||
        href.includes('/page/') ||
        href.includes('twitter.com') ||
        href.includes('linkedin.com') ||
        href.includes('facebook.com') ||
        title.length < 15 ||
        title.includes('Read more') ||
        title.includes('Subscribe') ||
        title.includes('Sign up') ||
        title.includes('Cookie')
      ) continue;

      // Resolve relative URLs
      if (href.startsWith('/')) {
        const base = new URL(target.url);
        href = `${base.protocol}//${base.host}${href}`;
      } else if (!href.startsWith('http')) {
        continue;
      }

      // Deduplicate
      if (seen.has(href)) continue;
      seen.add(href);

      links.push({ title, url: href });
    }

    // Return top 10 most likely article links
    return links.slice(0, 10);
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error(`[scraper] ${target.name}: Timeout after 10s`);
    } else {
      console.error(`[scraper] ${target.name}: Fetch error:`, err);
    }
    return [];
  }
}

/**
 * Fetch a single article page and extract content.
 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitusBot/1.0; +https://www.monitus.ai)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return '';

    const html = await res.text();

    // Extract text from <p> tags (article body)
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(html)) !== null) {
      const text = pMatch[1]
        .replace(/<[^>]+>/g, '') // Strip inner HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
      if (text.length > 30) {
        paragraphs.push(text);
      }
    }

    return paragraphs.slice(0, 10).join('\n\n');
  } catch {
    return '';
  }
}

/**
 * Scrape a single website target and return articles.
 */
export async function scrapeWebsite(target: ScrapeTarget): Promise<ScrapedArticle[]> {
  const links = await fetchAndExtractLinks(target);
  if (links.length === 0) return [];

  const articles: ScrapedArticle[] = [];

  // Process up to 5 articles with rate limiting (2s gap)
  for (const link of links.slice(0, 5)) {
    const content = await fetchArticleContent(link.url);

    articles.push({
      title: link.title,
      summary: content.slice(0, 300),
      content: content.slice(0, 2000),
      source: target.name,
      source_url: link.url,
      published_at: new Date().toISOString(),
      source_type: 'website',
    });

    // Rate limit: 2 second gap between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  return articles;
}

/**
 * Scrape all configured targets and store new articles.
 * Returns count of new articles stored.
 */
export async function scrapeAllTargets(): Promise<{ scraped: number; errors: string[] }> {
  await getDb();

  let scraped = 0;
  const errors: string[] = [];

  for (const target of SCRAPE_TARGETS) {
    try {
      const articles = await scrapeWebsite(target);

      for (const article of articles) {
        try {
          await sql`
            INSERT INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at, fetched_at, source_type)
            VALUES (
              ${crypto.randomUUID()},
              ${article.title},
              ${article.summary},
              ${article.content},
              ${article.source},
              ${article.source_url},
              'scraped',
              '',
              ${article.published_at},
              NOW(),
              'website'
            )
            ON CONFLICT (source_url) DO NOTHING
          `;
          scraped++;
        } catch (dbErr) {
          // Likely duplicate — ignore
        }
      }
    } catch (targetErr) {
      const msg = `${target.name}: ${(targetErr as Error).message}`;
      errors.push(msg);
      console.error(`[scraper] ${msg}`);
    }
  }

  console.log(`[scraper] Scraped ${scraped} new articles from ${SCRAPE_TARGETS.length} websites. Errors: ${errors.length}`);
  return { scraped, errors };
}
