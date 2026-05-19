'use client';
/**
 * Market Brief — the new primary landing page in the IA.
 *
 * Four sections in order:
 *   1. Scan bar — what was monitored in the last scan
 *   2. Market Read — TL;DR / Analyst Read / Research Briefing depth selector
 *   3. This Week's Priorities — recommended actions
 *   4. Commercial Implications — positioning / sales / content / pipeline
 *   5. Market Conversations Driving This Brief — evidence rows
 */
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, ChevronRight, Loader2, Check, Circle } from 'lucide-react';

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
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function formatLastScan(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function influenceLabel(score?: ScoresShape): string {
  const v = score?.companyRelevance?.value ?? 0;
  const momentum = (score?.momentum?.label || '').toLowerCase();
  const rising = momentum.includes('rising') || momentum.includes('accelerating');
  let base = 'Context';
  if (v >= 9) base = 'Primary signal';
  else if (v >= 7) base = 'High influence';
  else if (v >= 5) base = 'Supporting';
  return rising ? `${base} · Rising` : base;
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {preview && (
        <div className="mb-6 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm text-[var(--accent)]">
          Preview mode — showing the Supercede demo. Complete your Company Profile to generate your own Market Brief.
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Market Brief
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              This week's market movement, translated into commercial priorities
            </p>
          </div>
          {brief.isDemo && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-xs font-medium text-[var(--accent)]">
              Demo — Supercede
            </div>
          )}
        </div>

        {/* Scan bar */}
        <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--navy-light)] border border-[var(--border)] rounded-lg px-4 py-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-medium text-[var(--text-primary)]">Active brief</span>
          <span className="opacity-50">·</span>
          <span>Action window {formatActionWindow(brief.periodStart, brief.periodEnd)}</span>
          <span className="opacity-50">·</span>
          <span>{brief.scanStats.sourcesScanned} sources</span>
          <span className="opacity-50">·</span>
          <span>{brief.scanStats.itemsReviewed} items</span>
          <span className="opacity-50">·</span>
          <span>{brief.scanStats.conversationsClustered} conversations</span>
          <span className="opacity-50">·</span>
          <span>Last scan {formatLastScan(brief.scanStats.lastScanAt)}</span>
        </div>
      </header>

      {/* Section 1 — Market Read */}
      <section className="mb-12">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">01</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Market Read</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The intelligence layer. Choose your depth.
        </p>

        {/* Depth selector */}
        <div className="inline-flex items-center bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-1 mb-6">
          {(['tldr', 'analyst', 'research'] as DepthMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setDepthMode(mode)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                depthMode === mode
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {mode === 'tldr' ? 'TL;DR' : mode === 'analyst' ? 'Analyst Read' : 'Research Briefing'}
            </button>
          ))}
        </div>

        {depthMode === 'tldr' && (
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 leading-snug">
              {brief.marketRead.tldr.headline}
            </h3>
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
            {brief.marketRead.analystRead.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-sm text-[var(--text-primary)] leading-relaxed mb-4 last:mb-0">
                {para}
              </p>
            ))}
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
      </section>

      {/* Section 2 — This Week's Priorities */}
      <section className="mb-12">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">02</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">This Week's Priorities</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Specific moves to make this week, grounded in the brief above.
        </p>

        <div className="space-y-3">
          {brief.recommendedNextMoves.map((action, i) => (
            <div
              key={action.id}
              className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl font-bold text-[var(--text-secondary)]/20 tabular-nums leading-none mt-1">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
                      {action.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <UrgencyBadge urgency={action.urgency} />
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                    {action.description}
                  </p>
                  {action.conversationId && (
                    <Link
                      href={`/market-view/${action.conversationId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:gap-2 transition-all"
                    >
                      <span>Open conversation</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Commercial Implications */}
      <section className="mb-12">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">03</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Commercial Implications</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          How this changes your positioning, sales, content, and pipeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImplicationCard label="POSITIONING" color="indigo" text={brief.commercialImplications.positioning} />
          <ImplicationCard label="SALES" color="amber" text={brief.commercialImplications.sales} />
          <ImplicationCard label="CONTENT" color="emerald" text={brief.commercialImplications.content} />
          <ImplicationCard label="PIPELINE" color="pink" text={brief.commercialImplications.pipeline} />
        </div>
      </section>

      {/* Section 4 — Conversations driving the brief */}
      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]/40 tabular-nums">04</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Market Conversations Driving This Brief</h2>
          </div>
          <Link
            href="/market-view"
            className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
          >
            All conversations <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Conversations ranked by relevance that shaped this week's read.
        </p>

        <div className="space-y-2">
          {brief.conversations.map((c, i) => (
            <Link
              key={c.id}
              href={`/market-view/${c.id}`}
              className="flex items-center gap-4 px-4 py-3 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)]/40 hover:bg-[var(--navy-lighter)] transition-all group"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]/40 tabular-nums w-6">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {c.title}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] flex-shrink-0">
                    {influenceLabel(c.score)}
                  </span>
                </div>
                {c.interpretation?.whyIncluded?.[0] && (
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {c.interpretation.whyIncluded[0]}
                  </p>
                )}
                {c.evidenceSummary && (
                  <p className="text-[10px] text-[var(--text-secondary)]/60 mt-1">
                    {c.evidenceSummary.itemCount} items · {c.evidenceSummary.sourceCount} sources · updated {c.evidenceSummary.lastUpdated}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]/40 group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Empty state with bootstrap progress polling ─────────────────────────
//
// When a real account has no Market Brief yet, poll /api/onboarding/bootstrap-status
// every 5 seconds to show the user what's happening. This replaces the
// "your brief is being prepared, lands Monday" black-box message with a
// step-by-step progress visualization.

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

  // Check whether the user has actually completed onboarding. If their profile
  // is empty we send them to /onboarding (the right next step) rather than
  // /company-profile (which would also be empty).
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
          // Bootstrap finished — reload to fetch the new brief
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
        <div className="mt-6 p-4 bg-red-500/5 border border-red-500/30 rounded-lg text-sm text-red-400">
          <strong>Error:</strong> {progress.error}
        </div>
      )}
    </div>
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

function ImplicationCard({
  label, color, text,
}: { label: string; color: 'indigo' | 'amber' | 'emerald' | 'pink'; text: string }) {
  const colorClass = {
    indigo: 'text-[var(--accent)]',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    pink: 'text-pink-400',
  }[color];

  // Split into "headline" (first sentence up to ~160 chars) + supporting paragraph
  const idx = text.length > 160 ? -1 : text.indexOf('. ');
  const cutAt = idx > 0 && idx <= 160 ? idx + 1 : -1;
  const headline = cutAt > 0 ? text.slice(0, cutAt).trim() : text;
  const rest = cutAt > 0 ? text.slice(cutAt).trim() : '';

  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
      <div className={`text-[10px] font-bold tracking-widest uppercase mb-3 ${colorClass}`}>
        {label}
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-2">
        {headline}
      </p>
      {rest && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {rest}
        </p>
      )}
    </div>
  );
}
