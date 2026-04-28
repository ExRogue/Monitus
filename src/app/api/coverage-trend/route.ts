/**
 * GET /api/coverage-trend
 *
 * Trend chart data for Story Saturation > Your Coverage.
 *
 * Returns daily mention counts over the period segmented by trigger type
 * (company, product, founder), plus the prior-equivalent-period total
 * for delta comparison ("last 7 days vs previous 7 days").
 *
 * Articles are matched against the company's trigger profile (company name +
 * variants, products, founders) read from the narrative profile via
 * src/lib/triggers.ts.
 *
 * Query params
 *   period  = 7d | 14d | 30d  (default 7d)
 *   sources = comma-separated source names (default all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getTriggerProfile, matchTriggers, anyTriggerMatched } from '@/lib/triggers';

export const maxDuration = 30;

type Period = '7d' | '14d' | '30d';

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '14d': 14, '30d': 30 };

interface TrendBucket {
  /** ISO date for the bucket (YYYY-MM-DD UTC) */
  date: string;
  company: number;
  product: number;
  founder: number;
  total: number;
}

interface TrendResponse {
  period: Period;
  buckets: TrendBucket[];          // ordered oldest -> newest, length = period days
  current_total: number;           // sum of total across buckets
  prior_total: number;             // total across the prior-equivalent period
  delta_pct: number | null;        // (current - prior) / prior * 100, null if prior is 0
  by_type: { company: number; product: number; founder: number };  // current period totals
  by_type_prior: { company: number; product: number; founder: number };
  has_trigger_profile: boolean;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    const companyId = companyResult.rows[0]?.id as string | undefined;
    if (!companyId) {
      return emptyResponse('7d');
    }

    const { searchParams } = new URL(request.url);
    const period = pickEnum<Period>(searchParams.get('period'), ['7d', '14d', '30d'], '7d');
    const sourcesFilter = parseCsv(searchParams.get('sources'));

    const profile = await getTriggerProfile(companyId);
    if (!profile) {
      const empty = emptyResponse(period);
      const body = await empty.json() as TrendResponse;
      return NextResponse.json({ ...body, has_trigger_profile: false });
    }

    const days = PERIOD_DAYS[period];

    // Pull every article in the current + prior period, then bucket in JS.
    // ~30 days of data tops, even on the busiest companies that's a few thousand
    // rows. Trade off: simpler than a SQL CASE-per-trigger pre-aggregation.
    const articleResult = await sql`
      SELECT id, title, summary, content, source, published_at
      FROM news_articles
      WHERE published_at >= NOW() - make_interval(days => ${days * 2})
        AND published_at <  NOW()
        AND (cardinality(${sourcesFilter as unknown as string}::text[]) = 0 OR source = ANY(${sourcesFilter as unknown as string}::text[]))
    `;

    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const priorStart = new Date(now.getTime() - days * 2 * 24 * 3600 * 1000);

    // Initialise empty daily buckets for the current period.
    const buckets: TrendBucket[] = [];
    const bucketIndex = new Map<string, TrendBucket>();
    for (let i = 0; i < days; i++) {
      const d = new Date(periodStart.getTime() + i * 24 * 3600 * 1000);
      const iso = d.toISOString().slice(0, 10);
      const bucket: TrendBucket = { date: iso, company: 0, product: 0, founder: 0, total: 0 };
      buckets.push(bucket);
      bucketIndex.set(iso, bucket);
    }

    let priorCompany = 0, priorProduct = 0, priorFounder = 0, priorTotal = 0;

    for (const r of articleResult.rows) {
      const haystack = `${r.title || ''} ${r.summary || ''} ${String(r.content || '').slice(0, 2000)}`;
      const m = matchTriggers(haystack, profile);
      if (!anyTriggerMatched(m)) continue;

      const t = new Date(String(r.published_at));
      if (t >= periodStart && t < now) {
        const iso = t.toISOString().slice(0, 10);
        const bucket = bucketIndex.get(iso);
        if (bucket) {
          if (m.company) bucket.company++;
          if (m.product) bucket.product++;
          if (m.founder) bucket.founder++;
          bucket.total++;
        }
      } else if (t >= priorStart && t < periodStart) {
        if (m.company) priorCompany++;
        if (m.product) priorProduct++;
        if (m.founder) priorFounder++;
        priorTotal++;
      }
    }

    const currentByType = buckets.reduce(
      (acc, b) => ({ company: acc.company + b.company, product: acc.product + b.product, founder: acc.founder + b.founder }),
      { company: 0, product: 0, founder: 0 },
    );
    const currentTotal = buckets.reduce((acc, b) => acc + b.total, 0);
    const deltaPct = priorTotal > 0
      ? Math.round(((currentTotal - priorTotal) / priorTotal) * 100)
      : (currentTotal > 0 ? null : 0);

    const body: TrendResponse = {
      period,
      buckets,
      current_total: currentTotal,
      prior_total: priorTotal,
      delta_pct: deltaPct,
      by_type: currentByType,
      by_type_prior: { company: priorCompany, product: priorProduct, founder: priorFounder },
      has_trigger_profile: true,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('[coverage-trend] failed:', error);
    return NextResponse.json({ error: 'Failed to load coverage trend' }, { status: 500 });
  }
}

function emptyResponse(period: Period): NextResponse {
  const body: TrendResponse = {
    period,
    buckets: [],
    current_total: 0,
    prior_total: 0,
    delta_pct: 0,
    by_type: { company: 0, product: 0, founder: 0 },
    by_type_prior: { company: 0, product: 0, founder: 0 },
    has_trigger_profile: true,
  };
  return NextResponse.json(body);
}

function pickEnum<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(raw || '') ? (raw as T) : fallback;
}

function parseCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
