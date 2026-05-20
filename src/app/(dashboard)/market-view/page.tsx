'use client';
/**
 * Market View — the live map of every tracked conversation, including ones
 * that didn't make it into the weekly brief. Power-user surface for browsing
 * and filtering.
 *
 * Filters: All / Rising / Under-discussed / Strong fit / High confidence /
 *          Sales-useful / PR potential / Official source / Monitor only
 *
 * Sort: Relevance / Momentum / Attention / Latest / Saturation
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Map } from 'lucide-react';

type Filter = 'all' | 'rising' | 'under-discussed' | 'strong-fit' | 'high-confidence'
            | 'sales-useful' | 'pr-potential' | 'official-source' | 'monitor-only';
type Sort = 'relevance' | 'momentum' | 'attention' | 'latest' | 'saturation';
type ViewStatus = 'included_in_brief' | 'action_recommended' | 'monitor_only' | 'tracked_not_prioritised';

interface ScoreEntry { value: number; label: string; explanation: string; }

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  viewStatus: ViewStatus;
  marketSignal?: string;
  whyItIsHere?: string;
  suggestedUse?: string[];
  evidenceSummary?: { itemCount: number; sourceCount: number; lastUpdated: string };
  score?: {
    marketAttention: ScoreEntry;
    momentum: ScoreEntry;
    saturation: ScoreEntry;
    coverageQuality: ScoreEntry;
    companyRelevance: ScoreEntry;
  };
}

interface MarketMap {
  included_in_brief: number;
  action_recommended: number;
  monitor_only: number;
  tracked_not_prioritised: number;
}

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rising', label: 'Rising' },
  { value: 'under-discussed', label: 'Under-discussed' },
  { value: 'strong-fit', label: 'Strong fit' },
  { value: 'high-confidence', label: 'High confidence' },
  { value: 'sales-useful', label: 'Sales-useful' },
  { value: 'pr-potential', label: 'PR potential' },
  { value: 'official-source', label: 'Official source' },
  { value: 'monitor-only', label: 'Monitor only' },
];

// Sort options follow the v2 score-order spec: Relevance, Momentum, Attention,
// Saturation, Coverage quality. "Latest update" is kept as a sixth option for
// users who want chronological browsing — not part of the scoring axes.
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'attention', label: 'Attention' },
  { value: 'saturation', label: 'Saturation (low → high)' },
  { value: 'latest', label: 'Latest update' },
];

// Display labels follow the v2 status spec:
//   Included in brief / Watching / Needs review / Monitor only / Ignored
// The DB still stores the v1 enum names ('tracked_not_prioritised', etc.);
// only the display label changes. "Ignored" is surfaced through the
// `archived` boolean rather than a new enum value.
const VIEW_STATUS_LABELS: Record<ViewStatus, string> = {
  included_in_brief: 'Included in brief',
  action_recommended: 'Needs review',
  monitor_only: 'Monitor only',
  tracked_not_prioritised: 'Watching',
};

const VIEW_STATUS_DOT: Record<ViewStatus, string> = {
  included_in_brief: 'bg-emerald-500',
  action_recommended: 'bg-amber-500',
  monitor_only: 'bg-[var(--accent)]',
  tracked_not_prioritised: 'bg-[var(--text-secondary)]/50',
};

export default function MarketViewPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [marketMap, setMarketMap] = useState<MarketMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('relevance');
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const demo = url.searchParams.get('companyId') === 'demo';
    setDemoMode(demo);

    const queryString = new URLSearchParams();
    if (demo) queryString.set('companyId', 'demo');
    queryString.set('filter', filter);
    queryString.set('sort', sort);

    setLoading(true);
    fetch(`/api/market-view/conversations?${queryString.toString()}`)
      .then(r => r.json())
      .then(data => {
        setConversations(data.conversations || []);
        setMarketMap(data.marketMap || null);
        setPreview(Boolean(data.preview));
      })
      .catch(() => {
        setConversations([]);
        setMarketMap(null);
      })
      .finally(() => setLoading(false));
  }, [filter, sort]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {preview && (
        <div className="mb-6 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm text-[var(--accent)]">
          Preview mode — showing the Supercede demo. Complete your Company Profile to see your own market view.
        </div>
      )}

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Market View
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Every conversation we're tracking, including ones outside this week's brief.
            </p>
          </div>
          {demoMode && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-xs font-medium text-[var(--accent)]">
              Demo — Supercede
            </div>
          )}
        </div>
      </header>

      {/* Market map summary */}
      {marketMap && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MapTile label="Included in brief" count={marketMap.included_in_brief} status="included_in_brief" />
          <MapTile label="Needs review" count={marketMap.action_recommended} status="action_recommended" />
          <MapTile label="Monitor only" count={marketMap.monitor_only} status="monitor_only" />
          <MapTile label="Watching" count={marketMap.tracked_not_prioritised} status="tracked_not_prioritised" />
        </div>
      )}

      {/* Filter + sort */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === opt.value
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
                  : 'bg-[var(--navy-light)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong,#374151)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="text-xs bg-[var(--navy-light)] border border-[var(--border)] text-[var(--text-primary)] rounded-md px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20">
          <Map className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-5 opacity-60" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No conversations yet</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Once we've scanned enough market coverage, conversations will appear here.
            This usually takes a few hours after onboarding completes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {conversations.map((c) => (
            <ConversationCard key={c.id} c={c} demoMode={demoMode} />
          ))}
        </div>
      )}
    </div>
  );
}

function MapTile({ label, count, status }: { label: string; count: number; status: ViewStatus }) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-block w-2 h-2 rounded-full ${VIEW_STATUS_DOT[status]}`} />
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/70 font-medium">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{count}</div>
    </div>
  );
}

function ConversationCard({ c, demoMode }: { c: Conversation; demoMode: boolean }) {
  const href = demoMode ? `/market-view/${c.id}?companyId=demo` : `/market-view/${c.id}`;
  return (
    <Link
      href={href}
      className="block bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/40 transition-colors group"
    >
      {/* Status + title */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block w-2 h-2 rounded-full ${VIEW_STATUS_DOT[c.viewStatus]}`} />
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/70 font-medium">
          {VIEW_STATUS_LABELS[c.viewStatus]}
        </span>
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 leading-snug group-hover:text-[var(--accent)] transition-colors">
        {c.title}
      </h3>

      {/* Three-column: signal / why it's here / suggested use */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
        <div>
          <div className="font-semibold text-[var(--text-secondary)]/60 uppercase tracking-wider text-[10px] mb-1">Market signal</div>
          <div className="text-[var(--text-secondary)]">{c.marketSignal || c.summary?.slice(0, 100) || '—'}</div>
        </div>
        <div>
          <div className="font-semibold text-[var(--text-secondary)]/60 uppercase tracking-wider text-[10px] mb-1">Why it's here</div>
          <div className="text-[var(--text-secondary)] line-clamp-2">{c.whyItIsHere || '—'}</div>
        </div>
        <div>
          <div className="font-semibold text-[var(--text-secondary)]/60 uppercase tracking-wider text-[10px] mb-1">Suggested use</div>
          <div className="flex flex-wrap gap-1">
            {(c.suggestedUse || []).slice(0, 3).map((u, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                {u}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence + scores */}
      {c.evidenceSummary && (
        <div className="text-[10px] text-[var(--text-secondary)]/60 mb-3">
          {c.evidenceSummary.itemCount} items · {c.evidenceSummary.sourceCount} sources · updated {c.evidenceSummary.lastUpdated}
        </div>
      )}
      {c.score && (
        <div className="flex flex-wrap gap-2">
          <ScoreBar label="Relevance" entry={c.score.companyRelevance} />
          <ScoreBar label="Momentum" entry={c.score.momentum} />
          <ScoreBar label="Attention" entry={c.score.marketAttention} />
          <ScoreBar label="Saturation" entry={c.score.saturation} />
          <ScoreBar label="Quality" entry={c.score.coverageQuality} />
        </div>
      )}
    </Link>
  );
}

function ScoreBar({ label, entry }: { label: string; entry: ScoreEntry }) {
  const pct = Math.max(0, Math.min(100, entry.value * 10));
  const color = pickColor(entry.label);
  return (
    <div className="flex-1 min-w-[110px] bg-[var(--navy-lighter,#0c1424)] border border-[var(--border)] rounded-md p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]/60">{label}</span>
        <span className={`text-[10px] font-semibold ${color.text}`}>{entry.label}</span>
      </div>
      <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div className={`h-full ${color.bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function pickColor(label: string): { text: string; bg: string } {
  const l = label.toLowerCase();
  if (l.includes('high') || l.includes('strong') || l.includes('very high')) {
    return { text: 'text-emerald-400', bg: 'bg-emerald-500' };
  }
  if (l.includes('rising') || l.includes('accelerating') || l.includes('emerging') || l.includes('moderate')) {
    return { text: 'text-amber-400', bg: 'bg-amber-500' };
  }
  if (l.includes('over-saturat')) {
    return { text: 'text-red-400', bg: 'bg-red-500' };
  }
  if (l.includes('low') || l.includes('fading') || l.includes('declining')) {
    return { text: 'text-[var(--text-secondary)]', bg: 'bg-[var(--text-secondary)]/40' };
  }
  return { text: 'text-blue-400', bg: 'bg-blue-500' };
}
