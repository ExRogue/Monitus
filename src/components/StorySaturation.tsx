'use client';

import { useEffect, useState } from 'react';
import {
  Activity, ChevronDown, ChevronRight, ExternalLink, Loader2,
  Minus, Rocket, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import CoverageTrendChart from './CoverageTrendChart';

// ── Types (mirror the API shapes; kept narrow on purpose) ────────────

export type Period = '7d' | '14d' | '30d';
type Phase = 'breaking' | 'building' | 'peak' | 'sustained' | 'cooling' | 'inactive';
type TrendDirection = 'rising' | 'flat' | 'falling';
type TriggerType = 'company' | 'product' | 'founder';

interface ClusterArticle {
  id: string;
  publication: string;
  headline: string;
  url: string;
  timestamp: string;
  matched_trigger_types: TriggerType[];
}

interface Cluster {
  story_signature: string;
  rank: number;
  cluster_title: string;
  mention_count: number;
  unique_publication_count: number;
  status_badge: Phase;
  trend_direction?: TrendDirection;
  trend_label?: string;
  first_seen: string;
  latest_mention: string;
  saturation_score: number;
  matched_trigger_types: TriggerType[];
  articles: ClusterArticle[];
}

interface ClustersResponse {
  scope: 'market-wide' | 'your-coverage';
  period: Period;
  clusters: Cluster[];
  total_sources_count: number;
  has_trigger_profile: boolean;
}

interface TrendBucket { date: string; company: number; product: number; founder: number; total: number; }
interface TrendResponse {
  period: Period;
  buckets: TrendBucket[];
  current_total: number;
  prior_total: number;
  delta_pct: number | null;
  by_type: { company: number; product: number; founder: number };
  by_type_prior: { company: number; product: number; founder: number };
  has_trigger_profile: boolean;
}

// ── Phase + trend visual metadata ────────────────────────────────────

const PHASE_META: Record<Phase, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  breaking:  { label: 'Breaking',  color: 'text-red-300 bg-red-500/15 border-red-400/30',         icon: Zap },
  building:  { label: 'Building',  color: 'text-amber-300 bg-amber-500/15 border-amber-400/30',   icon: TrendingUp },
  peak:      { label: 'Peak',      color: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30', icon: Activity },
  sustained: { label: 'Sustained', color: 'text-blue-300 bg-blue-500/15 border-blue-400/30',      icon: Minus },
  cooling:   { label: 'Cooling',   color: 'text-slate-300 bg-slate-500/15 border-slate-400/30',   icon: TrendingDown },
  inactive:  { label: 'Inactive',  color: 'text-slate-400 bg-slate-500/10 border-slate-400/20',   icon: Minus },
};

const TREND_META: Record<TrendDirection, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  rising:  { label: 'Rising',  color: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30', icon: TrendingUp },
  flat:    { label: 'Flat',    color: 'text-slate-300 bg-slate-500/15 border-slate-400/30',       icon: Minus },
  falling: { label: 'Falling', color: 'text-red-300 bg-red-500/15 border-red-400/30',             icon: TrendingDown },
};

const TRIGGER_TONE: Record<TriggerType, string> = {
  company: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
  product: 'text-amber-300 bg-amber-500/10 border-amber-400/30',
  founder: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/30',
};

// ── Top-level component (sub-tabs Market-wide / Your Coverage) ───────

export type StorySaturationTab = 'market-wide' | 'your-coverage';

interface StorySaturationProps {
  period: Period;
  sources: string[];
}

export default function StorySaturation({ period, sources }: StorySaturationProps) {
  const [tab, setTab] = useState<StorySaturationTab>('market-wide');

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex border-b border-[var(--border)]">
        <SubTabButton active={tab === 'market-wide'} onClick={() => setTab('market-wide')}>
          Market-wide
        </SubTabButton>
        <SubTabButton active={tab === 'your-coverage'} onClick={() => setTab('your-coverage')}>
          Your Coverage
        </SubTabButton>
      </div>

      {tab === 'market-wide' && <MarketWideView period={period} sources={sources} />}
      {tab === 'your-coverage' && <YourCoverageView period={period} sources={sources} />}
    </div>
  );
}

function SubTabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-[var(--accent)] text-[var(--accent)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

// ── Market-wide view ─────────────────────────────────────────────────

function MarketWideView({ period, sources }: { period: Period; sources: string[] }) {
  const { data, loading } = useClusters('market-wide', period, sources);

  if (loading) return <SaturationLoading message="Loading saturated stories…" />;
  if (!data || data.clusters.length === 0) {
    return (
      <EmptyState
        title="No saturated stories yet."
        body="Single-article stories are excluded. Stories appear here once two or more monitored publications cover the same event."
      />
    );
  }
  return <ClusterTable clusters={data.clusters} variant="market-wide" />;
}

// ── Your Coverage view ───────────────────────────────────────────────

function YourCoverageView({ period, sources }: { period: Period; sources: string[] }) {
  const clustersQuery = useClusters('your-coverage', period, sources);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    setTrendLoading(true);
    const params = new URLSearchParams({ period });
    if (sources.length > 0) params.set('sources', sources.join(','));
    fetch(`/api/coverage-trend?${params.toString()}`)
      .then(r => r.json())
      .then((payload: TrendResponse) => setTrend(payload))
      .catch(() => setTrend(null))
      .finally(() => setTrendLoading(false));
  }, [period, sources]);

  if (clustersQuery.loading || trendLoading) {
    return <SaturationLoading message="Computing your coverage…" />;
  }

  if (clustersQuery.data && !clustersQuery.data.has_trigger_profile) {
    return (
      <EmptyState
        title="Add trigger terms to your narrative profile."
        body="Your Coverage matches articles against your company name, product names, and founder names. Set those in Narrative to start tracking."
      />
    );
  }

  return (
    <div className="space-y-4">
      {trend && (
        <CoverageTrendChart
          buckets={trend.buckets}
          currentTotal={trend.current_total}
          priorTotal={trend.prior_total}
          deltaPct={trend.delta_pct}
          byType={trend.by_type}
        />
      )}
      {clustersQuery.data && clustersQuery.data.clusters.length > 0 ? (
        <ClusterTable clusters={clustersQuery.data.clusters} variant="your-coverage" />
      ) : (
        <EmptyState
          title="No matching coverage in this period."
          body="Articles from your monitored sources haven't mentioned your company, products, or founders yet. Try widening the period."
        />
      )}
    </div>
  );
}

// ── Cluster table (shared between sub-tabs) ──────────────────────────

function ClusterTable({ clusters, variant }: { clusters: Cluster[]; variant: 'market-wide' | 'your-coverage' }) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] border-b border-[var(--border)]">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Story</div>
        <div className="col-span-2">{variant === 'market-wide' ? 'Saturation' : 'Trend'}</div>
        <div className="col-span-1 text-right">Mentions</div>
        <div className="col-span-1 text-right">Sources</div>
        <div className="col-span-2">Time window</div>
      </div>
      <div>
        {clusters.map(c => (
          <ClusterRow key={c.story_signature} cluster={c} variant={variant} />
        ))}
      </div>
    </div>
  );
}

function ClusterRow({ cluster, variant }: { cluster: Cluster; variant: 'market-wide' | 'your-coverage' }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-[var(--border)] first:border-t-0">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[var(--navy-lighter)]/40 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="col-span-1 text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{cluster.rank}</span>
        </div>
        <div className="col-span-5 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{cluster.cluster_title}</p>
          {cluster.trend_label && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{cluster.trend_label}</p>
          )}
          {variant === 'your-coverage' && cluster.matched_trigger_types.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {cluster.matched_trigger_types.map(t => (
                <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded border ${TRIGGER_TONE[t]}`}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-2 min-w-0">
          {variant === 'market-wide'
            ? <PhaseBadge phase={cluster.status_badge} />
            : <TrendBadge direction={cluster.trend_direction || 'flat'} />}
        </div>
        <div className="col-span-1 text-right text-sm font-semibold text-[var(--text-primary)]">
          {cluster.mention_count}
        </div>
        <div className="col-span-1 text-right text-sm font-semibold text-[var(--text-primary)]">
          {cluster.unique_publication_count}
        </div>
        <div className="col-span-2 text-xs text-[var(--text-secondary)] leading-tight">
          <p>First {relative(cluster.first_seen)} ago</p>
          <p className="mt-0.5">Latest {relative(cluster.latest_mention)} ago</p>
        </div>
      </button>
      {expanded && <SourcesDrawer cluster={cluster} variant={variant} />}
    </div>
  );
}

function SourcesDrawer({ cluster, variant }: { cluster: Cluster; variant: 'market-wide' | 'your-coverage' }) {
  if (cluster.articles.length === 0) {
    return (
      <div className="px-4 pb-3 pl-12 text-xs text-[var(--text-secondary)]">
        No source articles indexed for this cluster.
      </div>
    );
  }
  return (
    <div className="px-4 pb-4 pl-12 bg-[var(--navy-lighter)]/30">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] py-2">
        Sources ({cluster.articles.length})
      </p>
      <div className="space-y-1">
        {cluster.articles.map(a => (
          <div key={a.id} className="flex items-start justify-between gap-3 py-1.5 border-t border-[var(--border)]/40 first:border-t-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{a.publication}</span>
                {variant === 'your-coverage' && a.matched_trigger_types.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    {a.matched_trigger_types.map(t => (
                      <span key={t} className={`text-[10px] px-1.5 py-0 rounded border ${TRIGGER_TONE[t]}`}>{t}</span>
                    ))}
                  </span>
                )}
              </p>
              {a.url ? (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)] inline-flex items-center gap-1 group"
                >
                  <span className="line-clamp-1">{a.headline}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                </a>
              ) : (
                <p className="text-sm text-[var(--text-primary)] line-clamp-1">{a.headline}</p>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] flex-shrink-0 mt-0.5">{relative(a.timestamp)} ago</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tiny presentational helpers ──────────────────────────────────────

function PhaseBadge({ phase }: { phase: Phase }) {
  const meta = PHASE_META[phase] || PHASE_META.sustained;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.color}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function TrendBadge({ direction }: { direction: TrendDirection }) {
  const meta = TREND_META[direction];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.color}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function SaturationLoading({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] space-y-2">
      <Loader2 className="w-5 h-5 animate-spin" />
      <p className="text-xs">{message}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto">{body}</p>
    </div>
  );
}

function relative(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

// ── Hook: fetch clusters with the given filters ─────────────────────

function useClusters(scope: 'market-wide' | 'your-coverage', period: Period, sources: string[]) {
  const [data, setData] = useState<ClustersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ scope, period });
    if (sources.length > 0) params.set('sources', sources.join(','));
    fetch(`/api/story-clusters?${params.toString()}`)
      .then(r => r.json())
      .then((payload: ClustersResponse) => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [scope, period, sources.join(',')]);  // join intentionally — array identity churns

  return { data, loading };
}
