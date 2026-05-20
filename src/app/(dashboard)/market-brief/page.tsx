'use client';
/**
 * Market Brief — the primary landing page in the IA.
 *
 * Layout (matches the v2 design spec, screenshots dated 2026-05-20):
 *   Header     status bar: Active brief · Action window · Last scan · Next scan
 *   Section 01 Market Read — KEY TAKEAWAY + analyst paragraphs + scan stats footer
 *              tabs (TL;DR / Analyst Read / Research Briefing) on the right
 *   Section 02 This Week's Priorities — numbered actions, first one styled as
 *              HIGHEST PRIORITY (red), urgency + status pills on the right,
 *              WHY NOW reason inside each card
 *   Section 03 Commercial Implications — 2×2 grid (Positioning / Sales /
 *              Content / Pipeline) with icon + lead sentence + supporting copy
 *   Section 04 Market Conversations Driving This Brief — ranked conversations
 *              with primary-signal/context badges, items + sources, evidence link
 *
 * Status labels and score order follow the v2 Market View spec:
 *   - Status: Included in brief / Watching / Needs review / Monitor only / Ignored
 *   - Scores (display order): Relevance, Momentum, Attention, Saturation, Coverage quality
 */
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, ChevronRight, Loader2, Check, Circle,
  BookOpen, Hash, Users, Edit3, BarChart3, AlertCircle,
} from 'lucide-react';

type DepthMode = 'tldr' | 'analyst' | 'research';
type Urgency = 'now' | 'this-week' | 'monitor';

interface ScoreEntry { value: number; label: string; explanation: string; }
interface ScoresShape {
  marketAttention: ScoreEntry; momentum: ScoreEntry; saturation: ScoreEntry;
  coverageQuality: ScoreEntry; companyRelevance: ScoreEntry;
}

interface ConversationLite {
  id: string;
  title: string;
  summary?: string;
  score?: ScoresShape;
  interpretation?: {
    whyIncluded?: string[];
    confidenceLevel?: 'low' | 'moderate' | 'high';
  };
  evidenceSummary?: { itemCount: number; sourceCount: number; lastUpdated: string };
  viewStatus?: string;
  archived?: boolean;
}

interface Action {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  urgency: Urgency;
  status: string;
  rank: number;
  conversationId?: string | null;
}

interface MarketBrief {
  id: string;
  periodStart: string;
  periodEnd: string;
  marketRead: {
    tldr: { headline: string; whyItMatters: string; signals: string[] };
    analystRead: string;
    researchBriefing: {
      analystThesis: string;
      whatChanged: string;
      whatMarketIsSaying: string;
      whatIsMissing: string;
      sourcePattern: string;
      whyItMatters: string;
      sourceEvidence: { source: string; signal: string; type: string }[];
      confidence: string;
      limitations: string;
    };
  };
  commercialImplications: {
    positioning: string; sales: string; content: string; pipeline: string;
  };
  recommendedNextMoves: Action[];
  conversations: ConversationLite[];
  scanStats: {
    sourcesScanned: number;
    itemsReviewed: number;
    conversationsClustered: number;
    itemsFiltered: number;
    confidence: string;
    lastScanAt: string;
    nextScanIn: string;
  };
  isDemo: boolean;
}

function formatActionWindow(start: string, end: string): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const sMonth = s.toLocaleDateString('en-GB', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-GB', { month: 'short' });
  // Compact form when both dates are in the same month: "17-24 May"
  if (sMonth === eMonth) {
    return `${s.getDate()}–${e.getDate()} ${eMonth}`;
  }
  return `${s.getDate()} ${sMonth} – ${e.getDate()} ${eMonth}`;
}

function formatLastScan(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Map a conversation to its display-label per the v2 status spec.
 * The underlying enum is the v1 names (in DB); these are the user-facing strings.
 *
 *   archived               → 'Ignored'
 *   included_in_brief      → 'Included in brief'
 *   action_recommended     → 'Needs review'
 *   monitor_only           → 'Monitor only'
 *   tracked_not_prioritised → 'Watching'
 */
function conversationStatusLabel(c: ConversationLite): {
  label: string;
  tone: 'positive' | 'attention' | 'neutral' | 'muted';
} {
  if (c.archived) return { label: 'Ignored', tone: 'muted' };
  switch (c.viewStatus) {
    case 'included_in_brief':    return { label: 'Included in brief', tone: 'positive' };
    case 'action_recommended':   return { label: 'Needs review', tone: 'attention' };
    case 'monitor_only':         return { label: 'Monitor only', tone: 'neutral' };
    case 'tracked_not_prioritised':
    default:                     return { label: 'Watching', tone: 'neutral' };
  }
}

/**
 * Derive a "Primary signal · Rising" / "Context" style badge for the
 * conversations panel. Uses companyRelevance + momentum.
 */
function influenceLabel(score?: ScoresShape): { label: string; rising: boolean } {
  const v = score?.companyRelevance?.value ?? 0;
  const momentum = (score?.momentum?.label || '').toLowerCase();
  const rising = momentum.includes('rising') || momentum.includes('accelerating');
  let label = 'Context';
  if (v >= 9) label = 'Primary signal';
  else if (v >= 7) label = 'High influence';
  else if (v >= 5) label = 'Supporting';
  return { label, rising };
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const styles: Record<Urgency, string> = {
    'now': 'bg-red-500/10 text-red-400 border border-red-500/30',
    'this-week': 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    'monitor': 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border border-[var(--border)]',
  };
  const labels: Record<Urgency, string> = {
    'now': 'NOW',
    'this-week': 'THIS WEEK',
    'monitor': 'MONITOR',
  };
  return (
    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded ${styles[urgency]}`}>
      {labels[urgency]}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  // Action status (not conversation status). We show "Not started" prominently
  // because it's the default after the system suggests an action; once the
  // user marks it done/snoozed/etc we show that instead.
  const map: Record<string, { label: string; classes: string }> = {
    'not_started': { label: 'Not started', classes: 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border border-[var(--border)]' },
    'in_progress': { label: 'In progress', classes: 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30' },
    'done': { label: 'Done', classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' },
    'ignored': { label: 'Ignored', classes: 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]/60 border border-[var(--border)]' },
    'snoozed': { label: 'Snoozed', classes: 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border border-[var(--border)]' },
    'assigned': { label: 'Assigned', classes: 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30' },
  };
  const entry = map[status] || map['not_started'];
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded ${entry.classes}`}>
      {entry.label}
    </span>
  );
}

export default function MarketBriefPage() {
  const [brief, setBrief] = useState<MarketBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [depthMode, setDepthMode] = useState<DepthMode>('analyst');

  useEffect(() => {
    const url = new URL(window.location.href);
    const demoMode = url.searchParams.get('companyId') === 'demo';
    const fetchUrl = demoMode ? '/api/market-brief?companyId=demo' : '/api/market-brief';
    fetch(fetchUrl)
      .then(r => r.json())
      .then(data => {
        setBrief(data.brief);
        setPreview(Boolean(data.preview));
      })
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!brief) {
    return <BriefEmptyState />;
  }

  // Sort actions so the highest-priority urgent one renders first.
  // The system already orders by rank; this is a defensive sort for safety.
  const actions = [...brief.recommendedNextMoves].sort((a, b) => {
    const urgencyOrder: Record<Urgency, number> = { 'now': 0, 'this-week': 1, 'monitor': 2 };
    const ua = urgencyOrder[a.urgency] ?? 1;
    const ub = urgencyOrder[b.urgency] ?? 1;
    if (ua !== ub) return ua - ub;
    return a.rank - b.rank;
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {preview && (
        <div className="mb-6 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm text-[var(--accent)]">
          Preview mode — showing the Supercede demo. Complete your Company Profile to generate your own Market Brief.
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Market Brief
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              This week's market movement, translated into commercial priorities
            </p>
          </div>
          {brief.isDemo && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--purple)]/10 border border-[var(--purple)]/30 text-xs font-medium text-[var(--purple)] flex-shrink-0">
              Demo — Supercede
            </div>
          )}
        </div>

        {/* Status bar — minimal, just the live-state info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] mt-4 pt-4 border-t border-[var(--border)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[var(--text-primary)]">Active brief</span>
          </span>
          <span className="opacity-50">·</span>
          <span>Action window {formatActionWindow(brief.periodStart, brief.periodEnd)}</span>
          <span className="opacity-50">·</span>
          <span>Last scan {formatLastScan(brief.scanStats.lastScanAt)}</span>
          {brief.scanStats.nextScanIn && (
            <>
              <span className="opacity-50">·</span>
              <span>Next scan in {brief.scanStats.nextScanIn}</span>
            </>
          )}
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Section 01 — Market Read                                          */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">01</span>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Market Read</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                What the market is converging on this week
              </p>
            </div>
          </div>

          {/* Depth selector — right aligned in header */}
          <div className="inline-flex items-center bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-1 flex-shrink-0">
            {(['tldr', 'analyst', 'research'] as DepthMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDepthMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  depthMode === mode
                    ? 'bg-[var(--navy-lighter)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'tldr' ? 'TL;DR' : mode === 'analyst' ? 'Analyst Read' : 'Research Briefing'}
              </button>
            ))}
          </div>
        </div>

        {/* KEY TAKEAWAY card — appears for TL;DR and Analyst modes.
           Promotes the tldr headline so the user gets the punchline before
           reading the analyst body. */}
        {(depthMode === 'tldr' || depthMode === 'analyst') && brief.marketRead.tldr.headline && (
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 mb-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]/60 mb-2">
              Key takeaway
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)] leading-snug">
              {brief.marketRead.tldr.headline}
            </p>
          </div>
        )}

        {depthMode === 'tldr' && (
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
              {brief.marketRead.tldr.whyItMatters}
            </p>
            <ul className="space-y-2">
              {brief.marketRead.tldr.signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--accent)] mt-1">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {depthMode === 'analyst' && (
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-[var(--purple)]/15 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-[var(--purple)]" />
              </div>
              <div className="flex-1 min-w-0">
                {brief.marketRead.analystRead.split(/\n\n+/).filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm text-[var(--text-primary)] leading-relaxed mb-4 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {depthMode === 'research' && (
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 space-y-5">
            <ResearchField label="Analyst thesis" text={brief.marketRead.researchBriefing.analystThesis} />
            <ResearchField label="What changed" text={brief.marketRead.researchBriefing.whatChanged} />
            <ResearchField label="What the market is saying" text={brief.marketRead.researchBriefing.whatMarketIsSaying} />
            <ResearchField label="What is missing" text={brief.marketRead.researchBriefing.whatIsMissing} />
            <ResearchField label="Source pattern" text={brief.marketRead.researchBriefing.sourcePattern} />
            <ResearchField label="Why it matters" text={brief.marketRead.researchBriefing.whyItMatters} />
            {brief.marketRead.researchBriefing.sourceEvidence.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
                  Source evidence
                </div>
                <div className="space-y-2">
                  {brief.marketRead.researchBriefing.sourceEvidence.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-xs font-medium text-[var(--accent)] min-w-[100px]">{s.source}</span>
                      <span className="text-[var(--text-secondary)] flex-1">{s.signal}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/60">{s.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
              <ResearchField label="Confidence" text={brief.marketRead.researchBriefing.confidence} compact />
              <ResearchField label="Limitations" text={brief.marketRead.researchBriefing.limitations} compact />
            </div>
          </div>
        )}

        {/* Scan stats footer — shows the scope behind this read.
           Lives inside Section 01 so it reads as "evidence behind this analysis"
           rather than free-floating chrome up top. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] mt-4 px-4 py-2.5 bg-[var(--navy)]/40 border border-[var(--border)]/40 rounded-lg">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[var(--text-primary)]">Current read</span>
          </span>
          <span className="opacity-50">·</span>
          <span>{brief.scanStats.sourcesScanned} sources monitored</span>
          <span className="opacity-50">·</span>
          <span>{brief.scanStats.itemsReviewed} items reviewed</span>
          <span className="opacity-50">·</span>
          <span>{brief.scanStats.conversationsClustered} conversations clustered</span>
          {brief.scanStats.itemsFiltered > 0 && (
            <>
              <span className="opacity-50">·</span>
              <span>{brief.scanStats.itemsFiltered} low-value items filtered</span>
            </>
          )}
          {brief.scanStats.confidence && (
            <>
              <span className="opacity-50">·</span>
              <span>{brief.scanStats.confidence} confidence</span>
            </>
          )}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Section 02 — This Week's Priorities                                */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">02</span>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">This Week's Priorities</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              What to act on before the next brief
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {actions.map((action, i) => (
            <PriorityCard
              key={action.id}
              action={action}
              index={i}
              isHighestPriority={i === 0 && action.urgency === 'now'}
            />
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Section 03 — Commercial Implications                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">03</span>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Commercial Implications</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              How this changes your positioning, sales, content, and pipeline
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImplicationCard
            label="Positioning"
            icon={Hash}
            accent="#8B5CF6"
            text={brief.commercialImplications.positioning}
          />
          <ImplicationCard
            label="Sales"
            icon={Users}
            accent="#F59E0B"
            text={brief.commercialImplications.sales}
          />
          <ImplicationCard
            label="Content"
            icon={Edit3}
            accent="#10B981"
            text={brief.commercialImplications.content}
          />
          <ImplicationCard
            label="Pipeline"
            icon={BarChart3}
            accent="#EC4899"
            text={brief.commercialImplications.pipeline}
          />
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* Section 04 — Market Conversations Driving This Brief               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">04</span>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Market Conversations Driving This Brief</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Conversations ranked by relevance that shaped this week's read
              </p>
            </div>
          </div>
          <Link
            href={brief.isDemo ? '/market-view?companyId=demo' : '/market-view'}
            className="inline-flex items-center gap-1 text-sm text-[var(--purple)] hover:underline flex-shrink-0"
          >
            All conversations <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
          {brief.conversations.map((c, i) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              index={i}
              isDemo={brief.isDemo}
              isLast={i === brief.conversations.length - 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Subcomponents                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

function PriorityCard({
  action, index, isHighestPriority,
}: {
  action: Action;
  index: number;
  isHighestPriority: boolean;
}) {
  return (
    <div
      className={`bg-[var(--navy-light)] rounded-xl p-5 transition-colors ${
        isHighestPriority
          ? 'border-l-2 border-l-red-500/70 border-y border-r border-y-red-500/20 border-r-red-500/20'
          : 'border border-[var(--border)] hover:border-[var(--accent)]/40'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Number bubble */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
          isHighestPriority
            ? 'bg-red-500/15 text-red-400'
            : 'bg-[var(--navy)] text-[var(--text-secondary)] border border-[var(--border)]'
        }`}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              {isHighestPriority && (
                <div className="text-[10px] font-bold tracking-widest uppercase text-red-400 mb-1">
                  Highest priority
                </div>
              )}
              <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
                {action.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <UrgencyBadge urgency={action.urgency} />
              <StatusPill status={action.status} />
            </div>
          </div>

          {action.description && (
            <div className="border-l-2 border-[var(--border)] pl-3 mt-3">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]/60 mb-1">
                Why now
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {action.description}
              </p>
            </div>
          )}

          {action.conversationId && (
            <Link
              href={`/market-view/${action.conversationId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:gap-2 transition-all mt-3"
            >
              <span>Open conversation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ImplicationCard({
  label, icon: Icon, accent, text,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  text: string;
}) {
  // Split into "lead sentence" + supporting paragraph. The lead is the first
  // full sentence (≤200 chars) so the card reads like a headline + body.
  const sentenceEnd = text.search(/[.!?]\s/);
  const cutAt = sentenceEnd > 0 && sentenceEnd <= 200 ? sentenceEnd + 1 : -1;
  const lead = cutAt > 0 ? text.slice(0, cutAt).trim() : text;
  const rest = cutAt > 0 ? text.slice(cutAt).trim() : '';

  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: accent }}>
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-2">
        {lead}
      </p>
      {rest && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {rest}
        </p>
      )}
    </div>
  );
}

function ConversationRow({
  conversation, index, isDemo, isLast,
}: {
  conversation: ConversationLite;
  index: number;
  isDemo: boolean;
  isLast: boolean;
}) {
  const { label: influence, rising } = influenceLabel(conversation.score);
  const status = conversationStatusLabel(conversation);
  const evidence = conversation.evidenceSummary;
  // Demo viewers don't have a real session, so they can't open the
  // conversation detail page (it 401s). Open-evidence link is hidden for them.
  const href = isDemo
    ? `/market-view/${conversation.id}?companyId=demo`
    : `/market-view/${conversation.id}`;

  return (
    <div className={`px-5 py-4 ${isLast ? '' : 'border-b border-[var(--border)]/60'}`}>
      <div className="flex items-start gap-4">
        {/* Number bubble */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--navy)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)]">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {conversation.title}
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--purple)]/10 text-[var(--purple)] border border-[var(--purple)]/20">
              {influence}{rising ? ' · Rising' : ''}
            </span>
            <StatusBadge tone={status.tone} label={status.label} />
          </div>

          {conversation.interpretation?.whyIncluded?.[0] && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1.5">
              {conversation.interpretation.whyIncluded[0]}
            </p>
          )}

          <div className="flex items-center gap-2.5 mt-2 text-[11px] text-[var(--text-secondary)]/70">
            {evidence && (
              <>
                <span>{evidence.itemCount} items</span>
                <span className="opacity-50">·</span>
                <span>{evidence.sourceCount} sources</span>
                <span className="opacity-50">·</span>
              </>
            )}
            <Link
              href={href}
              className="inline-flex items-center gap-0.5 font-medium text-[var(--purple)] hover:underline"
            >
              Open evidence <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ tone, label }: { tone: 'positive' | 'attention' | 'neutral' | 'muted'; label: string }) {
  const map = {
    positive: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    attention: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    neutral: 'bg-[var(--navy)] text-[var(--text-secondary)] border border-[var(--border)]',
    muted: 'bg-[var(--navy)] text-[var(--text-secondary)]/60 border border-[var(--border)]',
  } as const;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${map[tone]}`}>
      {label}
    </span>
  );
}

function ResearchField({ label, text, compact = false }: { label: string; text: string; compact?: boolean }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-1">
        {label}
      </div>
      <p className={`text-sm text-[var(--text-primary)] leading-relaxed ${compact ? '' : ''}`}>
        {text}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Empty state — bootstrap polling                                          */
/* ──────────────────────────────────────────────────────────────────────── */

type BootstrapStatus =
  | 'pending'
  | 'enriching_profile'
  | 'scoring_signals'
  | 'clustering'
  | 'interpreting'
  | 'generating_brief'
  | 'complete'
  | 'failed';

interface BootstrapProgressResponse {
  status: BootstrapStatus;
  label: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string;
  progress: {
    signalsScored?: number;
    conversationsCreated?: number;
    conversationsInterpreted?: number;
    briefGenerated?: boolean;
  };
}

const PIPELINE_STEPS: { key: BootstrapStatus; label: string }[] = [
  { key: 'enriching_profile', label: 'Building your Company Profile' },
  { key: 'scoring_signals', label: 'Scoring 30 days of coverage' },
  { key: 'clustering', label: 'Clustering into conversations' },
  { key: 'interpreting', label: 'Producing strategic analysis' },
  { key: 'generating_brief', label: 'Synthesising your first brief' },
];

function statusToStepIndex(status: BootstrapStatus): number {
  const idx = PIPELINE_STEPS.findIndex(s => s.key === status);
  if (idx >= 0) return idx;
  if (status === 'complete') return PIPELINE_STEPS.length;
  return -1;
}

function BriefEmptyState() {
  const [progress, setProgress] = useState<BootstrapProgressResponse | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/company-profile')
      .then(r => r.json())
      .then(data => {
        setHasProfile(Boolean(data?.profile?.oneLineDescription) && !data?.preview);
      })
      .catch(() => setHasProfile(false));
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const r = await fetch('/api/onboarding/bootstrap-status');
        const data = await r.json() as BootstrapProgressResponse;
        setProgress(data);
        if (data.status === 'complete') {
          if (pollRef.current) clearInterval(pollRef.current);
          window.location.reload();
        }
        if (data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isRunning = progress && progress.status !== 'pending' && progress.status !== 'complete' && progress.status !== 'failed';
  const currentStepIdx = progress ? statusToStepIndex(progress.status) : -1;

  return (
    <div className="max-w-2xl mx-auto p-8 mt-16">
      <div className="text-center mb-10">
        <Activity className="w-12 h-12 text-[var(--accent)] mx-auto mb-6 opacity-80" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          {isRunning ? 'Building your first Market Brief…' : 'Set up your Market Brief'}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          {isRunning
            ? "We're scanning your market, clustering coverage into conversations, and synthesising your first weekly brief. This usually takes 2–4 minutes."
            : progress?.status === 'failed'
              ? 'Something went wrong setting up your brief. Try completing your Company Profile and we\'ll retry on the next cron run.'
              : 'Complete your Company Profile and we\'ll scan the last 30 days of coverage, cluster it into conversations, and produce your first Market Brief automatically.'}
        </p>
      </div>

      {isRunning && (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <ul className="space-y-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  {done ? (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-secondary)]/30 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${done ? 'text-[var(--text-secondary)]' : active ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]/50'}`}>
                    {step.label}
                    {active && progress?.progress.signalsScored && step.key === 'scoring_signals' && (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]/70">
                        ({progress.progress.signalsScored} signals scored)
                      </span>
                    )}
                    {active && progress?.progress.conversationsCreated && step.key === 'clustering' && (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]/70">
                        ({progress.progress.conversationsCreated} conversations)
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {hasProfile === false ? (
          <Link
            href="/onboarding"
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Run onboarding →
          </Link>
        ) : (
          <Link
            href="/company-profile"
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {progress?.status === 'pending' ? 'Complete your Company Profile' : 'Refine your Company Profile'} →
          </Link>
        )}
        <Link
          href="/market-view"
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors"
        >
          See the market map
        </Link>
      </div>

      {progress?.status === 'failed' && progress.error && (
        <div className="mt-6 p-4 bg-red-500/5 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div><strong>Error:</strong> {progress.error}</div>
        </div>
      )}
    </div>
  );
}
