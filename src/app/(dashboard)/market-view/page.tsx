'use client';
/**
 * Market View — the live map of every Market Conversation the system is
 * currently tracking. Cofounder's v2 spec, 2026-05-22.
 *
 * Market Brief answers: "What matters this week, what does it mean, what
 *                        should we do?"
 * Market View answers : "What is the system tracking, why is it tracking it,
 *                        and should I follow / ignore / investigate?"
 *
 * Card structure (per spec):
 *   1. Status label       2. Last updated     3. Title (interpreted theme)
 *   4. Signal             5. Why tracked      6. Evidence (items · sources ·
 *                                                analysis pieces)
 *   7. Metrics            8. Controls (Open conversation · Follow · Ignore)
 *
 * Metrics order: Relevance · Momentum · Attention · Saturation · Coverage quality
 *
 * Status labels: Included in brief · Watching · Needs review · Monitor only ·
 *                Ignored. The display does not surface action language —
 *                actions live in Market Brief / Conversation Detail.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Map,
  Star,
  EyeOff,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

type Filter =
  | 'default' | 'all' | 'rising' | 'under-discussed' | 'strong-fit'
  | 'high-confidence' | 'sales-useful' | 'pr-potential'
  | 'official-source' | 'monitor-only' | 'followed';
type Sort = 'relevance' | 'momentum' | 'attention' | 'saturation' | 'latest';
type ViewStatus = 'included_in_brief' | 'needs_review' | 'monitor_only' | 'tracked_not_prioritised';

interface ScoreEntry { value: number; label: string; explanation: string; }

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  viewStatus: ViewStatus;
  archived?: boolean;
  isFollowed?: boolean;
  marketSignal?: string;
  whyItIsHere?: string;
  latestCoverageAt?: string;
  evidenceSummary?: {
    itemCount: number;
    sourceCount: number;
    analysisPieces?: number;
    lastUpdated: string;
  };
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
  needs_review: number;
  monitor_only: number;
  tracked_not_prioritised: number;
}

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'all', label: 'All' },
  { value: 'rising', label: 'Rising' },
  { value: 'under-discussed', label: 'Under-discussed' },
  { value: 'strong-fit', label: 'Strong fit' },
  { value: 'high-confidence', label: 'High confidence' },
  { value: 'official-source', label: 'Official source' },
  { value: 'monitor-only', label: 'Monitor only' },
  { value: 'followed', label: 'Followed' },
];

// v2 spec score order: Relevance → Momentum → Attention → Saturation → Coverage quality.
// "Latest update" is kept as a chronological fallback — not a score axis.
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'attention', label: 'Attention' },
  { value: 'saturation', label: 'Saturation (low → high)' },
  { value: 'latest', label: 'Latest update' },
];

const VIEW_STATUS_LABELS: Record<ViewStatus, string> = {
  included_in_brief: 'Included in brief',
  needs_review: 'Needs review',
  monitor_only: 'Monitor only',
  tracked_not_prioritised: 'Watching',
};

const VIEW_STATUS_TONE: Record<ViewStatus, {
  dot: string; chip: string;
}> = {
  included_in_brief: {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  needs_review: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  monitor_only: {
    dot: 'bg-[var(--accent)]',
    chip: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
  },
  tracked_not_prioritised: {
    dot: 'bg-[var(--text-secondary)]/50',
    chip: 'bg-[var(--navy)] text-[var(--text-secondary)] border-[var(--border)]',
  },
};

function statusFor(c: Conversation): { key: ViewStatus | 'ignored'; label: string } {
  if (c.archived) return { key: 'ignored', label: 'Ignored' };
  return { key: c.viewStatus, label: VIEW_STATUS_LABELS[c.viewStatus] };
}

function formatRelative(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return 'Updated today';
  if (diffMs < 2 * day) return 'Updated yesterday';
  if (diffMs < 7 * day) return 'Updated this week';
  if (diffMs < 30 * day) return 'Updated this month';
  return `Updated ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

export default function MarketViewPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [marketMap, setMarketMap] = useState<MarketMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [filter, setFilter] = useState<Filter>('default');
  const [sort, setSort] = useState<Sort>('relevance');
  const [demoMode, setDemoMode] = useState(false);
  // Per-conversation pending state for follow/ignore so the buttons can
  // disable themselves during the POST.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const fetchConversations = () => {
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
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  // Optimistic toggle helpers. We update the local state immediately, fire the
  // request, and revert on failure. The demo path is read-only — skip the API.
  const toggleFollow = async (conv: Conversation) => {
    if (demoMode) return;
    const next = !conv.isFollowed;
    setPending((p) => ({ ...p, [conv.id]: true }));
    setConversations((list) => list.map((c) => c.id === conv.id ? { ...c, isFollowed: next } : c));
    try {
      const res = await fetch(`/api/market-view/conversations/${conv.id}/follow`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!res.ok) throw new Error('toggle failed');
    } catch {
      setConversations((list) => list.map((c) => c.id === conv.id ? { ...c, isFollowed: !next } : c));
    } finally {
      setPending((p) => ({ ...p, [conv.id]: false }));
    }
  };

  const toggleIgnore = async (conv: Conversation) => {
    if (demoMode) return;
    const next = !conv.archived;
    setPending((p) => ({ ...p, [conv.id]: true }));
    setConversations((list) => list.map((c) => c.id === conv.id ? { ...c, archived: next } : c));
    try {
      const res = await fetch(`/api/market-view/conversations/${conv.id}/ignore`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!res.ok) throw new Error('toggle failed');
    } catch {
      setConversations((list) => list.map((c) => c.id === conv.id ? { ...c, archived: !next } : c));
    } finally {
      setPending((p) => ({ ...p, [conv.id]: false }));
    }
  };

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
              Every conversation the system is tracking. Follow what matters, ignore the noise.
            </p>
          </div>
          {demoMode && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--purple)]/10 border border-[var(--purple)]/30 text-xs font-medium text-[var(--purple)]">
              Demo — Supercede
            </div>
          )}
        </div>
      </header>

      {/* Market map summary */}
      {marketMap && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MapTile label="Included in brief" count={marketMap.included_in_brief} status="included_in_brief" />
          <MapTile label="Needs review" count={marketMap.needs_review} status="needs_review" />
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
                  : 'bg-[var(--navy-light)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/30'
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
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No conversations match this filter</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-4">
            {filter === 'default'
              ? "We're filtering out low-relevance and low-attention noise. Switch to All to see everything we're tracking."
              : 'Try a different filter to see other tracked conversations.'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Show all tracked conversations
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {conversations.map((c) => (
            <ConversationCard
              key={c.id}
              conv={c}
              demoMode={demoMode}
              pending={Boolean(pending[c.id])}
              onToggleFollow={() => toggleFollow(c)}
              onToggleIgnore={() => toggleIgnore(c)}
            />
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
        <span className={`inline-block w-2 h-2 rounded-full ${VIEW_STATUS_TONE[status].dot}`} />
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/70 font-medium">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{count}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Conversation card                                                        */
/* ──────────────────────────────────────────────────────────────────────── */

function ConversationCard({
  conv, demoMode, pending, onToggleFollow, onToggleIgnore,
}: {
  conv: Conversation;
  demoMode: boolean;
  pending: boolean;
  onToggleFollow: () => void;
  onToggleIgnore: () => void;
}) {
  const status = statusFor(conv);
  const href = demoMode ? `/market-view/${conv.id}?companyId=demo` : `/market-view/${conv.id}`;
  const evidence = conv.evidenceSummary;
  const lastUpdated = formatRelative(
    evidence?.lastUpdated ?? conv.latestCoverageAt,
  );

  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
      {/* Row 1: Status + last updated */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {status.key === 'ignored' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border bg-[var(--navy)] text-[var(--text-secondary)]/60 border-[var(--border)]">
              Ignored
            </span>
          ) : (
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border ${VIEW_STATUS_TONE[status.key].chip}`}>
              {status.label}
            </span>
          )}
          {conv.isFollowed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border bg-[var(--purple)]/10 text-[var(--purple)] border-[var(--purple)]/30">
              <Star className="w-3 h-3 fill-current" />
              Following
            </span>
          )}
        </div>
        <span className="text-[11px] text-[var(--text-secondary)]/70">{lastUpdated}</span>
      </div>

      {/* Row 2: Title (interpreted theme, not headline) */}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] leading-snug mb-3">
        {conv.title}
      </h3>

      {/* Row 3: Signal — one sentence describing what's happening in the market */}
      {conv.marketSignal && (
        <div className="mb-3">
          <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]/60 mb-1">Signal</div>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">{conv.marketSignal}</p>
        </div>
      )}

      {/* Row 4: Why tracked — one sentence on why the system is watching this */}
      {conv.whyItIsHere && (
        <div className="mb-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]/60 mb-1">Why tracked</div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{conv.whyItIsHere}</p>
        </div>
      )}

      {/* Row 5: Evidence count */}
      {evidence && (
        <div className="text-[11px] text-[var(--text-secondary)]/70 mb-4">
          {evidence.itemCount} item{evidence.itemCount === 1 ? '' : 's'}
          {' · '}
          {evidence.sourceCount} source{evidence.sourceCount === 1 ? '' : 's'}
          {typeof evidence.analysisPieces === 'number' && evidence.analysisPieces > 0 && (
            <>
              {' · '}
              {evidence.analysisPieces} analysis piece{evidence.analysisPieces === 1 ? '' : 's'}
            </>
          )}
        </div>
      )}

      {/* Row 6: Metrics (Relevance → Momentum → Attention → Saturation → Coverage quality) */}
      {conv.score && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <Metric label="Relevance" entry={conv.score.companyRelevance} />
          <Metric label="Momentum" entry={conv.score.momentum} />
          <Metric label="Attention" entry={conv.score.marketAttention} />
          <Metric label="Saturation" entry={conv.score.saturation} />
          <Metric label="Coverage quality" entry={conv.score.coverageQuality} />
        </div>
      )}

      {/* Row 7: Controls */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]/60">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:gap-1.5 transition-all"
        >
          Open conversation <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onToggleFollow}
            disabled={pending || demoMode}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
              conv.isFollowed
                ? 'bg-[var(--purple)]/10 text-[var(--purple)] border-[var(--purple)]/30 hover:bg-[var(--purple)]/15'
                : 'bg-[var(--navy)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40'
            }`}
            title={demoMode ? 'Demo mode — read only' : conv.isFollowed ? 'Unfollow' : 'Follow'}
          >
            <Star className={`w-3 h-3 ${conv.isFollowed ? 'fill-current' : ''}`} />
            {conv.isFollowed ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={onToggleIgnore}
            disabled={pending || demoMode}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
              conv.archived
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/15'
                : 'bg-[var(--navy)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-red-500/30'
            }`}
            title={demoMode ? 'Demo mode — read only' : conv.archived ? 'Unhide' : 'Ignore'}
          >
            <EyeOff className="w-3 h-3" />
            {conv.archived ? 'Ignored' : 'Ignore'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Metric tile                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function Metric({ label, entry }: { label: string; entry: ScoreEntry }) {
  const color = pickColor(entry.label);
  return (
    <div className="bg-[var(--navy)] border border-[var(--border)] rounded-md px-2.5 py-2">
      <div className="text-[9px] font-bold tracking-widest uppercase text-[var(--text-secondary)]/60 mb-1">
        {label}
      </div>
      <div className={`text-xs font-semibold ${color.text}`} title={entry.explanation}>
        {entry.label || '—'}
      </div>
    </div>
  );
}

function pickColor(label: string): { text: string } {
  const l = (label || '').toLowerCase();
  // High end of the goodness scale
  if (l.includes('critical')) return { text: 'text-red-400' };
  if (l.includes('very high') || l.includes('high')) return { text: 'text-emerald-400' };
  // Momentum
  if (l.includes('rising') || l.includes('accelerating') || l.includes('emerging')) return { text: 'text-amber-400' };
  // Saturation special-case
  if (l.includes('over-saturat')) return { text: 'text-red-400' };
  // Middling
  if (l.includes('medium') || l.includes('moderate') || l.includes('recurring')) return { text: 'text-[var(--text-primary)]' };
  // Low end
  if (l.includes('low') || l.includes('fading') || l.includes('stable')) return { text: 'text-[var(--text-secondary)]' };
  return { text: 'text-[var(--text-primary)]' };
}
