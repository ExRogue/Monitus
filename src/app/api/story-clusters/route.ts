/**
 * GET /api/story-clusters
 *
 * Powers Story Saturation inside Market Analyst. Two scopes:
 *
 * - market-wide  : highest-saturation clusters across monitored sources.
 *                  Single-article clusters are excluded by HAVING COUNT(*) >= 2.
 *                  Ranked by saturation_score (mentions + breadth + velocity).
 *
 * - your-coverage: clusters where at least one article matched the company's
 *                  trigger profile (company/product/founder). Each row carries
 *                  trend_direction (rising/flat/falling) computed from the
 *                  first-half vs second-half mention counts inside the period.
 *                  Per-article matched_trigger_types feed the drawer.
 *
 * Both scopes share the same clustering primitive (story_signature) and
 * inherit the page's period from a query param. Source-filter inheritance is
 * handled here too: pass &sources=Foo,Bar to scope to those publications.
 *
 * Query params
 *   period   = 7d | 14d | 30d  (default 7d)
 *   scope    = market-wide | your-coverage  (default market-wide)
 *   sources  = comma-separated source names to scope to (default all)
 *   limit    = 1..100  (default 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SaturationPhase } from '@/lib/saturation';
import {
  getTriggerProfile,
  matchTriggers,
  anyTriggerMatched,
  TriggerType,
  TriggerProfile,
} from '@/lib/triggers';

export const maxDuration = 30;

type Period = '7d' | '14d' | '30d';
type Scope = 'market-wide' | 'your-coverage';
type TrendDirection = 'rising' | 'flat' | 'falling';

const PERIOD_HOURS: Record<Period, number> = { '7d': 168, '14d': 336, '30d': 720 };

interface ClusterArticle {
  id: string;
  publication: string;
  headline: string;
  url: string;
  timestamp: string;
  matched_trigger_types: TriggerType[]; // empty for market-wide
}

interface ClusterRow {
  story_signature: string;
  rank: number;
  cluster_title: string;
  mention_count: number;
  mention_count_prior: number;
  delta_pct: number | null;             // (mention_count - mention_count_prior) / prior * 100
  unique_publication_count: number;
  tier_0_1_sources: number;             // distinct sources with source_tier <= 1
  status_badge: SaturationPhase;       // populated for market-wide
  trend_direction?: TrendDirection;     // populated for your-coverage
  trend_label?: string;                 // e.g., "+312% wow", "peak passed"
  first_seen: string;
  latest_mention: string;
  saturation_score: number;
  matched_trigger_types: TriggerType[]; // empty for market-wide
  sparkline: number[];                  // 24 hourly buckets oldest -> newest
  articles: ClusterArticle[];
}

interface ResponseBody {
  scope: Scope;
  period: Period;
  clusters: ClusterRow[];
  total_sources_count: number;
  has_trigger_profile: boolean;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    const companyResult = await sql`SELECT id, name FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    const companyId = companyResult.rows[0]?.id as string | undefined;
    if (!companyId) {
      return NextResponse.json<ResponseBody>({
        scope: 'market-wide', period: '7d',
        clusters: [], total_sources_count: 0, has_trigger_profile: false,
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = clampInt(searchParams.get('limit'), 50, 1, 100);
    const period = pickEnum<Period>(searchParams.get('period'), ['7d', '14d', '30d'], '7d');
    const scope = pickEnum<Scope>(searchParams.get('scope'), ['market-wide', 'your-coverage'], 'market-wide');
    const sourcesFilter = parseCsv(searchParams.get('sources'));

    const windowHours = PERIOD_HOURS[period];

    // ── Trigger profile (only needed for your-coverage scope) ─────────
    const triggerProfile = scope === 'your-coverage' ? await getTriggerProfile(companyId) : null;
    if (scope === 'your-coverage' && !triggerProfile) {
      return NextResponse.json<ResponseBody>({
        scope, period,
        clusters: [], total_sources_count: 0, has_trigger_profile: false,
      });
    }

    // ── Cluster aggregation ───────────────────────────────────────────
    // - The optional sources filter is handled in SQL via cardinality(array)
    //   so one query works for both filtered and unfiltered cases.
    // - The "single-article cluster excluded from market-wide" rule is
    //   applied post-query in JS to keep the SQL parameterizer happy
    //   (conditional sql fragments don't compose cleanly).
    const clusterResult = await sql`
      SELECT
        na.story_signature,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours}))::int                         AS mention_count,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours / 2}))::int                     AS mention_count_recent_half,
        COUNT(*) FILTER (WHERE na.published_at <  NOW() - make_interval(hours => ${windowHours / 2})
                            AND na.published_at >= NOW() - make_interval(hours => ${windowHours}))::int                          AS mention_count_older_half,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours * 2})
                            AND na.published_at <  NOW() - make_interval(hours => ${windowHours}))::int                          AS mention_count_prior_period,
        COUNT(DISTINCT na.source) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours}))::int          AS unique_publication_count,
        COUNT(DISTINCT na.source) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours})
                                            AND na.source_tier <= 1)::int                                                          AS tier_0_1_sources,
        MIN(na.published_at) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours}))                    AS first_seen,
        MAX(na.published_at) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours}))                    AS latest_mention,
        (array_agg(na.title ORDER BY na.published_at DESC) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours})))[1] AS sample_title
      FROM news_articles na
      WHERE na.story_signature != ''
        AND na.story_signature != '__no_title__'
        AND na.published_at >= NOW() - make_interval(hours => ${windowHours * 2})
        AND (cardinality(${sourcesFilter as unknown as string}::text[]) = 0 OR na.source = ANY(${sourcesFilter as unknown as string}::text[]))
      GROUP BY na.story_signature
      HAVING COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours})) > 0
      LIMIT 500
    `;
    // Market-wide excludes single-article clusters per spec.
    const allRows = scope === 'market-wide'
      ? clusterResult.rows.filter(r => Number(r.mention_count) >= 2)
      : clusterResult.rows;
    const signatures = allRows.map(r => String(r.story_signature));

    // ── Snapshot map for current saturation phase + composite score ───
    const snapshotMap = new Map<string, { phase: SaturationPhase; composite_score: number }>();
    if (signatures.length > 0) {
      const snapResult = await sql`
        SELECT story_signature, phase, composite_score
        FROM saturation_snapshots
        WHERE company_id = ${companyId} AND story_signature = ANY(${signatures as unknown as string}::text[])
      `;
      for (const r of snapResult.rows) {
        snapshotMap.set(String(r.story_signature), {
          phase: normalizePhase(String(r.phase)),
          composite_score: Number(r.composite_score),
        });
      }
    }

    // ── Sparkline buckets ─────────────────────────────────────────────
    // 24 evenly-spaced buckets across the FULL period. Each bucket spans
    // `bucketSizeHours = windowHours / 24` so a 7d window gives 7-hour
    // buckets, 14d gives 14-hour, 30d gives 30-hour. This keeps the chart
    // shape meaningful regardless of how spread the cluster's articles
    // are inside the period (the previous "last 24h hourly" implementation
    // produced zero bars for clusters whose latest article was older
    // than 24h, e.g. a 7d-old story).
    const sparkBucketCount = 24;
    const bucketSizeSeconds = (windowHours * 3600) / sparkBucketCount;
    const sparkMap = new Map<string, number[]>();
    for (const sig of signatures) sparkMap.set(sig, new Array(sparkBucketCount).fill(0));
    if (signatures.length > 0) {
      const sparkResult = await sql`
        SELECT story_signature,
               FLOOR(EXTRACT(EPOCH FROM (NOW() - published_at)) / ${bucketSizeSeconds})::int AS bucket_offset,
               COUNT(*)::int AS cnt
        FROM news_articles
        WHERE story_signature = ANY(${signatures as unknown as string}::text[])
          AND published_at >= NOW() - make_interval(hours => ${windowHours})
        GROUP BY story_signature, bucket_offset
      `;
      for (const row of sparkResult.rows) {
        const sig = String(row.story_signature);
        const offset = Math.floor(Number(row.bucket_offset));   // 0 = newest bucket
        const idx = sparkBucketCount - 1 - offset;               // map newest -> rightmost
        if (idx >= 0 && idx < sparkBucketCount) {
          const arr = sparkMap.get(sig);
          if (arr) arr[idx] = Number(row.cnt);
        }
      }
    }

    // ── Pull all articles in the window for these signatures ─────────
    // Used for: drawer (publication, headline, url, timestamp, triggers)
    // and for matched_trigger_types aggregation in your-coverage scope.
    interface ArticleRow {
      sig: string;
      id: string;
      title: string;
      summary: string;
      content: string;
      source: string;
      source_url: string;
      published_at: string;
    }
    const articlesByCluster = new Map<string, ArticleRow[]>();
    for (const sig of signatures) articlesByCluster.set(sig, []);
    if (signatures.length > 0) {
      const articlesResult = await sql`
        SELECT story_signature, id, title, summary, content, source, source_url, published_at
        FROM news_articles
        WHERE story_signature = ANY(${signatures as unknown as string}::text[])
          AND published_at >= NOW() - make_interval(hours => ${windowHours})
          AND (cardinality(${sourcesFilter as unknown as string}::text[]) = 0 OR source = ANY(${sourcesFilter as unknown as string}::text[]))
        ORDER BY story_signature, published_at DESC
      `;
      for (const r of articlesResult.rows) {
        const sig = String(r.story_signature);
        const arr = articlesByCluster.get(sig);
        if (!arr) continue;
        arr.push({
          sig,
          id: String(r.id),
          title: String(r.title || ''),
          summary: String(r.summary || ''),
          content: String(r.content || ''),
          source: String(r.source || ''),
          source_url: String(r.source_url || ''),
          published_at: String(r.published_at),
        });
      }
    }

    // ── Compose per-cluster rows ──────────────────────────────────────
    let clusters: ClusterRow[] = allRows.map(r => {
      const sig = String(r.story_signature);
      const articles = articlesByCluster.get(sig) || [];
      const snap = snapshotMap.get(sig);
      const mentionCount = Number(r.mention_count);
      const recentHalf = Number(r.mention_count_recent_half);
      const olderHalf = Number(r.mention_count_older_half);
      const priorPeriod = Number(r.mention_count_prior_period);

      // Saturation score: prefer cron-computed snapshot; fall back to a
      // simple combination so freshly-clustered stories without a snapshot
      // still rank reasonably.
      const fallbackScore =
        Math.min(100, Math.log10(mentionCount + 1) * 30) * 0.4 +
        Math.min(100, Math.log10(Number(r.unique_publication_count) + 1) * 40) * 0.4 +
        Math.min(100, (priorPeriod > 0 ? (mentionCount / priorPeriod) * 25 : 50)) * 0.2;
      const saturationScore = snap?.composite_score ?? Math.round(fallbackScore * 10) / 10;

      // Trend direction (used for your-coverage; harmless to compute always)
      const trendRatio = olderHalf > 0 ? recentHalf / olderHalf : (recentHalf > 0 ? Infinity : 0);
      let trendDirection: TrendDirection;
      if (trendRatio === Infinity || trendRatio >= 1.3) trendDirection = 'rising';
      else if (trendRatio <= 0.7) trendDirection = 'falling';
      else trendDirection = 'flat';

      // Trend label — concise human-readable form for the row
      let trendLabel: string;
      if (priorPeriod === 0 && mentionCount > 0) trendLabel = 'new this period';
      else if (priorPeriod > 0) {
        const pct = Math.round(((mentionCount - priorPeriod) / priorPeriod) * 100);
        trendLabel = pct >= 0 ? `+${pct}% vs prior` : `${pct}% vs prior`;
      } else {
        trendLabel = 'no change';
      }

      // Per-article trigger matching (your-coverage only)
      let clusterMatched: Set<TriggerType> = new Set();
      const articleRows: ClusterArticle[] = articles.map(a => {
        const matched: TriggerType[] = [];
        if (triggerProfile) {
          const haystack = `${a.title} ${a.summary} ${a.content.slice(0, 2000)}`;
          const m = matchTriggers(haystack, triggerProfile);
          if (m.company) { matched.push('company'); clusterMatched.add('company'); }
          if (m.product) { matched.push('product'); clusterMatched.add('product'); }
          if (m.founder) { matched.push('founder'); clusterMatched.add('founder'); }
        }
        return {
          id: a.id,
          publication: a.source,
          headline: a.title,
          url: a.source_url,
          timestamp: a.published_at,
          matched_trigger_types: matched,
        };
      });

      const deltaPct =
        priorPeriod > 0
          ? Math.round(((mentionCount - priorPeriod) / priorPeriod) * 100)
          : (mentionCount > 0 ? null : 0);

      return {
        story_signature: sig,
        rank: 0,
        cluster_title: synthesizeClusterTitle(String(r.sample_title || ''), articles),
        mention_count: mentionCount,
        mention_count_prior: priorPeriod,
        delta_pct: deltaPct,
        unique_publication_count: Number(r.unique_publication_count),
        tier_0_1_sources: Number(r.tier_0_1_sources || 0),
        status_badge: snap?.phase ?? 'sustained',
        trend_direction: trendDirection,
        trend_label: trendLabel,
        first_seen: String(r.first_seen),
        latest_mention: String(r.latest_mention),
        saturation_score: Number(saturationScore),
        matched_trigger_types: Array.from(clusterMatched),
        sparkline: sparkMap.get(sig) || new Array(sparkBucketCount).fill(0),
        articles: articleRows,
      };
    });

    // ── Scope filter ──────────────────────────────────────────────────
    if (scope === 'your-coverage') {
      clusters = clusters.filter(c => c.matched_trigger_types.length > 0);
      // Publication-level rollup: when a single publication shows multiple
      // single-mention clusters in Your Coverage, the underlying titles are
      // usually unique-per-episode (podcasts, daily newsletters) so the
      // story_signature primitive can't merge them. Roll them up into a
      // single "X mentions across {publication}" row so the user sees
      // signal density rather than fragmented one-offs. Multi-mention
      // clusters and clusters from publications with only one match are
      // left untouched.
      clusters = rollupSinglesByPublication(clusters);
    }

    // ── Rank ──────────────────────────────────────────────────────────
    if (scope === 'market-wide') {
      clusters.sort((a, b) => b.saturation_score - a.saturation_score);
    } else {
      // your-coverage: rising stories first, then by recency of latest mention
      const rank = (d: TrendDirection) => d === 'rising' ? 0 : d === 'flat' ? 1 : 2;
      clusters.sort((a, b) => {
        const r = rank(a.trend_direction!) - rank(b.trend_direction!);
        if (r !== 0) return r;
        return new Date(b.latest_mention).getTime() - new Date(a.latest_mention).getTime();
      });
    }

    clusters = clusters.slice(0, limit);
    clusters.forEach((c, i) => { c.rank = i + 1; });

    // ── Total source count for the source-filter chip in the page header
    const totalSourcesResult = await sql`
      SELECT COUNT(DISTINCT source)::int AS cnt
      FROM news_articles
      WHERE story_signature != '' AND story_signature != '__no_title__'
        AND published_at >= NOW() - make_interval(hours => ${windowHours})
    `;
    const totalSourcesCount = Number(totalSourcesResult.rows[0]?.cnt ?? 0);

    return NextResponse.json<ResponseBody>({
      scope, period,
      clusters,
      total_sources_count: totalSourcesCount,
      has_trigger_profile: !!triggerProfile,
    });
  } catch (error) {
    console.error('[story-clusters] failed:', error);
    return NextResponse.json({ error: 'Failed to load story clusters' }, { status: 500 });
  }
}

/**
 * Group single-article clusters that share a publication into one row.
 * Each input cluster has mention_count=1 and one article. We bucket by the
 * article's publication; any publication with ≥2 such buckets gets merged
 * into a synthetic cluster whose drawer lists all the original articles.
 *
 * The synthesized cluster preserves all the same shape (trend, sparkline,
 * trigger badges) so the UI doesn't need a special render path.
 */
function rollupSinglesByPublication(clusters: ClusterRow[]): ClusterRow[] {
  const singles = clusters.filter(c => c.mention_count === 1 && c.articles.length === 1);
  const rest = clusters.filter(c => !(c.mention_count === 1 && c.articles.length === 1));
  if (singles.length === 0) return clusters;

  const byPub = new Map<string, ClusterRow[]>();
  for (const c of singles) {
    const pub = c.articles[0]?.publication || '';
    if (!pub) { rest.push(c); continue; }
    const arr = byPub.get(pub) || [];
    arr.push(c);
    byPub.set(pub, arr);
  }

  const merged: ClusterRow[] = [];
  for (const [pub, group] of byPub.entries()) {
    if (group.length < 2) {
      merged.push(...group);
      continue;
    }
    // Sort by latest first so the newest article seeds the cluster identity.
    group.sort((a, b) => new Date(b.latest_mention).getTime() - new Date(a.latest_mention).getTime());
    const articles = group.flatMap(g => g.articles);
    const totalMentions = articles.length;
    const triggerSet = new Set<TriggerType>();
    for (const g of group) g.matched_trigger_types.forEach(t => triggerSet.add(t));

    // Sparkline = element-wise sum of the merged clusters' sparklines so
    // the line genuinely reflects the combined activity over the window.
    const sparkline = group[0].sparkline.map((_, i) =>
      group.reduce((acc, g) => acc + (g.sparkline[i] || 0), 0)
    );
    const tier01 = Math.max(...group.map(g => g.tier_0_1_sources));
    const firstSeen = group.reduce((min, g) =>
      new Date(g.first_seen) < new Date(min) ? g.first_seen : min, group[0].first_seen);
    const latestMention = group[0].latest_mention;
    const trendDirection = group[0].trend_direction;
    const compositeScore = group.reduce((sum, g) => sum + g.saturation_score, 0);

    merged.push({
      // Synthetic signature uniquely identifies the publication-level cluster
      // and avoids colliding with real story_signatures (which are tokenized).
      story_signature: `__pub__${pub}`,
      rank: 0,
      cluster_title: `${totalMentions} mentions across ${pub}`,
      mention_count: totalMentions,
      mention_count_prior: group.reduce((s, g) => s + g.mention_count_prior, 0),
      delta_pct: null,
      unique_publication_count: 1,
      tier_0_1_sources: tier01,
      status_badge: group[0].status_badge,
      trend_direction: trendDirection,
      trend_label: `${totalMentions} episodes / posts in this period`,
      first_seen: firstSeen,
      latest_mention: latestMention,
      saturation_score: compositeScore,
      matched_trigger_types: Array.from(triggerSet),
      sparkline,
      articles,
    });
  }

  return [...rest, ...merged];
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Map any phase value (including legacy 4-vocab values that still live in
 * saturation_snapshots from before the rewrite) onto the current 6-value
 * vocabulary. Old snapshots get refreshed by the cron, but until they do
 * the UI shouldn't break.
 */
function normalizePhase(p: string): SaturationPhase {
  switch (p) {
    case 'breaking':
    case 'building':
    case 'peak':
    case 'sustained':
    case 'cooling':
    case 'inactive':
      return p;
    case 'emerging': return 'breaking';
    case 'accelerating': return 'building';
    case 'saturated': return 'peak';
    case 'established': return 'sustained';
    case 'fading':
    case 'peaking':
      return p === 'peaking' ? 'sustained' : 'cooling';
    default: return 'sustained';
  }
}

/**
 * v1: prefer the most recent representative headline. Strip publication
 * prefixes like "Reuters: " or " - Insurance Journal" so the title reads as
 * a story summary rather than an article headline. If nothing better is
 * available, fall back to the raw sample.
 */
function synthesizeClusterTitle(sample: string, _articles: { title: string }[]): string {
  if (!sample) return '';
  let t = sample.trim();
  // Strip leading "Publication: " prefix
  t = t.replace(/^[A-Z][A-Za-z0-9 .&'-]{2,30}:\s+/, '');
  // Strip trailing " - Publication"
  t = t.replace(/\s+[-–|]\s+[A-Za-z][A-Za-z0-9 .&'-]{2,40}$/, '');
  return t;
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(raw || '');
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function pickEnum<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(raw || '') ? (raw as T) : fallback;
}

function parseCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
