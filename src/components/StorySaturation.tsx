'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowRight, ChevronDown, ChevronRight, ExternalLink, Loader2,
  Minus, Rocket, Share2, Sparkles, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import CoverageTrendChart from './CoverageTrendChart';

// ── Types (mirror the API shapes) ────────────────────────────────────

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
  mention_count_prior: number;
  delta_pct: number | null;
  unique_publication_count: number;
  tier_0_1_sources: number;
  status_badge: Phase;
  trend_direction?: TrendDirection;
  trend_label?: string;
  first_seen: string;
  latest_mention: string;
  saturation_score: number;
  matched_trigger_types: TriggerType[];
  sparkline: number[];
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

interface TriggersResponse {
  company_name: string;
  name_variants: string[];
  products: string[];
  founders: string[];
}

// ── Visual metadata for phase + trend ────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = { '7d': '7 days', '14d': '14 days', '30d': '30 days' };

const PHASE_META: Record<Phase, {
  label: string;
  description: string;
  pillClass: string;
  sparkColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  breaking: {
    label: 'Breaking',
    description: 'Brand-new story gaining fast pickup.',
    pillClass: 'text-rose-300 bg-rose-500/15 border-rose-400/30',
    sparkColor: '#fb7185',
    icon: Zap,
  },
  building: {
    label: 'Building',
    description: 'Mentions accelerating across publications.',
    pillClass: 'text-amber-300 bg-amber-500/15 border-amber-400/30',
    sparkColor: '#fbbf24',
    icon: TrendingUp,
  },
  peak: {
    label: 'Peak',
    description: 'Saturated — most outlets have weighed in.',
    pillClass: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30',
    sparkColor: '#e879f9',
    icon: Activity,
  },
  sustained: {
    label: 'Sustained',
    description: 'Steady ongoing coverage in the market.',
    pillClass: 'text-sky-300 bg-sky-500/15 border-sky-400/30',
    sparkColor: '#38bdf8',
    icon: Minus,
  },
  cooling: {
    label: 'Cooling',
    description: 'Coverage past its peak and declining.',
    pillClass: 'text-slate-300 bg-slate-500/15 border-slate-400/30',
    sparkColor: '#94a3b8',
    icon: TrendingDown,
  },
  inactive: {
    label: 'Inactive',
    description: 'No qualifying recent activity.',
    pillClass: 'text-slate-400 bg-slate-500/10 border-slate-400/20',
    sparkColor: '#64748b',
    icon: Minus,
  },
};

const TREND_META: Record<TrendDirection, { label: string; pillClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  rising:  { label: 'Rising',  pillClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30', icon: TrendingUp },
  flat:    { label: 'Flat',    pillClass: 'text-slate-300 bg-slate-500/15 border-slate-400/30',       icon: Minus },
  falling: { label: 'Falling', pillClass: 'text-red-300 bg-red-500/15 border-red-400/30',             icon: TrendingDown },
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <div className="flex border-b border-[var(--border)] -mb-px">
          <SubTabButton active={tab === 'market-wide'} onClick={() => setTab('market-wide')}>
            Market-wide
          </SubTabButton>
          <SubTabButton active={tab === 'your-coverage'} onClick={() => setTab('your-coverage')}>
            Your Coverage
          </SubTabButton>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)]">Last {PERIOD_LABELS[period]}</p>
      </div>

      {tab === 'market-wide' && <MarketWideView period={period} sources={sources} />}
      {tab === 'your-coverage' && <YourCoverageView period={period} sources={sources} />}
    </div>
  );
}

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-[var(--accent)] text-[var(--accent)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

// ── Market-wide ──────────────────────────────────────────────────────

function MarketWideView({ period, sources }: { period: Period; sources: string[] }) {
  const { data, loading } = useClusters('market-wide', period, sources);

  if (loading) return <SaturationLoading message="Loading saturated stories…" />;
  if (!data || data.clusters.length === 0) {
    return (
      <EmptyState
        title="No saturated stories yet."
        body={`Single-article clusters are excluded. Stories appear once two or more monitored publications cover the same event in the last ${PERIOD_LABELS[period]}.`}
      />
    );
  }
  return (
    <ClusterFrame
      data={data}
      variant="market-wide"
      footerNote={`${data.clusters.length} cluster${data.clusters.length === 1 ? '' : 's'} · ${data.total_sources_count} monitored publications · ranked by saturation score`}
    />
  );
}

// ── Your Coverage ────────────────────────────────────────────────────

function YourCoverageView({ period, sources }: { period: Period; sources: string[] }) {
  const clustersQuery = useClusters('your-coverage', period, sources);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  const refetch = () => {
    clustersQuery.refetch();
    setTrendLoading(true);
    const params = new URLSearchParams({ period });
    if (sources.length > 0) params.set('sources', sources.join(','));
    fetch(`/api/coverage-trend?${params.toString()}`)
      .then(r => r.json())
      .then((payload: TrendResponse) => setTrend(payload))
      .catch(() => setTrend(null))
      .finally(() => setTrendLoading(false));
  };

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

  if (clustersQuery.loading || trendLoading) return <SaturationLoading message="Computing your coverage…" />;

  // No trigger profile at all → mandatory inline editor before Your Coverage works.
  if (clustersQuery.data && !clustersQuery.data.has_trigger_profile) {
    return <TriggerSetupCard onSaved={refetch} forceOpen />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: trigger management is always one click away */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <p className="text-[11px] text-[var(--text-secondary)]">
          Tracking mentions of your company, products, and founders across monitored sources.
        </p>
        <button
          type="button"
          onClick={() => setEditorOpen(o => !o)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/40"
        >
          <Sparkles className="w-3 h-3" /> {editorOpen ? 'Close trigger editor' : 'Edit trigger profile'}
        </button>
      </div>

      {editorOpen && (
        <TriggerSetupCard
          onSaved={() => { setEditorOpen(false); refetch(); }}
          variant="inline"
        />
      )}

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
        <ClusterFrame
          data={clustersQuery.data}
          variant="your-coverage"
          footerNote={`${clustersQuery.data.clusters.length} matching cluster${clustersQuery.data.clusters.length === 1 ? '' : 's'} · trend computed against the previous ${PERIOD_LABELS[period]}.`}
        />
      ) : (
        <EmptyState
          title="No matching coverage in this period."
          body="Articles from your monitored sources haven't mentioned your company, products, or founders yet. Try widening the period or add product / founder triggers above."
        />
      )}
    </div>
  );
}

// ── Cluster table frame ──────────────────────────────────────────────

function ClusterFrame({
  data, variant, footerNote,
}: {
  data: ClustersResponse;
  variant: 'market-wide' | 'your-coverage';
  footerNote: string;
}) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] border-b border-[var(--border)]">
        <div className="col-span-1">#</div>
        <div className="col-span-3">Story</div>
        <div className="col-span-2">{variant === 'market-wide' ? 'Saturation' : 'Trend'}</div>
        <div className="col-span-2">Mentions</div>
        <div className="col-span-1">Sources</div>
        <div className="col-span-1">Latest</div>
        <div className="col-span-2 text-right">Action</div>
      </div>
      <div>
        {data.clusters.map(c => (
          <ClusterRow key={c.story_signature} cluster={c} variant={variant} />
        ))}
      </div>
      <div className="px-4 py-2 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
        {footerNote}
      </div>
    </div>
  );
}

function ClusterRow({ cluster, variant }: { cluster: Cluster; variant: 'market-wide' | 'your-coverage' }) {
  const [expanded, setExpanded] = useState(false);
  const meta = PHASE_META[cluster.status_badge] || PHASE_META.sustained;

  const deltaPct = cluster.delta_pct;
  const deltaText =
    deltaPct === null ? 'new this period'
    : deltaPct === 0 ? 'no change'
    : deltaPct > 0 ? `+${deltaPct}% vs prior`
    : `${deltaPct}% vs prior`;
  const deltaColor =
    deltaPct === null ? 'text-emerald-400'
    : deltaPct > 0 ? 'text-emerald-400'
    : deltaPct < 0 ? 'text-red-400'
    : 'text-[var(--text-secondary)]';

  return (
    <div className="border-t border-[var(--border)] first:border-t-0">
      <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[var(--navy-lighter)]/40 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="col-span-1 flex items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{cluster.rank}</span>
        </button>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="col-span-3 min-w-0 text-left"
        >
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{cluster.cluster_title}</p>
          {variant === 'your-coverage' && cluster.matched_trigger_types.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {cluster.matched_trigger_types.map(t => (
                <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded border ${TRIGGER_TONE[t]}`}>{t}</span>
              ))}
            </div>
          )}
        </button>

        <div className="col-span-2 min-w-0">
          {variant === 'market-wide' ? (
            <>
              <PhaseBadge phase={cluster.status_badge} />
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-snug line-clamp-2">{meta.description}</p>
            </>
          ) : (
            <>
              <TrendBadge direction={cluster.trend_direction || 'flat'} />
              {cluster.trend_label && (
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-snug">{cluster.trend_label}</p>
              )}
            </>
          )}
        </div>

        <div className="col-span-2 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[var(--text-primary)]">{cluster.mention_count}</span>
            <span className="text-[11px] text-[var(--text-secondary)]">mentions</span>
          </div>
          <p className={`text-[10px] mt-0.5 ${deltaColor}`}>{deltaText}</p>
          <Sparkline data={cluster.sparkline} color={meta.sparkColor} />
        </div>

        <div className="col-span-1 min-w-0">
          <p className="text-base font-bold text-[var(--text-primary)]">{cluster.unique_publication_count}</p>
          <p className="text-[11px] text-[var(--text-secondary)]">pubs</p>
          {cluster.tier_0_1_sources > 0 && (
            <p className="text-[10px] text-[var(--accent)] mt-0.5">{cluster.tier_0_1_sources} high-rel</p>
          )}
        </div>

        <div className="col-span-1 text-xs text-[var(--text-secondary)] leading-tight" title={`First seen ${relative(cluster.first_seen)} ago`}>
          <p className="text-[var(--text-primary)] font-medium">{relative(cluster.latest_mention)}</p>
          <p className="text-[10px] mt-0.5 opacity-70">since {relative(cluster.first_seen)}</p>
        </div>

        <div className="col-span-2 flex items-center justify-end">
          <GenerateOpportunityButton cluster={cluster} />
        </div>
      </div>
      {expanded && <SourcesDrawer cluster={cluster} variant={variant} />}
    </div>
  );
}

function GenerateOpportunityButton({ cluster }: { cluster: Cluster }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/opportunities/from-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_signature: cluster.story_signature }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed');
      }
      const j = await r.json();
      const id = j?.opportunity?.id as string | undefined;
      router.push(id ? `/opportunities?highlight=${id}` : '/opportunities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
      >
        {busy
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
          : <>Generate opportunity <ArrowRight className="w-3 h-3" /></>}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}

function SourcesDrawer({ cluster, variant }: { cluster: Cluster; variant: 'market-wide' | 'your-coverage' }) {
  const onShare = () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/market-analyst?signature=${encodeURIComponent(cluster.story_signature)}`
      : '';
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: { title: string; url: string }) => Promise<void> }).share) {
      (navigator as Navigator & { share: (data: { title: string; url: string }) => Promise<void> }).share({ title: cluster.cluster_title, url }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div className="bg-[var(--navy-lighter)]/30 px-4 pb-4 pl-12">
      <div className="flex items-center justify-between py-2 border-b border-[var(--border)]/50">
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-secondary)]">
            Sources ({cluster.articles.length})
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {cluster.unique_publication_count} publication{cluster.unique_publication_count === 1 ? '' : 's'}
            {cluster.tier_0_1_sources > 0 ? ` · ${cluster.tier_0_1_sources} high-relevance` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/40"
        >
          <Share2 className="w-3 h-3" /> Share
        </button>
      </div>
      <div className="space-y-1 mt-2">
        {cluster.articles.length === 0 ? (
          <p className="py-3 text-xs text-[var(--text-secondary)]">No source articles indexed for this cluster in the current window.</p>
        ) : (
          cluster.articles.map(a => (
            <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-t border-[var(--border)]/40 first:border-t-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{a.publication}</span>
                  {variant === 'your-coverage' && a.matched_trigger_types.length > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 align-middle">
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
          ))
        )}
      </div>
    </div>
  );
}

// ── Trigger setup card (Your Coverage empty state when no profile) ──

function TriggerSetupCard({ onSaved, forceOpen, variant = 'empty-state' }: { onSaved: () => void; forceOpen?: boolean; variant?: 'empty-state' | 'inline' }) {
  void forceOpen; // currently unused; reserved for future "first-run" emphasis
  const [name, setName] = useState('');
  const [variantsText, setVariantsText] = useState('');
  const [productsText, setProductsText] = useState('');
  const [foundersText, setFoundersText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/triggers')
      .then(r => r.json())
      .then((d: TriggersResponse) => {
        setName(d.company_name || '');
        setVariantsText((d.name_variants || []).join('\n'));
        setProductsText((d.products || []).join('\n'));
        setFoundersText((d.founders || []).join('\n'));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const r = await fetch('/api/triggers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_variants: parseLines(variantsText),
          products: parseLines(productsText),
          founders: parseLines(foundersText),
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Failed to save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  const containerClass = variant === 'inline'
    ? 'bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5'
    : 'bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 max-w-3xl mx-auto';

  return (
    <div className={containerClass}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {variant === 'inline' ? 'Trigger profile' : 'Set up your trigger profile'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Your Coverage matches articles against your company, products, and founders. Add a few terms to widen the
            net. <span className="text-[var(--text-primary)]">{name || 'Your company name'}</span> is always matched automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <TriggerField
          label="Name variants"
          help="Common abbreviations or stylings (one per line)."
          example={`e.g. ${name || 'Acme'} Inc, ${name || 'Acme'}.io`}
          value={variantsText}
          onChange={setVariantsText}
        />
        <TriggerField
          label="Products"
          help="Product or feature names you sell."
          example="e.g. Treaty Studio, Bordereau Pro"
          value={productsText}
          onChange={setProductsText}
        />
        <TriggerField
          label="Founders / spokespeople"
          help="Full names. We won't auto-split surnames."
          example="e.g. Jerad Leigh, Ben Rose"
          value={foundersText}
          onChange={setFoundersText}
        />
      </div>

      <div className="flex items-center justify-between mt-5 gap-3">
        <p className="text-[11px] text-[var(--text-secondary)]">
          You can update these any time from Narrative. Terms are matched as whole words, case-insensitive.
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            type="button"
            onClick={save}
            disabled={!loaded || saving}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 disabled:opacity-60 disabled:cursor-wait"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <>Save & track <ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function TriggerField({
  label, help, example, value, onChange,
}: {
  label: string; help: string; example: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-primary)]">{label}</label>
      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{help}</p>
      <textarea
        rows={4}
        value={value}
        placeholder={example}
        onChange={e => onChange(e.target.value)}
        className="mt-1.5 w-full px-2.5 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent)] resize-y"
      />
    </div>
  );
}

function parseLines(raw: string): string[] {
  return raw.split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
}

// ── Tiny presentational helpers ──────────────────────────────────────

function PhaseBadge({ phase }: { phase: Phase }) {
  const meta = PHASE_META[phase] || PHASE_META.sustained;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.pillClass}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function TrendBadge({ direction }: { direction: TrendDirection }) {
  const meta = TREND_META[direction];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.pillClass}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const viewW = 80;
  const viewH = 18;
  if (data.length === 0) return null;
  const stepX = viewW / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${(i * stepX).toFixed(1)},${(viewH - (v / max) * viewH).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-4 mt-1" preserveAspectRatio="none" aria-hidden="true">
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
    <div className="text-center py-12 px-4 border border-dashed border-[var(--border)] rounded-xl bg-[var(--navy-light)]/30">
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

// ── useClusters hook ─────────────────────────────────────────────────

function useClusters(scope: 'market-wide' | 'your-coverage', period: Period, sources: string[]) {
  const [data, setData] = useState<ClustersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const sourcesKey = useMemo(() => sources.join(','), [sources]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ scope, period });
    if (sources.length > 0) params.set('sources', sources.join(','));
    fetch(`/api/story-clusters?${params.toString()}`)
      .then(r => r.json())
      .then((payload: ClustersResponse) => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [scope, period, sourcesKey, refreshKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refetch: () => setRefreshKey(k => k + 1) };
}
