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
  // Podcasts
  { url: 'https://feeds.buzzsprout.com/2063104.rss', source: 'The Voice of Insurance', category: 'podcast' },
  { url: 'https://anchor.fm/s/7e741c8c/podcast/rss', source: 'The Reinsurance Podcast', category: 'podcast' },
  { url: 'https://feeds.feedblitz.com/insuranceday-all&x=1', source: 'The Insurance Day Podcast', category: 'podcast' },
  { url: 'https://feed.podbean.com/instechlondon/feed.xml', source: 'InsTech', category: 'podcast' },
  { url: 'https://feeds.soundcloud.com/users/soundcloud:users:1008690196/sounds.rss', source: 'Insurance Uncut', category: 'podcast' },
  { url: 'https://feeds.acast.com/public/shows/62822c55f7114f0012f2582a', source: 'The Leadership in Insurance Podcast', category: 'podcast' },
  { url: 'https://feeds.acast.com/public/shows/5e565361dcbf6d9f50734ff8', source: 'Insurance Post Podcast', category: 'podcast' },
  { url: 'https://rss.buzzsprout.com/2317674.rss', source: 'Insurance Insider - Behind the Headlines', category: 'podcast' },
  { url: 'https://feeds.acast.com/public/shows/insurance-covered', source: 'Insurance Covered', category: 'podcast' },

  // ── InsurTech specific ──
  { url: 'https://coverager.com/feed/', source: 'Coverager', category: 'insurtech' },
  { url: 'https://www.insurtechinsights.com/feed/', source: 'Insurtech Insights', category: 'insurtech' },
  { url: 'https://www.dig-in.com/feed', source: 'Digital Insurance', category: 'insurtech' },
  { url: 'https://www.intelligentinsurer.com/rss', source: 'Intelligent Insurer', category: 'insurtech' },
  { url: 'https://www.insuranceinsider.com/feed', source: 'The Insurance Insider', category: 'insurtech' },

  // ── Cyber / Security ──
  { url: 'https://www.darkreading.com/rss.xml', source: 'Dark Reading', category: 'cyber' },
  { url: 'https://feeds.feedburner.com/securityweek', source: 'SecurityWeek', category: 'cyber' },
  { url: 'https://www.cisa.gov/news.xml', source: 'CISA Alerts', category: 'cyber' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'Bleeping Computer', category: 'cyber' },

  // ── UK Regulation (expanded) ──
  { url: 'https://www.bankofengland.co.uk/rss/news', source: 'Bank of England', category: 'regulation_uk', locale: 'en-GB' },
  { url: 'https://www.bankofengland.co.uk/rss/prudential-regulation', source: 'PRA', category: 'regulation_uk', locale: 'en-GB' },

  // ── Specialty Lines ──
  { url: 'https://www.lloyds.com/news-and-insights/rss', source: "Lloyd's of London", category: 'specialty' },
  { url: 'https://www.ainonline.com/feed', source: 'Aviation International News', category: 'specialty' },
  { url: 'https://www.constructiondive.com/feeds/news/', source: 'Construction Dive', category: 'specialty' },

  // ── Climate / Cat Risk ──
  { url: 'https://www.swissre.com/rss/institute.rss', source: 'Swiss Re Institute', category: 'climate' },
  { url: 'https://www.munichre.com/topics-online/en/rss-feed.rss', source: 'Munich Re Topics', category: 'climate' },

  // ── US Market ──
  { url: 'https://www.propertycasualty360.com/feed/', source: 'PropertyCasualty360', category: 'us_market', locale: 'en-US' },
  { url: 'https://insurtechnews.com/feed/', source: 'InsurTech News', category: 'us_market', locale: 'en-US' },
  { url: 'https://riskandinsurance.com/feed/', source: 'Risk & Insurance', category: 'us_market', locale: 'en-US' },

  // ── Asia Pacific / International ──
  { url: 'https://www.asiainsurancereview.com/rss', source: 'Asia Insurance Review', category: 'international' },
  { url: 'https://www.meinsurancereview.com/rss', source: 'Middle East Insurance Review', category: 'international' },

  // ── PR Wire / Deal Flow ──
  { url: 'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeGVJSVg==', source: 'BusinessWire Insurance', category: 'deal_flow' },
  { url: 'https://www.globenewswire.com/RssFeed/subjectcode/12-Insurance/feedTitle/GlobeNewswire%20-%20Insurance', source: 'GlobeNewswire Insurance', category: 'deal_flow' },

  // ── Consulting / Strategy ──
  { url: 'https://www.mckinsey.com/industries/financial-services/our-insights/insurance/rss', source: 'McKinsey Insurance', category: 'strategy' },

  // ── VC / Funding ──
  { url: 'https://fintech.global/insurtech/feed/', source: 'FinTech Global InsurTech', category: 'funding' },

  // ── EU Regulation ──
  { url: 'https://ec.europa.eu/commission/presscorner/api/rss', source: 'European Commission', category: 'regulation_eu' },

  // ── Social / Sentiment ──
  { url: 'https://www.reddit.com/r/insurance/.rss', source: 'Reddit r/insurance', category: 'social' },
  { url: 'https://www.reddit.com/r/insurtech/.rss', source: 'Reddit r/insurtech', category: 'social' },

  // ── Industry Reports ──
  { url: 'https://www.genre.com/knowledge/blog.html?rss=true', source: 'Gen Re Knowledge', category: 'reinsurance' },
  { url: 'https://www.willistowerswatson.com/en-GB/Insights/rss', source: 'WTW Insights', category: 'strategy' },
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

/**
 * Load active sources from source_registry table.
 * Falls back to the hardcoded INSURANCE_FEEDS array if the table is empty or unavailable.
 */
async function getRegistrySources(locale?: string): Promise<{
  sources: { id: string | null; url: string; source: string; category: string; trustWeight: number }[];
  fromRegistry: boolean;
}> {
  try {
    let result;
    if (locale) {
      // Filter by geography: 'global' always included, plus matching geography
      const geoMap: Record<string, string> = {
        'en-GB': 'uk,eu,global',
        'en-US': 'us,global',
      };
      const geoFilter = geoMap[locale] || 'global';
      result = await sql`
        SELECT id, url, name, category, trust_weight
        FROM source_registry
        WHERE is_active = true
          AND company_id IS NULL
          AND (geography IS NULL OR geography = ANY(string_to_array(${geoFilter}, ',')))
        ORDER BY
          CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'standard' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
      `;
    } else {
      result = await sql`
        SELECT id, url, name, category, trust_weight
        FROM source_registry
        WHERE is_active = true AND company_id IS NULL
        ORDER BY
          CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'standard' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
      `;
    }

    if (result.rows.length > 0) {
      return {
        fromRegistry: true,
        sources: result.rows.map(r => ({
          id: r.id as string,
          url: r.url as string,
          source: r.name as string,
          category: r.category as string,
          trustWeight: Number(r.trust_weight) || 5,
        })),
      };
    }
  } catch {
    // source_registry table may not exist yet — fall through to hardcoded feeds
  }

  // Fallback: use hardcoded INSURANCE_FEEDS
  const feedsToFetch = locale ? getFeedsForLocale(locale) : INSURANCE_FEEDS;
  return {
    fromRegistry: false,
    sources: feedsToFetch.map(f => ({
      id: null,
      url: f.url,
      source: f.source,
      category: f.category,
      trustWeight: 5,
    })),
  };
}

/**
 * Update source_registry metadata after a fetch attempt for a single source.
 */
async function updateSourceMeta(
  sourceId: string,
  success: boolean,
  articlesInserted: number,
): Promise<void> {
  try {
    if (success) {
      await sql`
        UPDATE source_registry
        SET last_checked = NOW(),
            next_check = NOW() + (scan_cadence_minutes || ' minutes')::INTERVAL,
            failure_count = 0,
            total_signals = total_signals + ${articlesInserted}
        WHERE id = ${sourceId}
      `;
      if (articlesInserted > 0) {
        await sql`
          UPDATE source_registry
          SET last_surfaced_signal = NOW()
          WHERE id = ${sourceId}
        `;
      }
    } else {
      await sql`
        UPDATE source_registry
        SET last_checked = NOW(),
            next_check = NOW() + (scan_cadence_minutes || ' minutes')::INTERVAL,
            failure_count = failure_count + 1,
            is_active = CASE WHEN failure_count + 1 >= 10 THEN false ELSE true END
        WHERE id = ${sourceId}
      `;
    }
  } catch {
    // Best-effort metadata update — don't break the fetch loop
  }
}

export async function fetchNewsFeeds(locale?: string): Promise<{ fetched: number; errors: string[] }> {
  await getDb();
  let totalFetched = 0;
  const errors: string[] = [];

  const { sources, fromRegistry } = await getRegistrySources(locale);

  // Fetch all feeds in parallel for speed
  const feedResults = await Promise.allSettled(
    sources.map(async (feed) => {
      const result = await parser.parseURL(feed.url);
      return { feed, items: result.items.slice(0, 15) };
    })
  );

  for (const feedResult of feedResults) {
    if (feedResult.status === 'rejected') {
      errors.push(String(feedResult.reason));

      // Find which source failed (best-effort) and update registry
      if (fromRegistry) {
        // We can't easily determine which source failed from the error alone,
        // so we'll handle per-source tracking in the fulfilled branch below
      }
      continue;
    }

    const { feed, items } = feedResult.value;
    let insertedForSource = 0;

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
        insertedForSource++;
        totalFetched++;
      } catch (insertErr) {
        // Duplicate — skip silently
      }
    }

    // Update source registry metadata for this source
    if (fromRegistry && feed.id) {
      await updateSourceMeta(feed.id, true, insertedForSource);
    }
  }

  // For rejected feeds, update failure_count where possible
  if (fromRegistry) {
    for (let i = 0; i < feedResults.length; i++) {
      if (feedResults[i].status === 'rejected' && sources[i].id) {
        await updateSourceMeta(sources[i].id!, false, 0);
      }
    }
  }

  const successCount = feedResults.filter(r => r.status === 'fulfilled').length;
  const failCount = feedResults.filter(r => r.status === 'rejected').length;
  console.log(`News fetch: ${successCount}/${sources.length} feeds succeeded, ${failCount} failed, ${totalFetched} new articles`);

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
    'cyber': ['cyber', 'ransomware', 'data breach', 'cybersecurity', 'hacking', 'phishing', 'malware', 'zero-day', 'vulnerability', 'cisa', 'threat actor'],
    'climate': ['climate', 'hurricane', 'flood', 'wildfire', 'catastrophe', 'nat cat', 'sea level', 'carbon', 'extreme weather', 'cat model', 'loss ratio', 'attritional'],
    'regulation': ['fca', 'regulation', 'compliance', 'solvency', 'eiopa', 'sec', 'dol', 'naic', 'state doi', 'department of insurance', 'dfs', 'nist', 'fio', 'federal insurance office', 'rate filing', 'market conduct', 'pra', 'bank of england', 'prudential regulation'],
    'lloyds': ["lloyd's", 'lloyds', 'syndicate', 'corporation of lloyds'],
    'reinsurance': ['reinsurance', 'retro', 'treaty', 'facultative', 'cedent', 'cession', 'swiss re', 'munich re', 'retrocession'],
    'insurtech': ['insurtech', 'startup', 'funding', 'series a', 'series b', 'venture', 'digital insurance', 'embedded insurance', 'parametric', 'api-first'],
    'liability': ['liability', 'd&o', 'e&o', 'professional indemnity', 'pi'],
    'property': ['property', 'commercial property', 'real estate', 'building'],
    'marine': ['marine', 'cargo', 'hull', 'p&i', 'shipping'],
    'aviation': ['aviation', 'aerospace', 'airline', 'aircraft'],
    'ils': ['ils', 'cat bond', 'catastrophe bond', 'insurance-linked', 'sidecar'],
    'manda': ['acquisition', 'merger', 'takeover', 'deal', 'ipo', 'spac', 'private equity'],
    'specialty': ['specialty', 'construction', 'surety', 'energy', 'political risk', 'trade credit', 'fine art', 'specie'],
    'international': ['asia pacific', 'apac', 'middle east', 'emerging market', 'takaful', 'global insurance'],
    'funding': ['series a', 'series b', 'series c', 'seed round', 'raised', 'funding round', 'valuation', 'investor', 'venture capital'],
    'strategy': ['mckinsey', 'deloitte', 'pwc', 'ey', 'kpmg', 'oliver wyman', 'willis towers watson', 'market outlook', 'industry forecast'],
    'eu_regulation': ['dora', 'ai act', 'solvency ii', 'european commission', 'eiopa', 'ifrs 17', 'gdpr'],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['general'];
}
