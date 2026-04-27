'use client';

import { useEffect, useState } from 'react';
import {
  Activity, ExternalLink, Filter, Info, Layers, LayoutGrid, Loader2,
  Minus, Rocket, Search, TrendingDown, TrendingUp,
} from 'lucide-react';

type Phase = 'emerging' | 'accelerating' | 'saturated' | 'fading' | 'established' | 'inactive';

interface Cluster {
  story_signature: string;
  sample_title: string;
  primary_source: string;
  latest_at: string;
  article_count_24h: number;
  article_count_24h_yesterday: number;
  article_count_7d: number;
  distinct_sources: number;
  high_relevance_sources: number;
  phase: Phase;
  composite_score: number;
  fit_avg: number | null;
  urgency_max: number | null;
  sparkline: number[];
  article_ids: string[];
}

interface PhaseCounts {
  total: number; emerging: number; accelerating: number;
  saturated: number; fading: number; established: number;
}

interface StoryClustersResponse {
  stats: { now: PhaseCounts; vs_yesterday: PhaseCounts };
  clusters: Cluster[];
  window_hours: number;
}

interface PhaseMeta {
  label: string;
  color: string;
  barColor: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PHASE_META: Record<Phase, PhaseMeta> = {
  emerging: {
    label: 'Emerging',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    barColor: '#10b981',
    description: 'Early stage story with limited coverage but increasing momentum.',
    icon: Rocket,
  },
  accelerating: {
    label: 'Accelerating',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    barColor: '#fbbf24',
    description: 'Coverage is increasing quickly and gaining market attention.',
    icon: TrendingUp,
  },
  saturated: {
    label: 'Saturated',
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
    barColor: '#f87171',
    description: 'This story is widely covered. The obvious angles are likely exhausted.',
    icon: LayoutGrid,
  },
  fading: {
    label: 'Fading',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    barColor: '#60a5fa',
    description: 'Coverage has declined significantly from its previous peak.',
    icon: TrendingDown,
  },
  established: {
    label: 'Established',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    barColor: '#a78bfa',
    description: 'Steady coverage over time. Known topic in the market.',
    icon: Activity,
  },
  inactive: {
    label: 'Inactive',
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    barColor: '#64748b',
    description: 'No recent coverage.',
    icon: Minus,
  },
};

function PhaseStatCard({
  label, count, delta, icon: Icon,
}: {
  label: string;
  count: number;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const deltaText =
    delta === null ? null
    : delta > 0 ? `+${delta} vs yesterday`
    : delta < 0 ? `${delta} vs yesterday`
    : 'no change';
  const deltaColor =
    delta === null || delta === 0 ? 'text-[var(--text-secondary)]'
    : delta > 0 ? 'text-emerald-400'
    : 'text-red-400';
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between mb-2 gap-2">
        <span className="text-xs font-medium text-[var(--text-secondary)] leading-tight">{label}</span>
        <Icon className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
      </div>
      <span className="text-2xl font-bold text-[var(--text-primary)]">{count}</span>
      <span className={`text-[11px] mt-1 ${deltaColor}`}>{deltaText ?? '—'}</span>
    </div>
  );
}

function TrendSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const viewW = 100;
  const viewH = 32;
  if (data.length === 0) {
    return <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-8" aria-hidden="true" />;
  }
  const stepX = viewW / Math.max(data.length - 1, 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(viewH - (v / max) * viewH).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-8" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function FitGauge({ value }: { value: number | null }) {
  // Treat null and zero the same — there's no scoring signal to render.
  if (value === null || value === undefined || value <= 0) {
    return <span className="text-sm text-[var(--text-secondary)]">—</span>;
  }
  const pct = Math.max(0, Math.min(100, value));
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const stroke = pct >= 70 ? '#10b981' : pct >= 40 ? '#fbbf24' : '#64748b';
  return (
    <div className="relative w-10 h-10">
      <svg width={40} height={40} className="-rotate-90" aria-hidden="true">
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="3" />
        <circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[var(--text-primary)]">
        {pct}%
      </span>
    </div>
  );
}

function urgencyBadge(score: number | null) {
  // 0 means "nothing notable" — same as null. Hide instead of showing a uniform "Low".
  if (score === null || score === undefined || score === 0) {
    return <span className="text-sm text-[var(--text-secondary)]">—</span>;
  }
  if (score >= 70) {
    return <span className="text-xs font-semibold px-2 py-1 rounded text-red-400 bg-red-400/10 border border-red-400/20">High</span>;
  }
  if (score >= 40) {
    return <span className="text-xs font-semibold px-2 py-1 rounded text-amber-400 bg-amber-400/10 border border-amber-400/20">Medium</span>;
  }
  return <span className="text-xs font-semibold px-2 py-1 rounded text-slate-400 bg-slate-400/10 border border-slate-400/20">Low</span>;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function StoryClusterRow({ cluster }: { cluster: Cluster }) {
  const meta = PHASE_META[cluster.phase] || PHASE_META.established;
  const PhaseIcon = meta.icon;
  const coverageDelta = cluster.article_count_24h - cluster.article_count_24h_yesterday;
  const deltaText =
    coverageDelta > 0 ? `↑ ${coverageDelta} vs yesterday`
    : coverageDelta < 0 ? `↓ ${Math.abs(coverageDelta)} vs yesterday`
    : 'no change';
  const deltaColor =
    coverageDelta > 0 ? 'text-emerald-400'
    : coverageDelta < 0 ? 'text-red-400'
    : 'text-[var(--text-secondary)]';

  return (
    <div className="grid grid-cols-12 gap-3 items-center py-3 border-t border-[var(--border)] first:border-t-0 hover:bg-[var(--navy-lighter)]/40 transition-colors">
      <div className="col-span-2 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{cluster.sample_title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
          {cluster.primary_source} · {timeAgo(cluster.latest_at)}
        </p>
      </div>
      <div className="col-span-2 min-w-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.color}`}>
          <PhaseIcon className="w-3 h-3" /> {meta.label}
        </span>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-snug">
          {meta.description}
        </p>
      </div>
      <div className="col-span-2 text-sm min-w-0">
        <p className="text-[var(--text-primary)] font-semibold">{plural(cluster.article_count_24h, 'mention')}</p>
        <p className={`text-[10px] mt-0.5 truncate ${deltaColor}`}>{deltaText}</p>
      </div>
      <div className="col-span-1 flex items-center min-w-0">
        <TrendSparkline data={cluster.sparkline} color={meta.barColor} />
      </div>
      <div className="col-span-1 text-sm min-w-0">
        <p className="text-[var(--text-primary)] font-semibold">{cluster.article_count_7d}</p>
        <p className="text-[10px] text-[var(--text-secondary)]">7d</p>
      </div>
      <div className="col-span-1 text-sm min-w-0">
        <p className="text-[var(--text-primary)] font-semibold">{cluster.high_relevance_sources}</p>
        <p className="text-[10px] text-[var(--text-secondary)]">tier 0–1</p>
      </div>
      <div className="col-span-1 flex items-center justify-center">
        <FitGauge value={cluster.fit_avg} />
      </div>
      <div className="col-span-1 flex items-center">{urgencyBadge(cluster.urgency_max)}</div>
      <div className="col-span-1 text-right">
        <a
          href={`/opportunities?signature=${encodeURIComponent(cluster.story_signature)}`}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
        >
          Generate <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function delta(now: number, prev: number): number | null {
  if (prev === undefined || prev === null) return null;
  return now - prev;
}

export default function StoryClustersView({
  pendingCount = 0,
  analyzing = false,
}: {
  pendingCount?: number;
  analyzing?: boolean;
}) {
  const [data, setData] = useState<StoryClustersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shownCount, setShownCount] = useState(5);

  useEffect(() => {
    fetch('/api/story-clusters?limit=50&window=24')
      .then(r => r.json())
      .then((payload: StoryClustersResponse) => setData(payload))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] space-y-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">{analyzing ? 'Your agents are scoring fresh signals…' : 'Loading story clusters…'}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-16 text-[var(--text-secondary)]">Failed to load story clusters.</div>;
  }

  const filtered = data.clusters.filter(c =>
    !search ||
    c.sample_title.toLowerCase().includes(search.toLowerCase()) ||
    c.primary_source.toLowerCase().includes(search.toLowerCase())
  );
  const visible = filtered.slice(0, shownCount);

  return (
    <div className="space-y-4">
      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
          <Activity className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5 animate-pulse" />
          <span className="text-[var(--accent)]/80">
            Your Market Analyst is processing {pendingCount} more article{pendingCount !== 1 ? 's' : ''}. New clusters appear automatically.
          </span>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--accent)]/40"
          title="Filters coming soon"
        >
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <PhaseStatCard
          label="Total story clusters"
          count={data.stats.now.total}
          delta={delta(data.stats.now.total, data.stats.vs_yesterday.total)}
          icon={Layers}
        />
        <PhaseStatCard
          label="Emerging"
          count={data.stats.now.emerging}
          delta={delta(data.stats.now.emerging, data.stats.vs_yesterday.emerging)}
          icon={Rocket}
        />
        <PhaseStatCard
          label="Accelerating"
          count={data.stats.now.accelerating}
          delta={delta(data.stats.now.accelerating, data.stats.vs_yesterday.accelerating)}
          icon={TrendingUp}
        />
        <PhaseStatCard
          label="Saturated"
          count={data.stats.now.saturated}
          delta={delta(data.stats.now.saturated, data.stats.vs_yesterday.saturated)}
          icon={LayoutGrid}
        />
        <PhaseStatCard
          label="Fading"
          count={data.stats.now.fading}
          delta={delta(data.stats.now.fading, data.stats.vs_yesterday.fading)}
          icon={TrendingDown}
        />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--navy-lighter)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Story Saturation shows how widely and quickly a market story is being covered. It helps you decide whether
          to act now, wait, use privately, or avoid adding to the noise.
        </p>
      </div>

      {/* Table */}
      {visible.length > 0 ? (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] border-b border-[var(--border)]">
            <div className="col-span-2">Story / Signal</div>
            <div className="col-span-2">Story Saturation</div>
            <div className="col-span-2">Coverage (24h)</div>
            <div className="col-span-1">Trend</div>
            <div className="col-span-1">7 Day</div>
            <div className="col-span-1">High-Relevance</div>
            <div className="col-span-1 text-center">Fit</div>
            <div className="col-span-1">Urgency</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          <div className="px-3">
            {visible.map(c => <StoryClusterRow key={c.story_signature} cluster={c} />)}
          </div>
          <div className="px-3 py-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Showing {visible.length} of {filtered.length} story clusters</span>
            {visible.length < filtered.length && (
              <button
                type="button"
                onClick={() => setShownCount(c => Math.min(c + 5, filtered.length))}
                className="text-[var(--accent)] font-semibold hover:underline"
              >
                View more
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">No story clusters yet</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Your Market Analyst is still gathering signals — clusters will appear as stories accumulate
            coverage across multiple sources.
          </p>
        </div>
      )}
    </div>
  );
}
