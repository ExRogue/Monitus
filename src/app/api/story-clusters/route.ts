/**
 * GET /api/story-clusters
 *
 * Returns the data the redesigned Market Analyst page needs in one payload:
 * - per-phase stat counts (now and 24h ago) so the top stat cards can render deltas
 * - the cluster table rows themselves (one per story_signature) with all columns
 *
 * Each cluster row carries: latest title/source, 24h + 7d coverage with
 * yesterday delta, distinct sources / high-relevance source count, current
 * saturation phase + composite_score, average narrative_fit and max urgency
 * across the analysed articles, plus a 24-element hourly sparkline.
 *
 * Query params:
 * - limit=<n>     Cap clusters returned (1-100, default 50)
 * - window=<h>    Lookback for "current" coverage (1-168, default 24)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SaturationPhase } from '@/lib/saturation';

export const maxDuration = 30;

interface ClusterRow {
  story_signature: string;
  sample_title: string;
  primary_source: string;
  latest_at: string;
  article_count_24h: number;
  article_count_24h_yesterday: number;
  article_count_7d: number;
  distinct_sources: number;
  high_relevance_sources: number;
  phase: SaturationPhase;
  composite_score: number;
  fit_avg: number | null;
  urgency_max: number | null;
  sparkline: number[]; // 24 hourly buckets, oldest -> newest
  article_ids: string[];
}

interface PhaseCounts {
  total: number;
  emerging: number;
  accelerating: number;
  saturated: number;
  fading: number;
  established: number;
}

const ZERO_PHASES: PhaseCounts = {
  total: 0, emerging: 0, accelerating: 0, saturated: 0, fading: 0, established: 0,
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    const companyId = companyResult.rows[0]?.id as string | undefined;
    if (!companyId) {
      return NextResponse.json({ stats: { now: ZERO_PHASES, vs_yesterday: ZERO_PHASES }, clusters: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const windowHours = Math.min(168, Math.max(1, parseInt(searchParams.get('window') || '24')));

    // ── Cluster table ─────────────────────────────────────────────────
    // Aggregate news_articles by story_signature, joining signal_analyses
    // for narrative fit and urgency. Filter to clusters with activity in
    // the window so dead stories don't clog the table.
    const clusterResult = await sql`
      SELECT
        na.story_signature,
        COUNT(*)::int                                                                          AS article_count_7d,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours}))::int                AS article_count_24h,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours * 2})
                            AND na.published_at <  NOW() - make_interval(hours => ${windowHours}))::int               AS article_count_24h_yesterday,
        COUNT(DISTINCT na.source)::int                                                                AS distinct_sources,
        COUNT(DISTINCT na.source) FILTER (WHERE na.source_tier <= 1)::int                              AS high_relevance_sources,
        MAX(na.published_at)                                                                  AS latest_at,
        (array_agg(na.title  ORDER BY na.published_at DESC))[1]                                AS sample_title,
        (array_agg(na.source ORDER BY na.published_at DESC))[1]                                AS primary_source,
        (array_agg(na.id     ORDER BY na.published_at DESC))                                   AS article_ids,
        AVG(sa.narrative_fit)                                                                  AS fit_avg,
        MAX(sa.urgency)                                                                        AS urgency_max
      FROM news_articles na
      LEFT JOIN signal_analyses sa ON sa.article_id = na.id AND sa.company_id = ${companyId}
      WHERE na.story_signature != ''
        AND na.story_signature != '__no_title__'
        AND na.published_at >= NOW() - INTERVAL '7 days'
      GROUP BY na.story_signature
      HAVING COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => ${windowHours})) > 0
      ORDER BY COALESCE(MAX(sa.urgency), 0) DESC, COUNT(*) DESC
      LIMIT ${limit}
    `;

    if (clusterResult.rows.length === 0) {
      return NextResponse.json({ stats: { now: ZERO_PHASES, vs_yesterday: ZERO_PHASES }, clusters: [] });
    }

    const signatures = clusterResult.rows.map(r => String(r.story_signature));

    // ── Saturation snapshots (current state) ──────────────────────────
    // Pull the company-scoped snapshot for each signature. Phase + composite_score
    // come from the cron's persisted state, not recomputed live.
    const snapshotMap = new Map<string, { phase: SaturationPhase; composite_score: number }>();
    if (signatures.length > 0) {
      const snapResult = await sql`
        SELECT story_signature, phase, composite_score
        FROM saturation_snapshots
        WHERE company_id = ${companyId} AND story_signature = ANY(${signatures as unknown as string}::text[])
      `;
      for (const row of snapResult.rows) {
        snapshotMap.set(String(row.story_signature), {
          phase: row.phase as SaturationPhase,
          composite_score: Number(row.composite_score),
        });
      }
    }

    // ── Sparklines ────────────────────────────────────────────────────
    // One batched query: hourly counts for every signature in the last 24h.
    // Then bucket-fill into 24-element arrays so the SVG path is deterministic.
    const sparkMap = new Map<string, number[]>();
    for (const sig of signatures) sparkMap.set(sig, new Array(24).fill(0));

    if (signatures.length > 0) {
      const sparkResult = await sql`
        SELECT
          story_signature,
          EXTRACT(EPOCH FROM (NOW() - date_trunc('hour', published_at))) / 3600 AS hours_ago,
          COUNT(*)::int AS cnt
        FROM news_articles
        WHERE story_signature = ANY(${signatures as unknown as string}::text[])
          AND published_at >= NOW() - INTERVAL '24 hours'
        GROUP BY story_signature, date_trunc('hour', published_at)
      `;
      for (const row of sparkResult.rows) {
        const sig = String(row.story_signature);
        const hoursAgo = Math.floor(Number(row.hours_ago));
        const idx = 23 - hoursAgo; // hours_ago=0 -> rightmost (newest)
        if (idx >= 0 && idx < 24) {
          const arr = sparkMap.get(sig);
          if (arr) arr[idx] = Number(row.cnt);
        }
      }
    }

    // ── Compose cluster rows ──────────────────────────────────────────
    const clusters: ClusterRow[] = clusterResult.rows.map(r => {
      const sig = String(r.story_signature);
      const snap = snapshotMap.get(sig);
      // Fit comes back as a string from AVG; coerce. narrative_fit is 0-10 in DB; scale to 0-100.
      const fitRaw = r.fit_avg !== null && r.fit_avg !== undefined ? Number(r.fit_avg) : null;
      const fit_avg = fitRaw !== null ? Math.round(fitRaw * 10) : null;
      return {
        story_signature: sig,
        sample_title: String(r.sample_title || ''),
        primary_source: String(r.primary_source || ''),
        latest_at: String(r.latest_at),
        article_count_24h: Number(r.article_count_24h),
        article_count_24h_yesterday: Number(r.article_count_24h_yesterday),
        article_count_7d: Number(r.article_count_7d),
        distinct_sources: Number(r.distinct_sources),
        high_relevance_sources: Number(r.high_relevance_sources),
        phase: (snap?.phase || 'established') as SaturationPhase,
        composite_score: snap?.composite_score ?? 0,
        fit_avg,
        urgency_max: r.urgency_max !== null && r.urgency_max !== undefined ? Number(r.urgency_max) : null,
        sparkline: sparkMap.get(sig) || new Array(24).fill(0),
        article_ids: Array.isArray(r.article_ids) ? r.article_ids.map(String) : [],
      };
    });

    // ── Stat counts (now and ~24h ago) ────────────────────────────────
    // Snapshots are upserted in place, so "yesterday" must be reconstructed
    // by counting clusters whose phase WOULD HAVE BEEN X based on prior-window
    // article counts. Cheaper alternative: count clusters in each phase from
    // the live cluster set, and infer yesterday counts by comparing 24h vs
    // 24-48h coverage delta sign + magnitude. We use the simple version: the
    // cluster's current phase is its "now" bucket, and "yesterday" is derived
    // from a parallel SQL pass over the prior window.
    const now: PhaseCounts = { ...ZERO_PHASES };
    for (const c of clusters) {
      now.total++;
      if (c.phase === 'emerging') now.emerging++;
      else if (c.phase === 'accelerating') now.accelerating++;
      else if (c.phase === 'saturated') now.saturated++;
      else if (c.phase === 'fading') now.fading++;
      else if (c.phase === 'established') now.established++;
    }

    // For yesterday's stat-card counters: re-run the cluster query with
    // window shifted by 24h, then re-classify each cluster's phase using
    // the same library logic. Keep it cheap by skipping fit/urgency joins.
    const yesterdayCountsResult = await sql`
      SELECT
        na.story_signature,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => 30)
                            AND na.published_at <  NOW() - make_interval(hours => 24))::int AS count_6h_y,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => 48)
                            AND na.published_at <  NOW() - make_interval(hours => 24))::int AS count_24h_y,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - INTERVAL '8 days'
                            AND na.published_at <  NOW() - make_interval(hours => 24))::int AS count_7d_y,
        COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => 36)
                            AND na.published_at <  NOW() - make_interval(hours => 30))::int AS count_prev_6h_y
      FROM news_articles na
      WHERE na.story_signature != ''
        AND na.story_signature != '__no_title__'
        AND na.published_at >= NOW() - INTERVAL '8 days'
        AND na.published_at <  NOW() - make_interval(hours => 24)
      GROUP BY na.story_signature
      HAVING COUNT(*) FILTER (WHERE na.published_at >= NOW() - make_interval(hours => 48)
                                AND na.published_at <  NOW() - make_interval(hours => 24)) > 0
    `;

    const vs_yesterday: PhaseCounts = { ...ZERO_PHASES };
    for (const r of yesterdayCountsResult.rows) {
      const c6 = Number(r.count_6h_y);
      const c24 = Number(r.count_24h_y);
      const c7d = Number(r.count_7d_y);
      const cprev = Number(r.count_prev_6h_y);
      const v6 = c6 / 6;
      const v24 = c24 / 24;
      const vprev = cprev / 6;
      const accel = vprev > 0 ? v6 / vprev : (v6 > 0 ? 999 : 0);
      const phase = classifyPhaseFromCounts(c6, c24, c7d, v6, v24, accel);

      vs_yesterday.total++;
      if (phase === 'emerging') vs_yesterday.emerging++;
      else if (phase === 'accelerating') vs_yesterday.accelerating++;
      else if (phase === 'saturated') vs_yesterday.saturated++;
      else if (phase === 'fading') vs_yesterday.fading++;
      else if (phase === 'established') vs_yesterday.established++;
    }

    return NextResponse.json({
      stats: { now, vs_yesterday },
      clusters,
      window_hours: windowHours,
    });
  } catch (error) {
    console.error('[story-clusters] failed:', error);
    return NextResponse.json({ error: 'Failed to load story clusters' }, { status: 500 });
  }
}

// Mirror of classifyPhase from saturation.ts — kept here to avoid pulling
// the full VolumeSaturation type into the endpoint and to make the
// "yesterday" reclassification self-contained.
function classifyPhaseFromCounts(
  c6: number, c24: number, c7d: number,
  v6: number, v24: number, accel: number,
): SaturationPhase {
  if (c24 === 0 && c7d === 0) return 'inactive';
  if (c24 >= 45) return 'saturated';
  if (accel >= 2.0 && c6 >= 3 && c24 >= 5) return 'accelerating';
  if (v24 > 0 && v6 / v24 >= 1.5 && c24 < 10 && c6 >= 1) return 'emerging';
  if (v24 > 0 && v6 / v24 <= 0.4) return 'fading';
  return 'established';
}
