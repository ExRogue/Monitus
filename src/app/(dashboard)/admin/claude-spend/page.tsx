'use client';
/**
 * Admin Claude spend dashboard.
 *
 * Reads /api/admin/claude-spend (admin-gated) and renders the four numbers
 * you actually care about — today, MTD, 7-day avg, end-of-month projection —
 * plus per-route, per-model, and per-company breakdowns so you can see where
 * the spend is going.
 *
 * Auto-refreshes every 60s while the tab is visible.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, DollarSign, TrendingUp, Calendar, Activity, Users, Wallet } from 'lucide-react';

interface SpendSummary {
  todayUsd: number;
  todayCalls: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  yesterdayUsd: number;
  mtdUsd: number;
  mtdCalls: number;
  last7dUsd: number;
  last30dUsd: number;
  dailyAvg7dUsd: number;
  projectedEomUsd: number;
  daysInMonth: number;
  dayOfMonth: number;
}

interface DailyRow {
  day: string;
  usd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

interface RouteRow {
  route: string;
  usd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

interface ModelRow {
  model: string;
  usd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

interface CompanyRow {
  companyName: string;
  companyId: string | null;
  usd: number;
  calls: number;
}

interface AccountStats {
  activeBillable: number;
  triggeredToday: number;
  triggeredMtd: number;
  triggeredLast7d: number;
  todayPerAccountUsd: number;
  projectedPerAccountUsd: number;
}

interface SpendResponse {
  generatedAt: string;
  summary: SpendSummary;
  accounts: AccountStats;
  daily: DailyRow[];
  byRoute: RouteRow[];
  byModel: ModelRow[];
  byCompany: CompanyRow[];
}

function fmtUsd(n: number, fractionDigits = 2): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString();
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ClaudeSpendPage() {
  const [data, setData] = useState<SpendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setRefreshing(true);
      const r = await fetch('/api/admin/claude-spend');
      if (r.status === 403) {
        setError('Forbidden — admin only.');
        setData(null);
        return;
      }
      if (!r.ok) {
        setError(`Failed to load (HTTP ${r.status})`);
        return;
      }
      const json = (await r.json()) as SpendResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-400 mb-1">Could not load spend data</div>
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, accounts, daily, byRoute, byModel, byCompany } = data;
  const todayVsYesterday = summary.yesterdayUsd > 0 ? ((summary.todayUsd - summary.yesterdayUsd) / summary.yesterdayUsd) * 100 : null;
  const maxDailyUsd = Math.max(...daily.map(d => d.usd), 0.001);
  // Coverage = of all billable accounts, how many actually used Claude today?
  // Low coverage = engagement problem; high coverage = healthy usage.
  const coverageToday = accounts.activeBillable > 0
    ? Math.round((accounts.triggeredToday / accounts.activeBillable) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-3">
            <ArrowLeft className="w-3 h-3" />
            Back to Admin
          </Link>
          <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] mb-1">ADMIN · COST</div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Claude API spend</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Live token usage and cost across every Claude call. Updates from the <code className="text-[11px] bg-[var(--navy-light)] px-1.5 py-0.5 rounded">claude_usage</code> table.
          </p>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--navy-light)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Big numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SpendCard
          label="Today"
          value={fmtUsd(summary.todayUsd)}
          icon={DollarSign}
          accent="#3AAF7C"
          sublabel={`${fmtInt(summary.todayCalls)} calls · ${fmtTokens(summary.todayInputTokens + summary.todayOutputTokens)} tokens`}
          delta={todayVsYesterday}
        />
        <SpendCard
          label="Month to date"
          value={fmtUsd(summary.mtdUsd)}
          icon={Calendar}
          accent="#7DC4BD"
          sublabel={`${fmtInt(summary.mtdCalls)} calls · day ${summary.dayOfMonth} of ${summary.daysInMonth}`}
        />
        <SpendCard
          label="7-day avg / day"
          value={fmtUsd(summary.dailyAvg7dUsd)}
          icon={Activity}
          accent="#4A9E96"
          sublabel={`${fmtUsd(summary.last7dUsd)} over last 7 days`}
        />
        <SpendCard
          label="End-of-month projection"
          value={fmtUsd(summary.projectedEomUsd, 0)}
          icon={TrendingUp}
          accent="#8B5CF6"
          sublabel={`Based on MTD spend × ${summary.daysInMonth} ÷ ${summary.dayOfMonth}`}
        />
      </div>

      {/* Per-account unit economics */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <Wallet className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Per-account economics</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UnitCard
            label="Active billable accounts"
            value={fmtInt(accounts.activeBillable)}
            sublabel="Not disabled · in trial or with active subscription"
            icon={Users}
            accent="#7DC4BD"
          />
          <UnitCard
            label="Triggered Claude today"
            value={fmtInt(accounts.triggeredToday)}
            sublabel={`${coverageToday}% of billable accounts used Claude today`}
            icon={Activity}
            accent="#4A9E96"
          />
          <UnitCard
            label="Today $/account"
            value={fmtUsd(accounts.todayPerAccountUsd, accounts.todayPerAccountUsd < 1 ? 3 : 2)}
            sublabel={`${fmtUsd(summary.todayUsd)} ÷ ${accounts.triggeredToday} accounts that ran Claude today`}
            icon={DollarSign}
            accent="#3AAF7C"
          />
          <UnitCard
            label="Projected $/account this month"
            value={fmtUsd(accounts.projectedPerAccountUsd, accounts.projectedPerAccountUsd < 1 ? 3 : 2)}
            sublabel={`${fmtUsd(summary.projectedEomUsd, 0)} EOM projection ÷ ${accounts.triggeredMtd} MTD active accounts`}
            icon={TrendingUp}
            accent="#8B5CF6"
          />
        </div>
        {accounts.activeBillable > 0 && accounts.triggeredMtd > accounts.activeBillable && (
          <div className="mt-4 flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Heads up:</strong> {accounts.triggeredMtd} accounts triggered Claude this month but only {accounts.activeBillable} are billable. That suggests dormant/expired-trial accounts are still being processed. (The cron filter should have caught this — investigate.)
            </div>
          </div>
        )}
      </div>

      {/* Daily bar chart */}
      <section className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Last 7 days</h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Updated {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        </div>
        {daily.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No usage in the last 7 days.</p>
        ) : (
          <div className="space-y-2">
            {daily.map(d => {
              const pct = (d.usd / maxDailyUsd) * 100;
              return (
                <div key={d.day} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-3 sm:col-span-2 text-xs text-[var(--text-secondary)]">{fmtDay(d.day)}</div>
                  <div className="col-span-6 sm:col-span-8">
                    <div className="h-6 bg-[var(--navy)] rounded relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] transition-all"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <div className="text-sm font-mono font-medium text-[var(--text-primary)]">{fmtUsd(d.usd, d.usd < 1 ? 3 : 2)}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{fmtInt(d.calls)} calls</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Per route + per model side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <BreakdownTable
          title="Top routes (last 30 days)"
          rows={byRoute.map(r => ({
            label: r.route,
            sublabel: `${fmtInt(r.calls)} calls · ${fmtTokens(r.inputTokens)} in · ${fmtTokens(r.outputTokens)} out`,
            usd: r.usd,
          }))}
          emptyText="No Claude calls in the last 30 days."
        />
        <BreakdownTable
          title="By model (last 30 days)"
          rows={byModel.map(m => ({
            label: m.model,
            sublabel: `${fmtInt(m.calls)} calls · ${fmtTokens(m.inputTokens)} in · ${fmtTokens(m.outputTokens)} out`,
            usd: m.usd,
          }))}
          emptyText="No Claude calls in the last 30 days."
        />
      </div>

      {/* Per company */}
      <BreakdownTable
        title="Top companies (last 30 days)"
        rows={byCompany.map(c => ({
          label: c.companyName,
          sublabel: c.companyId ? `${fmtInt(c.calls)} calls · ${c.companyId.slice(0, 8)}…` : `${fmtInt(c.calls)} calls`,
          usd: c.usd,
        }))}
        emptyText="No per-company attribution in the last 30 days."
      />
    </div>
  );
}

function SpendCard({
  label,
  value,
  icon: Icon,
  accent,
  sublabel,
  delta,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  sublabel: string;
  delta?: number | null;
}) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--text-secondary)]/60">{label}</span>
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mb-1">{value}</div>
      <div className="text-xs text-[var(--text-secondary)]">{sublabel}</div>
      {typeof delta === 'number' && (
        <div className={`text-[11px] font-medium mt-1 ${delta >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(0)}% vs yesterday
        </div>
      )}
    </div>
  );
}

function UnitCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}) {
  return (
    <div className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--text-secondary)]/60">{label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
      </div>
      <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mb-1">{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] leading-snug">{sublabel}</div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: { label: string; sublabel: string; usd: number }[];
  emptyText: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.usd, 0);
  return (
    <section className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{emptyText}</p>
      ) : (
        <div className="space-y-1">
          {rows.map(r => {
            const pct = total > 0 ? (r.usd / total) * 100 : 0;
            return (
              <div key={r.label} className="grid grid-cols-12 items-center gap-3 py-2 border-b border-[var(--border)]/40 last:border-b-0">
                <div className="col-span-7 sm:col-span-6 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{r.label}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">{r.sublabel}</div>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <div className="h-1.5 bg-[var(--navy)] rounded overflow-hidden">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-3 text-right">
                  <div className="text-sm font-mono font-medium text-[var(--text-primary)]">{fmtUsd(r.usd, r.usd < 1 ? 3 : 2)}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{pct.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
