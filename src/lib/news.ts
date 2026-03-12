import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Telum/1.0 Insurance Content Platform',
  },
});

// Insurance industry RSS feeds
const INSURANCE_FEEDS = [
  { url: 'https://www.insurancejournal.com/feed/', source: 'Insurance Journal', category: 'general' },
  { url: 'https://www.reinsurancene.ws/feed/', source: 'Reinsurance News', category: 'reinsurance' },
  { url: 'https://www.artemis.bm/feed/', source: 'Artemis', category: 'ils' },
  { url: 'https://www.insurancetimes.co.uk/rss', source: 'Insurance Times', category: 'uk_market' },
  { url: 'https://www.theinsurer.com/feed/', source: 'The Insurer', category: 'specialty' },
  { url: 'https://www.commercialriskonline.com/feed/', source: 'Commercial Risk', category: 'commercial' },
];

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  source_url: string;
  category: string;
  tags: string;
  published_at: string;
  fetched_at: string;
}

export async function fetchNewsFeeds(): Promise<{ fetched: number; errors: string[] }> {
  await getDb();
  let totalFetched = 0;
  const errors: string[] = [];

  for (const feed of INSURANCE_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      const items = result.items.slice(0, 15);

      for (const item of items) {
        const id = uuidv4();
        const tags = extractTags(item.title || '', item.contentSnippet || '');

        await sql`
          INSERT INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at)
          VALUES (${id}, ${item.title || 'Untitled'}, ${(item.contentSnippet || '').substring(0, 500)}, ${item.content || item.contentSnippet || ''}, ${feed.source}, ${item.link || ''}, ${feed.category}, ${JSON.stringify(tags)}, ${item.isoDate || new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `;
        totalFetched++;
      }
    } catch (err) {
      errors.push(`${feed.source}: ${(err as Error).message}`);
    }
  }

  return { fetched: totalFetched, errors };
}

export async function getLatestNews(limit = 20, category?: string): Promise<NewsArticle[]> {
  await getDb();

  if (category && category !== 'all') {
    const result = await sql`
      SELECT * FROM news_articles WHERE category = ${category} ORDER BY published_at DESC LIMIT ${limit}
    `;
    return result.rows as unknown as NewsArticle[];
  }

  const result = await sql`
    SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ${limit}
  `;
  return result.rows as unknown as NewsArticle[];
}

export async function getArticlesByIds(ids: string[]): Promise<NewsArticle[]> {
  if (!ids.length) return [];
  await getDb();

  // sql tagged templates don't support dynamic IN lists directly,
  // so we fetch one-by-one and combine results
  const articles: NewsArticle[] = [];
  for (const id of ids) {
    const result = await sql`SELECT * FROM news_articles WHERE id = ${id}`;
    if (result.rows[0]) {
      articles.push(result.rows[0] as unknown as NewsArticle);
    }
  }
  return articles;
}

export async function searchNews(query: string, limit = 20): Promise<NewsArticle[]> {
  await getDb();
  const pattern = `%${query}%`;
  const result = await sql`
    SELECT * FROM news_articles WHERE title LIKE ${pattern} OR summary LIKE ${pattern} ORDER BY published_at DESC LIMIT ${limit}
  `;
  return result.rows as unknown as NewsArticle[];
}

function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags: string[] = [];

  const tagMap: Record<string, string[]> = {
    'cyber': ['cyber', 'ransomware', 'data breach', 'cybersecurity', 'hacking'],
    'climate': ['climate', 'hurricane', 'flood', 'wildfire', 'catastrophe', 'nat cat'],
    'regulation': ['fca', 'regulation', 'compliance', 'solvency', 'eiopa', 'sec', 'dol'],
    'lloyds': ["lloyd's", 'lloyds', 'syndicate', 'corporation of lloyds'],
    'reinsurance': ['reinsurance', 'retro', 'treaty', 'facultative', 'cedent', 'cession'],
    'insurtech': ['insurtech', 'startup', 'funding', 'series a', 'series b', 'venture'],
    'liability': ['liability', 'd&o', 'e&o', 'professional indemnity', 'pi'],
    'property': ['property', 'commercial property', 'real estate', 'building'],
    'marine': ['marine', 'cargo', 'hull', 'p&i', 'shipping'],
    'aviation': ['aviation', 'aerospace', 'airline', 'aircraft'],
    'ils': ['ils', 'cat bond', 'catastrophe bond', 'insurance-linked', 'sidecar'],
    'manda': ['acquisition', 'merger', 'takeover', 'deal'],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['general'];
}
