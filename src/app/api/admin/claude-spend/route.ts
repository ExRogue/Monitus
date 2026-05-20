/**
 * GET /api/admin/claude-spend
 *
 * Admin-only spend summary derived from the claude_usage table. Returns:
 *   - today, yesterday, MTD totals in USD
 *   - end-of-month projection (MTD × daysInMonth / daysElapsed)
 *   - 7-day rolling daily breakdown
 *   - per-route and per-model breakdowns (last 30 days)
 *   - per-company breakdown (last 30 days)
 *
 * Cost is stored as USD micro-dollars (× 1,000,000) in the table; we divide
 * once at the edge so the response is in plain USD with 4 decimals.
 */
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { countActiveAccounts } from '@/lib/active-accounts';

export const runtime = 'nodejs';
export const maxDuration = 30;

function micros(value: unknown): number {
  return Number(value ?? 0) / 1_000_000;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Make sure the schema is present even on first hit
  await getDb();

  // Single-row "current period" aggregates so we avoid 6 separate queries.
  // All TIMESTAMP columns are interpreted in UTC.
  const summaryResult = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW()) THEN cost_usd_micros END), 0) AS today_micros,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW()) THEN input_tokens END), 0) AS today_input,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW()) THEN output_tokens END), 0) AS today_output,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW() - INTERVAL '1 day')
                         AND created_at <  date_trunc('day', NOW())
                        THEN cost_usd_micros END), 0) AS yesterday_micros,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN cost_usd_micros END), 0) AS mtd_micros,
      COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days'  THEN cost_usd_micros END), 0) AS last7d_micros,
      COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN cost_usd_micros END), 0) AS last30d_micros,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS today_calls,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS mtd_calls
    FROM claude_usage
  `;
  const summary = summaryResult.rows[0] ?? {};

  // Daily breakdown for the trailing 7 days, oldest first
  const dailyResult = await sql`
    SELECT
      date_trunc('day', created_at)::date AS day,
      SUM(cost_usd_micros) AS micros,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(cache_read_tokens) AS cache_read_tokens,
      SUM(cache_creation_tokens) AS cache_creation_tokens,
      COUNT(*) AS calls
    FROM claude_usage
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY day
    ORDER BY day ASC
  `;

  // Per-route (last 30 days) — surfaces the biggest cost centres
  const routeResult = await sql`
    SELECT route,
           SUM(cost_usd_micros) AS micros,
           COUNT(*) AS calls,
           SUM(input_tokens) AS input_tokens,
           SUM(output_tokens) AS output_tokens
    FROM claude_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY route
    ORDER BY micros DESC
    LIMIT 30
  `;

  // Per-model (last 30 days)
  const modelResult = await sql`
    SELECT model,
           SUM(cost_usd_micros) AS micros,
           COUNT(*) AS calls,
           SUM(input_tokens) AS input_tokens,
           SUM(output_tokens) AS output_tokens
    FROM claude_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY model
    ORDER BY micros DESC
  `;

  // Per-company (last 30 days) — null company_id rolls up as "(no company)"
  const companyResult = await sql`
    SELECT
      COALESCE(c.name, '(no company)') AS company_name,
      cu.company_id,
      SUM(cu.cost_usd_micros) AS micros,
      COUNT(*) AS calls
    FROM claude_usage cu
    LEFT JOIN companies c ON c.id = cu.company_id
    WHERE cu.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY cu.company_id, c.name
    ORDER BY micros DESC
    LIMIT 20
  `;

  // Distinct accounts that actually triggered Claude — different from "active
  // accounts billable in the DB". If billable > triggered, customers aren't
  // engaging. If triggered > billable, we're leaking spend on stale accounts.
  const accountActivityResult = await sql`
    SELECT
      COUNT(DISTINCT company_id) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS triggered_today,
      COUNT(DISTINCT company_id) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS triggered_mtd,
      COUNT(DISTINCT company_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS triggered_last7d
    FROM claude_usage
    WHERE company_id IS NOT NULL
  `;
  const activity = accountActivityResult.rows[0] ?? {};
  const triggeredToday = Number(activity.triggered_today ?? 0);
  const triggeredMtd = Number(activity.triggered_mtd ?? 0);
  const triggeredLast7d = Number(activity.triggered_last7d ?? 0);
  const activeBillableAccounts = await countActiveAccounts();

  // End-of-month projection: MTD × daysInMonth / daysElapsed.
  // Uses Postgres now() so it matches whatever timezone the DB reports.
  const now = new Date();
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
  const dayOfMonth = now.getUTCDate();
  const mtdUsd = micros(summary.mtd_micros);
  const projectedEomUsd = dayOfMonth > 0 ? (mtdUsd / dayOfMonth) * daysInMonth : 0;

  // 7-day rolling daily avg
  const last7dUsd = micros(summary.last7d_micros);
  const dailyAvg7d = last7dUsd / 7;

  // Per-account unit economics. Two slightly different denominators on
  // purpose: today's $/account uses today's triggered count (what we actually
  // spent on), while EOM projection uses MTD triggered count (a wider base
  // that smooths out single-day spikes).
  const todayUsd = micros(summary.today_micros);
  const todayPerAccountUsd = triggeredToday > 0 ? todayUsd / triggeredToday : 0;
  const projectedPerAccountUsd = triggeredMtd > 0 ? projectedEomUsd / triggeredMtd : 0;

  return NextResponse.json({
    generatedAt: now.toISOString(),
    summary: {
      todayUsd,
      todayCalls: Number(summary.today_calls ?? 0),
      todayInputTokens: Number(summary.today_input ?? 0),
      todayOutputTokens: Number(summary.today_output ?? 0),
      yesterdayUsd: micros(summary.yesterday_micros),
      mtdUsd,
      mtdCalls: Number(summary.mtd_calls ?? 0),
      last7dUsd,
      last30dUsd: micros(summary.last30d_micros),
      dailyAvg7dUsd: dailyAvg7d,
      projectedEomUsd,
      daysInMonth,
      dayOfMonth,
    },
    accounts: {
      activeBillable: activeBillableAccounts,
      triggeredToday,
      triggeredMtd,
      triggeredLast7d,
      todayPerAccountUsd,
      projectedPerAccountUsd,
    },
    daily: dailyResult.rows.map(r => ({
      day: r.day,
      usd: micros(r.micros),
      calls: Number(r.calls ?? 0),
      inputTokens: Number(r.input_tokens ?? 0),
      outputTokens: Number(r.output_tokens ?? 0),
      cacheReadTokens: Number(r.cache_read_tokens ?? 0),
      cacheCreationTokens: Number(r.cache_creation_tokens ?? 0),
    })),
    byRoute: routeResult.rows.map(r => ({
      route: String(r.route),
      usd: micros(r.micros),
      calls: Number(r.calls ?? 0),
      inputTokens: Number(r.input_tokens ?? 0),
      outputTokens: Number(r.output_tokens ?? 0),
    })),
    byModel: modelResult.rows.map(r => ({
      model: String(r.model),
      usd: micros(r.micros),
      calls: Number(r.calls ?? 0),
      inputTokens: Number(r.input_tokens ?? 0),
      outputTokens: Number(r.output_tokens ?? 0),
    })),
    byCompany: companyResult.rows.map(r => ({
      companyName: String(r.company_name),
      companyId: r.company_id ? String(r.company_id) : null,
      usd: micros(r.micros),
      calls: Number(r.calls ?? 0),
    })),
  });
}
