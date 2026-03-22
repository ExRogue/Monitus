import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';

const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent': 'Monitus/1.0 Insurance Content Platform',
  },
});

// Insurance industry RSS feeds — tiered by relevance
// Tier 1: UK market & specialty (highest value for MGA/broker audience)
// Tier 1: US & UK regulatory (NAIC, state DOIs, FCA, PRA)
// Tier 2: Reinsurance & ILS
// Tier 3: General / international / regulation

interface InsuranceFeed {
  url: string;
  source: string;
  category: string;
  /** Optional locale hint — feeds tagged 'en-US' auto-enable for US companies */
  locale?: 'en-US' | 'en-GB' | null;
}

const INSURANCE_FEEDS: InsuranceFeed[] = [
  // Tier 1 — UK market & specialty
  { url: 'https://www.insurancetimes.co.uk/rss', source: 'Insurance Times', category: 'uk_market', locale: 'en-GB' },
  { url: 'https://www.insurancebusinessmag.com/uk/rss/', source: 'Insurance Business UK', category: 'uk_market', locale: 'en-GB' },
  { url: 'https://www.insuranceage.co.uk/feeds/rss', source: 'Insurance Age', category: 'uk_market', locale: 'en-GB' },
  { url: 'https://www.theinsurer.com/feed/', source: 'The Insurer', category: 'specialty' },
  { url: 'https://www.postonline.co.uk/rss', source: 'Post Magazine', category: 'uk_market', locale: 'en-GB' },
  { url: 'https://www.globalreinsurance.com/feed/', source: 'Global Reinsurance', category: 'reinsurance' },

  // Tier 1 — UK regulatory
  { url: 'https://www.fca.org.uk/news/rss.xml', source: 'FCA', category: 'regulation_uk', locale: 'en-GB' },

  // Tier 1 — US regulatory
  { url: 'https://content.naic.org/feed', source: 'NAIC Newsroom', category: 'regulation_us', locale: 'en-US' },
  { url: 'https://www.insurance.ca.gov/0400-news/RSS/index.cfm', source: 'California DOI', category: 'regulation_us', locale: 'en-US' }, // URL may need verification
  { url: 'https://www.dfs.ny.gov/rss.xml', source: 'New York DFS', category: 'regulation_us', locale: 'en-US' },
  { url: 'https://www.tdi.texas.gov/rss/news.xml', source: 'Texas DOI', category: 'regulation_us', locale: 'en-US' },
  { url: 'https://www.floir.com/rss', source: 'Florida OIR', category: 'regulation_us', locale: 'en-US' }, // URL may need verification — FLOIR may not publish standard RSS
  { url: 'https://home.treasury.gov/system/files/feed.xml', source: 'US Treasury (FIO)', category: 'regulation_us', locale: 'en-US' }, // Federal Insurance Office — no dedicated RSS; Treasury-wide feed covers FIO releases
  { url: 'https://www.nist.gov/blogs/cybersecurity-insights/rss.xml', source: 'NIST Cybersecurity', category: 'regulation_us', locale: 'en-US' },

  // Tier 2 — Reinsurance & ILS
  { url: 'https://www.reinsurancene.ws/feed/', source: 'Reinsurance News', category: 'reinsurance' },
  { url: 'https://www.artemis.bm/feed/', source: 'Artemis', category: 'ils' },

  // Tier 3 — General / international
  { url: 'https://www.insurancejournal.com/feed/', source: 'Insurance Journal', category: 'general' },
  { url: 'https://www.insurancejournal.com/newsfeed/', source: 'Insurance Journal Newswire', category: 'general' },
  { url: 'https://www.commercialriskonline.com/feed/', source: 'Commercial Risk', category: 'commercial' },
  { url: 'https://www.carriermanagement.com/feed/', source: 'Carrier Management', category: 'general' },
  { url: 'https://www3.ambest.com/ambv/bestwirefeed/', source: 'AM Best', category: 'general' }, // AM Best: US ratings agency — covers regulatory news but primarily a general industry source
  { url: 'https://news.google.com/rss/search?q=when:7d+allinurl:reuters.com+insurance&ceid=US:en&hl=en-US&gl=US', source: 'Reuters Insurance', category: 'general' },

  // Marine / cargo
  { url: 'https://www.tradewindsnews.com/rss', source: 'TradeWinds', category: 'marine' },
  // Podcast
  { url: 'https://feeds.buzzsprout.com/2063104.rss', source: 'The Voice of Insurance', category: 'podcast' },
];

/**
 * Returns the subset of built-in feeds appropriate for a given locale.
 * - All feeds with no locale tag are always included (general, reinsurance, etc.)
 * - Feeds tagged with the matching locale are included
 * - Feeds tagged with a *different* locale are excluded
 *
 * This lets en-US companies get US regulatory feeds by default and skip
 * UK-only market sources (and vice-versa), while universal feeds stay on.
 */
export function getFeedsForLocale(locale: string = 'en-GB'): InsuranceFeed[] {
  return INSURANCE_FEEDS.filter(feed => {
    if (!feed.locale) return true; // universal — always include
    return feed.locale === locale;
  });
}

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

export async function fetchCustomFeeds(companyId: string): Promise<{ fetched: number; errors: string[] }> {
  await getDb();
  let totalFetched = 0;
  const errors: string[] = [];

  const feedsResult = await sql`
    SELECT * FROM custom_feeds WHERE company_id = ${companyId} AND status = 'active'
  `;

  const feedResults = await Promise.allSettled(
    feedsResult.rows.map(async (feed) => {
      const result = await parser.parseURL(feed.url as string);
      return { feed, items: result.items.slice(0, 15) };
    })
  );

  for (const feedResult of feedResults) {
    if (feedResult.status === 'rejected') {
      errors.push(String(feedResult.reason));
      // Try to mark the feed as errored
      try {
        const failedUrl = String(feedResult.reason);
        // Find which feed failed by checking the error message
        for (const row of feedsResult.rows) {
          if (failedUrl.includes(row.url as string)) {
            await sql`
              UPDATE custom_feeds SET status = 'error', last_error = ${failedUrl.substring(0, 500)}
              WHERE id = ${row.id}
            `;
          }
        }
      } catch {
        // best-effort
      }
      continue;
    }

    const { feed, items } = feedResult.value;

    // Mark feed as successfully fetched
    await sql`
      UPDATE custom_feeds SET last_fetched_at = NOW(), status = 'active', last_error = ''
      WHERE id = ${feed.id}
    `;

    for (const item of items) {
      const id = uuidv4();
      const tags = extractTags(item.title || '', item.contentSnippet || '');
      const sourceUrl = item.link || '';

      if (!sourceUrl) continue;

      try {
        await sql`
          INSERT INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at)
          VALUES (${id}, ${item.title || 'Untitled'}, ${(item.contentSnippet || '').substring(0, 500)}, ${item.content || item.contentSnippet || ''}, ${feed.name as string}, ${sourceUrl}, ${feed.category as string}, ${JSON.stringify(tags)}, ${item.isoDate || new Date().toISOString()})
          ON CONFLICT (source_url) WHERE source_url IS NOT NULL AND source_url != '' AND source_url != '#'
          DO NOTHING
        `;
        totalFetched++;
      } catch {
        // Duplicate — skip silently
      }
    }
  }

  return { fetched: totalFetched, errors };
}

export async function fetchNewsFeeds(locale?: string): Promise<{ fetched: number; errors: string[] }> {
  await getDb();
  let totalFetched = 0;
  const errors: string[] = [];

  // When a locale is provided, filter feeds to those relevant for that locale.
  // When no locale is given (e.g. global cron), fetch ALL feeds.
  const feedsToFetch = locale ? getFeedsForLocale(locale) : INSURANCE_FEEDS;

  // Fetch all built-in feeds in parallel for speed
  const feedResults = await Promise.allSettled(
    feedsToFetch.map(async (feed) => {
      const result = await parser.parseURL(feed.url);
      return { feed, items: result.items.slice(0, 15) };
    })
  );

  for (const feedResult of feedResults) {
    if (feedResult.status === 'rejected') {
      errors.push(String(feedResult.reason));
      continue;
    }

    const { feed, items } = feedResult.value;
    for (const item of items) {
      const id = uuidv4();
      const tags = extractTags(item.title || '', item.contentSnippet || '');
      const sourceUrl = item.link || '';

      if (!sourceUrl) continue;

      try {
        await sql`
          INSERT INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at)
          VALUES (${id}, ${item.title || 'Untitled'}, ${(item.contentSnippet || '').substring(0, 500)}, ${item.content || item.contentSnippet || ''}, ${feed.source}, ${sourceUrl}, ${feed.category}, ${JSON.stringify(tags)}, ${item.isoDate || new Date().toISOString()})
          ON CONFLICT (source_url) WHERE source_url IS NOT NULL AND source_url != '' AND source_url != '#'
          DO NOTHING
        `;
        totalFetched++;
      } catch (insertErr) {
        // Duplicate — skip silently
      }
    }
  }

  const successCount = feedResults.filter(r => r.status === 'fulfilled').length;
  const failCount = feedResults.filter(r => r.status === 'rejected').length;
  console.log(`News fetch: ${successCount}/${feedsToFetch.length} feeds succeeded, ${failCount} failed, ${totalFetched} new articles`);

  // Also fetch all active custom feeds across all companies
  try {
    const allCompanies = await sql`
      SELECT DISTINCT company_id FROM custom_feeds WHERE status = 'active'
    `;
    for (const row of allCompanies.rows) {
      const customResult = await fetchCustomFeeds(row.company_id as string);
      totalFetched += customResult.fetched;
      errors.push(...customResult.errors);
    }
  } catch (customErr) {
    errors.push(`Custom feeds error: ${String(customErr)}`);
  }

  return { fetched: totalFetched, errors };
}

export async function getLatestNews(limit = 20, category?: string, offset = 0): Promise<NewsArticle[]> {
  await getDb();

  if (category && category !== 'all') {
    const result = await sql`
      SELECT * FROM news_articles WHERE category = ${category} ORDER BY published_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return result.rows as unknown as NewsArticle[];
  }

  const result = await sql`
    SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ${limit} OFFSET ${offset}
  `;
  return result.rows as unknown as NewsArticle[];
}

export async function getArticlesByIds(ids: string[]): Promise<NewsArticle[]> {
  if (!ids.length) return [];
  await getDb();

  // Fetch all IDs in parallel instead of sequentially
  const results = await Promise.all(
    ids.map(id => sql`SELECT * FROM news_articles WHERE id = ${id}`)
  );
  return results
    .map(r => r.rows[0])
    .filter(Boolean) as unknown as NewsArticle[];
}

export async function searchNews(query: string, limit = 20, offset = 0): Promise<NewsArticle[]> {
  await getDb();
  const pattern = `%${query}%`;
  const result = await sql`
    SELECT * FROM news_articles WHERE title ILIKE ${pattern} OR summary ILIKE ${pattern} OR tags ILIKE ${pattern} ORDER BY published_at DESC LIMIT ${limit} OFFSET ${offset}
  `;
  return result.rows as unknown as NewsArticle[];
}

export async function getNewsByTimeframe(
  timeframe: string,
  limit = 20,
  category?: string
): Promise<NewsArticle[]> {
  await getDb();

  if (category && category !== 'all') {
    switch (timeframe) {
      case '24h':
        return (await sql`SELECT * FROM news_articles WHERE category = ${category} AND published_at >= NOW() - INTERVAL '24 hours' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
      case '7d':
        return (await sql`SELECT * FROM news_articles WHERE category = ${category} AND published_at >= NOW() - INTERVAL '7 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
      case '30d':
        return (await sql`SELECT * FROM news_articles WHERE category = ${category} AND published_at >= NOW() - INTERVAL '30 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
      case '90d':
        return (await sql`SELECT * FROM news_articles WHERE category = ${category} AND published_at >= NOW() - INTERVAL '90 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
      default:
        return (await sql`SELECT * FROM news_articles WHERE category = ${category} AND published_at >= NOW() - INTERVAL '7 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
    }
  }

  switch (timeframe) {
    case '24h':
      return (await sql`SELECT * FROM news_articles WHERE published_at >= NOW() - INTERVAL '24 hours' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
    case '7d':
      return (await sql`SELECT * FROM news_articles WHERE published_at >= NOW() - INTERVAL '7 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
    case '30d':
      return (await sql`SELECT * FROM news_articles WHERE published_at >= NOW() - INTERVAL '30 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
    case '90d':
      return (await sql`SELECT * FROM news_articles WHERE published_at >= NOW() - INTERVAL '90 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
    default:
      return (await sql`SELECT * FROM news_articles WHERE published_at >= NOW() - INTERVAL '7 days' ORDER BY published_at DESC LIMIT ${limit}`).rows as unknown as NewsArticle[];
  }
}

function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags: string[] = [];

  const tagMap: Record<string, string[]> = {
    'cyber': ['cyber', 'ransomware', 'data breach', 'cybersecurity', 'hacking'],
    'climate': ['climate', 'hurricane', 'flood', 'wildfire', 'catastrophe', 'nat cat'],
    'regulation': ['fca', 'regulation', 'compliance', 'solvency', 'eiopa', 'sec', 'dol', 'naic', 'state doi', 'department of insurance', 'dfs', 'nist', 'fio', 'federal insurance office', 'rate filing', 'market conduct'],
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
