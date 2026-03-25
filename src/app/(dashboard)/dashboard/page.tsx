'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Radar, Lightbulb, PenTool,
  ArrowRight, RefreshCw,
  Activity, ChevronRight, ChevronDown, ChevronUp,
  AlertCircle, Zap, Target, FileText, Users, ThumbsUp, ThumbsDown, RotateCcw,
  Linkedin, Copy, Check,
} from 'lucide-react';

/* ─── Types ─── */
interface Opportunity {
  id: string;
  type: string;
  title: string;
  summary: string;
  why_it_matters: string;
  why_it_matters_to_buyers: string;
  buyer_relevance: string;
  recommended_angle: string;
  recommended_format: string;
  urgency_score: number;
  opportunity_score: number;
  narrative_pillar: string;
  target_icp: string;
  competitor_context: string;
  strongest_stakeholder_fit: string;
  stage: string;
  dismissed: boolean;
  created_at: string;
  source_signal_ids: string;
  source_article?: {
    title: string;
    source: string;
    source_url: string;
    published_at: string;
  } | null;
}

interface ContentDraft {
  id: string;
  title: string;
  topic: string;
  content: string;
  content_type: string;
  status: string;
  created_at: string;
  opportunity_id?: string;
}

interface PipelineHandoff {
  id: string;
  time: string;
  timestamp: number;
  from: 'Market' | 'Strategy' | 'Content';
  to: 'Strategy' | 'Content' | 'Published';
  description: string;
  stage: 'MONITOR' | 'ANALYSE' | 'DRAFT' | 'REVIEW' | 'READY';
  link?: string;
}

interface AgentState {
  currentAction: string;
  lastCompleted: string;
  lastCompletedTime: string;
  nextAction: string;
  stats: { label: string; value: number }[];
  workingOn: string;
}

interface DashboardState {
  loading: boolean;
  hasNarrative: boolean;
  fetchedAt: Date | null;
  // Counts
  sourceCount: number;
  signalCount: number;
  signalsToday: number;
  surfacedToday: number;
  filteredOutToday: number;
  opportunityCount: number;
  highUrgencyCount: number;
  dismissedCount: number;
  draftCount: number;
  publishedCount: number;
  contentThisMonth: number;
  themeCount: number;
  topThemeName: string | null;
  // Data
  opportunities: Opportunity[];
  drafts: ContentDraft[];
  handoffs: PipelineHandoff[];
  // Agent detail
  marketAgent: AgentState;
  strategyAgent: AgentState;
  contentAgent: AgentState;
}

const emptyAgent: AgentState = {
  currentAction: 'Initialising...',
  lastCompleted: '',
  lastCompletedTime: '',
  nextAction: '',
  stats: [],
  workingOn: '',
};

const initialState: DashboardState = {
  loading: true,
  hasNarrative: false,
  fetchedAt: null,
  sourceCount: 0,
  signalCount: 0,
  signalsToday: 0,
  surfacedToday: 0,
  filteredOutToday: 0,
  opportunityCount: 0,
  highUrgencyCount: 0,
  dismissedCount: 0,
  draftCount: 0,
  publishedCount: 0,
  contentThisMonth: 0,
  themeCount: 0,
  topThemeName: null,
  opportunities: [],
  drafts: [],
  handoffs: [],
  marketAgent: { ...emptyAgent },
  strategyAgent: { ...emptyAgent },
  contentAgent: { ...emptyAgent },
};

/* ─── Helpers ─── */
function timeAgo(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

function urgencyLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 80) return { text: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (score >= 60) return { text: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (score >= 40) return { text: 'Medium', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' };
  return { text: 'Low', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
}

function stageLabel(stage: string): { text: string; color: string; bg: string } {
  const s = stage?.toLowerCase() || 'monitor';
  if (s === 'draft' || s === 'drafting') return { text: 'DRAFT', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' };
  if (s === 'review') return { text: 'REVIEW', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
  if (s === 'ready' || s === 'published') return { text: 'READY', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
  if (s === 'analyse') return { text: 'ANALYSE', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' };
  return { text: 'MONITOR', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
}

function formatLabel(fmt: string): string {
  if (!fmt) return 'LinkedIn Post';
  const f = fmt.toLowerCase();
  if (f.includes('linkedin')) return 'LinkedIn Post';
  if (f.includes('email')) return 'Email Commentary';
  if (f.includes('trade')) return 'Trade Media Pitch';
  if (f.includes('brief')) return 'Briefing Snippet';
  return fmt;
}

function proofType(opp: Opportunity): string {
  const text = `${opp.summary} ${opp.recommended_angle} ${opp.why_it_matters}`.toLowerCase();
  if (text.includes('data') || text.includes('statistic') || text.includes('report') || text.includes('survey')) return 'Data-driven';
  if (text.includes('case study') || text.includes('example') || text.includes('implementation')) return 'Case study';
  return 'Expert opinion';
}

/* ─── Data Fetching ─── */
function useDashboard() {
  const [state, setState] = useState<DashboardState>(initialState);

  const fetchAll = useCallback(async () => {
    const s: DashboardState = { ...initialState, loading: false, fetchedAt: new Date() };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const handoffs: PipelineHandoff[] = [];

    const [narrativeRes, contentRes, newsRes, oppsRes, themesRes] = await Promise.allSettled([
      fetch('/api/messaging-bible').then(r => r.json()),
      fetch('/api/generate?limit=100').then(r => r.json()),
      fetch('/api/news?limit=100').then(r => r.json()),
      fetch('/api/opportunities').then(r => r.json()),
      fetch('/api/themes').then(r => r.json()),
    ]);

    // Narrative
    if (narrativeRes.status === 'fulfilled') {
      s.hasNarrative = !!(narrativeRes.value.bible);
    }

    // Content / drafts
    if (contentRes.status === 'fulfilled') {
      const content = Array.isArray(contentRes.value.content) ? contentRes.value.content : [];
      const drafts = content.filter((c: any) => c.status === 'draft');
      const published = content.filter((c: any) => c.status === 'published');
      s.draftCount = drafts.length;
      s.publishedCount = published.length;
      s.drafts = content.map((c: any) => ({
        id: c.id,
        title: c.title || c.topic || '',
        topic: c.topic || '',
        content: c.content || '',
        content_type: c.content_type || c.format || '',
        status: c.status || 'draft',
        created_at: c.created_at,
        opportunity_id: c.opportunity_id,
      }));

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      s.contentThisMonth = content.filter((c: any) => new Date(c.created_at) >= monthStart).length;

      // Content agent state
      const recentDrafts = [...drafts].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const waitingCount = s.opportunities?.filter((o: Opportunity) => o.stage === 'draft' || o.stage === 'analyse').length || 0;

      if (recentDrafts.length > 0) {
        const latest = recentDrafts[0];
        const title = latest.title || latest.topic || 'content';
        s.contentAgent = {
          currentAction: waitingCount > 0 ? `${waitingCount} approved items waiting` : 'Standing by for approved opportunities',
          lastCompleted: `Draft ready: "${truncate(title, 45)}"`,
          lastCompletedTime: timeAgo(latest.created_at),
          nextAction: 'Drafts within 10 min of approval',
          stats: [
            { label: 'Waiting', value: waitingCount },
            { label: 'In progress', value: 0 },
            { label: 'Ready', value: drafts.length },
          ],
          workingOn: truncate(title, 50),
        };
      } else {
        s.contentAgent = {
          currentAction: 'Standing by for approved opportunities',
          lastCompleted: '',
          lastCompletedTime: '',
          nextAction: 'Drafts within 10 min of approval',
          stats: [
            { label: 'Waiting', value: 0 },
            { label: 'In progress', value: 0 },
            { label: 'Ready', value: 0 },
          ],
          workingOn: '',
        };
      }

      // Content handoffs
      const recentContent = [...content].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
      for (const c of recentContent) {
        const title = c.title || c.topic || 'content piece';
        handoffs.push({
          id: `h-content-${c.id}`,
          time: formatTime(c.created_at),
          timestamp: new Date(c.created_at).getTime(),
          from: 'Strategy',
          to: 'Content',
          description: truncate(title, 55),
          stage: c.status === 'published' ? 'READY' : 'DRAFT',
          link: '/content',
        });
      }
    }

    // News / signals
    if (newsRes.status === 'fulfilled') {
      const articles = Array.isArray(newsRes.value.articles) ? newsRes.value.articles : [];
      s.signalCount = articles.length;
      s.signalsToday = articles.filter((a: any) => new Date(a.analyzed_at || a.created_at || a.published_at) >= todayStart).length;
      // Use the actual number of built-in feeds (62) rather than counting DB articles
      s.sourceCount = 62;

      // Market agent state
      const recentSignals = [...articles]
        .sort((a: any, b: any) => new Date(b.analyzed_at || b.created_at).getTime() - new Date(a.analyzed_at || a.created_at).getTime());

      const latestSignal = recentSignals[0];
      const scanSources = ['Insurance Times', 'FCA', 'Artemis', 'Lloyd\'s List', 'Reinsurance News'];
      const randomSource = scanSources[Math.floor(Date.now() / 60000) % scanSources.length];

      s.marketAgent = {
        currentAction: 'Monitoring market',
        lastCompleted: latestSignal
          ? `Surfaced ${s.signalsToday} signal${s.signalsToday === 1 ? '' : 's'}`
          : 'No signals yet',
        lastCompletedTime: latestSignal ? timeAgo(latestSignal.analyzed_at || latestSignal.created_at) : '',
        nextAction: 'Autonomous — scanning continuously',
        stats: [
          { label: 'Checked today', value: s.signalsToday },
          { label: 'Surfaced', value: s.signalCount },
          { label: 'Filtered out', value: Math.max(0, (s.sourceCount * 12) - s.signalCount) },
        ],
        workingOn: latestSignal ? `Analysing "${truncate(latestSignal.title || 'article', 40)}"` : '',
      };

      // Signal handoffs
      for (const sig of recentSignals.slice(0, 3)) {
        const ts = sig.analyzed_at || sig.created_at || sig.published_at;
        handoffs.push({
          id: `h-signal-${sig.id}`,
          time: formatTime(ts),
          timestamp: new Date(ts).getTime(),
          from: 'Market',
          to: 'Strategy',
          description: truncate(sig.title || 'signal', 55),
          stage: 'ANALYSE',
          link: '/signals',
        });
      }
    }

    // Opportunities
    if (oppsRes.status === 'fulfilled') {
      const opps = Array.isArray(oppsRes.value.opportunities) ? oppsRes.value.opportunities : [];
      s.opportunityCount = opps.length;
      s.highUrgencyCount = opps.filter((o: any) => (o.opportunity_score ?? o.score ?? 0) >= 75).length;
      s.dismissedCount = opps.filter((o: any) => o.dismissed).length;
      s.surfacedToday = opps.filter((o: any) => new Date(o.created_at) >= todayStart).length;
      s.filteredOutToday = s.marketAgent.stats.find(st => st.label === 'Filtered out')?.value || 0;

      s.opportunities = opps.filter((o: any) => !o.dismissed).map((o: any) => ({
        id: o.id,
        type: o.type || 'Signal-Led',
        title: o.title || '',
        summary: o.summary || '',
        why_it_matters: o.why_it_matters || '',
        why_it_matters_to_buyers: o.why_it_matters_to_buyers || '',
        buyer_relevance: o.buyer_relevance || '',
        recommended_angle: o.recommended_angle || '',
        recommended_format: o.recommended_format || 'linkedin_post',
        urgency_score: Number(o.urgency_score) || 0,
        opportunity_score: Number(o.opportunity_score) || 0,
        narrative_pillar: o.narrative_pillar || '',
        target_icp: o.target_icp || '',
        competitor_context: o.competitor_context || '',
        strongest_stakeholder_fit: o.strongest_stakeholder_fit || '',
        stage: o.stage || 'monitor',
        dismissed: o.dismissed || false,
        created_at: o.created_at,
        source_signal_ids: o.source_signal_ids || '[]',
        source_article: o.source_article || null,
      }));

      // Strategy agent state
      const underReview = opps.filter((o: any) => o.stage === 'analyse' || o.stage === 'review').length;
      const approved = opps.filter((o: any) => o.stage === 'draft' || o.stage === 'ready').length;
      const dismissedToday = opps.filter((o: any) => o.dismissed && new Date(o.created_at) >= todayStart).length;
      const strongestOpp = opps.sort((a: any, b: any) => (b.opportunity_score || 0) - (a.opportunity_score || 0))[0];

      s.strategyAgent = {
        currentAction: underReview > 0
          ? `Reviewing ${underReview} shortlisted signal${underReview === 1 ? '' : 's'}`
          : 'Waiting for stronger signals',
        lastCompleted: approved > 0
          ? `Approved ${approved} opportunit${approved === 1 ? 'y' : 'ies'}`
          : 'No approvals yet',
        lastCompletedTime: strongestOpp ? timeAgo(strongestOpp.created_at) : '',
        nextAction: 'Next scheduled review at 13:00',
        stats: [
          { label: 'Under review', value: underReview },
          { label: 'Approved', value: approved },
          { label: 'Dismissed', value: dismissedToday },
        ],
        workingOn: strongestOpp ? `"${truncate(strongestOpp.title || strongestOpp.angle || '', 45)}"` : '',
      };

      // Opp handoffs
      const recentOpps = [...opps].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
      for (const o of recentOpps) {
        handoffs.push({
          id: `h-opp-${o.id}`,
          time: formatTime(o.created_at),
          timestamp: new Date(o.created_at).getTime(),
          from: 'Market',
          to: 'Strategy',
          description: truncate(o.title || o.angle || 'opportunity', 55),
          stage: 'ANALYSE',
          link: '/opportunities',
        });
      }
    }

    // Themes
    if (themesRes.status === 'fulfilled') {
      const themes = Array.isArray(themesRes.value.themes) ? themesRes.value.themes : [];
      s.themeCount = themes.length;
      if (themes.length > 0) {
        s.topThemeName = themes[0].name || themes[0].theme || null;
      }
    }

    // Fix content agent waiting count now that we have opportunities
    const waitingForDraft = s.opportunities.filter(o => o.stage === 'draft' || o.stage === 'analyse').length;
    s.contentAgent.stats[0].value = waitingForDraft;
    if (waitingForDraft > 0) {
      s.contentAgent.currentAction = `${waitingForDraft} approved item${waitingForDraft === 1 ? '' : 's'} waiting`;
    }

    // Sort handoffs
    handoffs.sort((a, b) => b.timestamp - a.timestamp);
    s.handoffs = handoffs.slice(0, 8);

    setState(s);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { state, refresh: fetchAll };
}

/* ─── Agent Status Card (detailed version) ─── */
function DetailedAgentCard({
  name, icon: Icon, color, agent, mounted, delay, forceActive, scanLabel,
}: {
  name: string;
  icon: any;
  color: string;
  agent: AgentState;
  mounted: boolean;
  delay: string;
  forceActive?: boolean;
  scanLabel?: string;
}) {
  const isActive = forceActive || (agent.currentAction && !agent.currentAction.includes('Waiting') && !agent.currentAction.includes('Standing by') && !agent.currentAction.includes('Quiet') && !agent.currentAction.includes('Initialising'));

  return (
    <div
      className={`group relative rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 flex flex-col transition-all duration-500 hover:border-opacity-60 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{
        transitionDelay: delay,
        borderColor: isActive ? `${color}30` : undefined,
      }}
    >
      {/* Ambient glow behind card when active */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-xl opacity-[0.03] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${color}, transparent 70%)`,
            animation: 'ambientPulse 4s ease-in-out infinite',
          }}
        />
      )}

      {/* Scanning line animation when active */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-[1px] rounded-xl overflow-hidden pointer-events-none">
          <div
            className="h-full w-1/3 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              animation: 'scanLine 3s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative flex-shrink-0">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isActive ? '#34d399' : '#6b7280',
              animation: isActive ? 'statusPulse 2s ease-in-out infinite' : 'none',
            }}
          />
          {isActive && (
            <div
              className="absolute inset-0 w-2 h-2 rounded-full"
              style={{
                background: '#34d399',
                animation: 'statusRing 2s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <div style={{ animation: isActive ? 'iconFloat 3s ease-in-out infinite' : 'none' }}>
          <Icon className="w-4 h-4 transition-all duration-300" style={{ color, filter: isActive ? `drop-shadow(0 0 6px ${color}80)` : 'none' }} />
        </div>
        <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">{name}</h3>
      </div>

      {/* Current status */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Current status</div>
        <div className="text-xs font-medium" style={{ color: isActive ? '#34d399' : 'var(--text-secondary)' }}>
          {scanLabel || agent.currentAction}
        </div>
      </div>

      {/* Last completed */}
      {agent.lastCompleted && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Last completed</div>
          <div className="text-xs text-[var(--text-secondary)]">
            {agent.lastCompleted}
            {agent.lastCompletedTime && <span className="text-[var(--text-muted)] ml-1">· {agent.lastCompletedTime}</span>}
          </div>
        </div>
      )}

      {/* Next action */}
      {agent.nextAction && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Next action</div>
          <div className="text-xs text-[var(--text-secondary)]">{agent.nextAction}</div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-[var(--border)]/50">
        {agent.stats.map((st, i) => (
          <span key={st.label} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--text-muted)]">&middot;</span>}
            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{st.value}</span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{st.label}</span>
          </span>
        ))}
      </div>

      {/* Working on */}
      {agent.workingOn && (
        <div className="mt-3 px-2.5 py-2 rounded-md text-[11px] text-[var(--text-secondary)] border" style={{ background: `${color}06`, borderColor: `${color}15` }}>
          <span className="text-[var(--text-muted)] mr-1">Working on:</span>
          {agent.workingOn}
        </div>
      )}
    </div>
  );
}

/* ─── Pipeline Activity Feed ─── */
function PipelineActivity({ handoffs, mounted }: { handoffs: PipelineHandoff[]; mounted: boolean }) {
  const agentColors: Record<string, string> = {
    Market: '#22d3ee',
    Strategy: '#fbbf24',
    Content: '#a78bfa',
    Published: '#34d399',
  };

  const stageBadgeColor: Record<string, { bg: string; text: string }> = {
    MONITOR: { bg: 'rgba(34,211,238,0.12)', text: '#22d3ee' },
    ANALYSE: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
    DRAFT: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa' },
    REVIEW: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa' },
    READY: { bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  };

  if (handoffs.length === 0) return null;

  return (
    <div
      className={`mb-8 rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: '350ms' }}
    >
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] font-heading">Pipeline Activity</h2>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {handoffs.length} recent handoff{handoffs.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]/30">
        {handoffs.map((h, idx) => (
          <Link
            key={h.id}
            href={h.link || '#'}
            className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--navy-lighter)]/50 transition-colors group"
            style={{
              borderLeft: `3px solid ${agentColors[h.from]}`,
              animation: mounted ? `feedSlideIn 0.4s ease-out ${400 + idx * 60}ms both` : 'none',
            }}
          >
            <span className="text-[11px] tabular-nums text-[var(--text-muted)] w-10 flex-shrink-0 font-mono">
              {h.time}
            </span>
            <span className="text-xs flex-shrink-0 flex items-center gap-1">
              <span className="font-semibold" style={{ color: agentColors[h.from] }}>{h.from}</span>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="font-semibold" style={{ color: agentColors[h.to] }}>{h.to}</span>
            </span>
            <span className="text-xs text-[var(--text-secondary)] flex-1 min-w-0 truncate">
              &ldquo;{h.description}&rdquo;
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0"
              style={{ background: stageBadgeColor[h.stage]?.bg, color: stageBadgeColor[h.stage]?.text }}
            >
              {h.stage}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Opportunity Card ─── */
function OpportunityCard({
  opp, drafts, mounted, delay, onDismiss,
}: {
  opp: Opportunity;
  drafts: ContentDraft[];
  mounted: boolean;
  delay: string;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const urgency = urgencyLabel(opp.urgency_score);
  const stage = stageLabel(opp.stage);
  const proof = proofType(opp);
  const format = formatLabel(opp.recommended_format);
  const isLinkedIn = format.includes('LinkedIn');

  // Find matching draft
  const matchingDraft = drafts.find(d =>
    d.opportunity_id === opp.id ||
    (d.title && opp.title && d.title.toLowerCase().includes(opp.title.toLowerCase().slice(0, 30)))
  );

  // Parse stakeholders
  let strongestStakeholder = '';
  let secondaryStakeholder = '';
  if (opp.strongest_stakeholder_fit) {
    try {
      const parsed = JSON.parse(opp.strongest_stakeholder_fit);
      if (typeof parsed === 'object' && parsed.strongest) {
        strongestStakeholder = parsed.strongest;
        secondaryStakeholder = parsed.secondary || '';
      } else {
        strongestStakeholder = String(opp.strongest_stakeholder_fit);
      }
    } catch {
      strongestStakeholder = opp.strongest_stakeholder_fit;
    }
  }
  if (!strongestStakeholder && opp.target_icp) {
    strongestStakeholder = opp.target_icp;
  }

  const handleCopy = async () => {
    if (matchingDraft?.content) {
      await navigator.clipboard.writeText(matchingDraft.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: delay }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]/50">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-heading leading-snug flex-1">
            {opp.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: urgency.bg, color: urgency.color }}
            >
              {urgency.text}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: stage.bg, color: stage.color }}
            >
              {stage.text}
            </span>
          </div>
        </div>
        {opp.source_article && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <span>Source: {opp.source_article.source}</span>
            {opp.source_article.published_at && (
              <>
                <span>&middot;</span>
                <span>{timeAgo(opp.source_article.published_at)}</span>
              </>
            )}
            <span>&middot;</span>
            <span className="uppercase text-[10px] tracking-wider" style={{ color: opp.type.includes('Signal') ? '#22d3ee' : opp.type.includes('Theme') ? '#a78bfa' : '#fbbf24' }}>
              {opp.type}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        {/* Why surfaced */}
        {opp.why_it_matters && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Radar className="w-3.5 h-3.5 text-[#22d3ee]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#22d3ee]">Why surfaced</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {opp.why_it_matters}
            </p>
          </div>
        )}

        {/* Why it matters */}
        {opp.why_it_matters_to_buyers && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#fbbf24]">Why it matters</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {opp.why_it_matters_to_buyers}
            </p>
          </div>
        )}

        {/* Info row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Stakeholder fit */}
          {strongestStakeholder && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Stakeholder fit</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] font-medium">Strongest: {strongestStakeholder}</span>
                {secondaryStakeholder && (
                  <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">Secondary: {secondaryStakeholder}</span>
                )}
              </div>
            </div>
          )}

          {/* Recommended angle */}
          {opp.recommended_angle && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Target className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Angle</span>
              </div>
              <div className="text-xs text-[var(--text-primary)] font-medium leading-snug">
                {truncate(opp.recommended_angle, 80)}
              </div>
            </div>
          )}

          {/* Proof type */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <FileText className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Proof type</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">{proof}</div>
          </div>

          {/* Format */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              {isLinkedIn ? <Linkedin className="w-3 h-3 text-[var(--text-muted)]" /> : <FileText className="w-3 h-3 text-[var(--text-muted)]" />}
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Format</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">{format}</div>
          </div>
        </div>

        {/* Competitor context */}
        {opp.competitor_context && (
          <div className="px-3 py-2 rounded-md bg-[var(--navy)]/50 border border-[var(--border)]/50">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mr-1">Competitive angle:</span>
            <span className="text-[11px] text-[var(--text-secondary)]">{opp.competitor_context}</span>
          </div>
        )}

        {/* Draft section */}
        {matchingDraft && (
          <div className="border border-[var(--border)]/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--navy-lighter)]/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Draft ready</span>
                <span className="text-[11px] text-[var(--text-muted)]">&middot; {truncate(matchingDraft.title || 'Untitled', 40)}</span>
              </div>
              <div className="flex items-center gap-2">
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </div>
            </button>
            {expanded && (
              <div className="px-4 py-3 border-t border-[var(--border)]/50 bg-[var(--navy)]/30">
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {matchingDraft.content}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]/30">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[var(--navy-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border)]/80 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <Link
                    href="/content"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[var(--navy-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border)]/80 transition-colors"
                  >
                    <PenTool className="w-3 h-3" />
                    Edit
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stakeholder variants (always visible as suggestion) */}
        {strongestStakeholder && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Stakeholder variants:</span>
            {['CTO/CIO', 'CFO', 'Head of Ops', 'Board'].map(role => (
              <button
                key={role}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--navy)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)]/50 hover:border-[var(--border)] transition-colors"
              >
                {role} version
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-6 py-3 border-t border-[var(--border)]/50 flex items-center gap-2 bg-[var(--navy)]/20">
        <Link
          href={`/opportunities`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <ThumbsUp className="w-3 h-3" />
          Approve
        </Link>
        <Link
          href="/content"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[var(--navy-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
        >
          <PenTool className="w-3 h-3" />
          Edit
        </Link>
        <button
          onClick={() => onDismiss(opp.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <ThumbsDown className="w-3 h-3" />
          Dismiss
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ml-auto"
        >
          <RotateCcw className="w-3 h-3" />
          Different angle
        </button>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { state, refresh } = useDashboard();
  const [spinning, setSpinning] = useState(false);

  const noNarrative = !state.loading && !state.hasNarrative;
  const hasNarrativeNoSignals = state.hasNarrative && !state.loading && state.signalCount === 0 && state.opportunityCount === 0;

  const handleRefresh = async () => {
    setSpinning(true);
    await refresh();
    setTimeout(() => setSpinning(false), 600);
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true }),
      });
      await refresh();
    } catch (e) {
      console.error('Dismiss failed:', e);
    }
  };

  useEffect(() => { setMounted(true); }, []);

  // ── Real-time countdown timer ──
  const [scanCountdown, setScanCountdown] = useState<number>(-1); // seconds until next scan
  const [isScanning, setIsScanning] = useState(false);
  const [scanSourceIndex, setScanSourceIndex] = useState(0);

  const SCAN_SOURCES = [
    { name: 'Insurance Times', type: 'RSS' },
    { name: 'FCA Newsroom', type: 'RSS' },
    { name: 'Reinsurance News', type: 'Website' },
    { name: 'Artemis', type: 'RSS' },
    { name: 'The Insurer', type: 'Website' },
    { name: 'Lloyd\'s List', type: 'RSS' },
    { name: 'NAIC', type: 'RSS' },
    { name: 'Insurance Business UK', type: 'RSS' },
    { name: 'Post Magazine', type: 'RSS' },
    { name: 'PropertyCasualty360', type: 'Website' },
  ];

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mins = now.getMinutes();
      const secs = now.getSeconds();
      // Next cron fires at :00 or :30
      const nextFireMin = mins < 30 ? 30 : 60;
      const secsRemaining = (nextFireMin - mins) * 60 - secs;

      if (secsRemaining <= 0 || secsRemaining > 1800) {
        // We're at the scan moment
        setIsScanning(true);
        setScanCountdown(0);
      } else if (secsRemaining <= 90) {
        // Just finished scanning, still in "scanning" window
        setIsScanning(true);
        setScanCountdown(secsRemaining);
      } else {
        setIsScanning(false);
        setScanCountdown(secsRemaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through scan sources during scanning
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setScanSourceIndex(i => (i + 1) % SCAN_SOURCES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isScanning]);

  const countdownDisplay = scanCountdown > 0
    ? `${Math.floor(scanCountdown / 60)}m ${scanCountdown % 60}s`
    : 'now';

  // Derive last scan time and next scan time
  const lastScanTime = state.fetchedAt ? formatTime(state.fetchedAt) : '--:--';
  const nextScanDate = state.fetchedAt ? new Date(state.fetchedAt.getTime() + 30 * 60 * 1000) : null;
  const nextScanTime = nextScanDate ? formatTime(nextScanDate) : '--:--';

  return (
    <>
      <style jsx global>{`
        @keyframes feedSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes headerFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        @keyframes statusRing {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(3); }
        }
        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes scanLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
      `}</style>

      <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">

        {/* ── Top Bar ── */}
        <div
          className={`mb-8 transition-all duration-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ animation: mounted ? 'headerFade 0.6s ease-out both' : 'none' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[var(--text-primary)]">
                Workspace
              </h1>
              {!state.loading && state.hasNarrative && (
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                    {isScanning ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-emerald-400 font-medium">Scanning sources…</span>
                        </span>
                        <span className="text-[var(--text-muted)]">&middot;</span>
                        <span className="text-[var(--text-muted)] text-xs transition-all">{SCAN_SOURCES[scanSourceIndex].name} ({SCAN_SOURCES[scanSourceIndex].type})</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                          </span>
                          <span className="text-[var(--text-muted)]">Next scan in <span className="text-[var(--text-primary)] font-semibold tabular-nums">{countdownDisplay}</span></span>
                        </span>
                      </>
                    )}
                    <span className="text-[var(--text-muted)]">&middot;</span>
                    <span>Monitoring <span className="text-[var(--text-primary)] font-semibold tabular-nums">{state.sourceCount || 62}</span> sources</span>
                    <span className="text-[var(--text-muted)]">&middot;</span>
                    <span><span className="text-[var(--accent)] font-semibold tabular-nums">{state.surfacedToday}</span> high-quality signals today</span>
                    <span className="text-[var(--text-muted)]">&middot;</span>
                    <span><span className="text-[var(--text-muted)] font-semibold tabular-nums">{state.filteredOutToday}</span> filtered out</span>
                  </p>
                </div>
              )}
            </div>

            {/* Refresh button removed — system is autonomous */}
          </div>
        </div>

        {/* ── No Narrative State ── */}
        {noNarrative && (
          <div className={`mb-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-[var(--accent)]" />
                </div>
              </div>
              <h2 className="text-xl font-bold font-heading text-[var(--text-primary)] mb-2">
                Define your Narrative to activate your AI team
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                Your three agents -- Market Analyst, Strategy Partner, and Content Producer -- will start scanning, analysing, and drafting automatically once your narrative is set.
              </p>
              <Link
                href="/narrative"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 text-white text-sm font-semibold shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 transition-all hover:scale-[1.02]"
              >
                Define your Narrative
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Narrative exists but no signals yet ── */}
        {hasNarrativeNoSignals && (
          <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-6 py-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                <Radar className="w-5 h-5 text-[var(--accent)] animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] font-heading">
                  Your Market Analyst is scanning {state.sourceCount || 62} sources
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  First results in ~2 minutes. This page updates automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content (when narrative + data exist) ── */}
        {!noNarrative && !state.loading && (
          <>
            {/* Agent Status Cards (3 cols) */}
            <div
              className="grid gap-4 mb-8"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
            >
              <DetailedAgentCard
                name="Market Analyst"
                icon={Radar}
                color="#22d3ee"
                agent={state.marketAgent}
                mounted={mounted}
                delay="150ms"
                forceActive={isScanning}
                scanLabel={isScanning
                  ? `Scanning ${SCAN_SOURCES[scanSourceIndex].name} (${SCAN_SOURCES[scanSourceIndex].type})`
                  : `Preparing for next scan · ${countdownDisplay}`}
              />
              <DetailedAgentCard
                name="Strategy Partner"
                icon={Lightbulb}
                color="#fbbf24"
                agent={state.strategyAgent}
                mounted={mounted}
                delay="250ms"
              />
              <DetailedAgentCard
                name="Content Producer"
                icon={PenTool}
                color="#a78bfa"
                agent={state.contentAgent}
                mounted={mounted}
                delay="350ms"
              />
            </div>

            {/* Pipeline Activity */}
            <PipelineActivity handoffs={state.handoffs} mounted={mounted} />

            {/* Opportunity Cards */}
            {state.opportunities.length > 0 && (
              <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '450ms' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] font-heading">
                      Opportunities
                    </h2>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {state.opportunities.length} active &middot; {state.highUrgencyCount} high urgency
                    </span>
                  </div>
                  <Link
                    href="/opportunities"
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {state.opportunities.slice(0, 8).map((opp, idx) => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
                      drafts={state.drafts}
                      mounted={mounted}
                      delay={`${500 + idx * 80}ms`}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>

                {state.opportunities.length > 8 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/opportunities"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    >
                      See {state.opportunities.length - 8} more opportunities
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* No opportunities yet but signals exist */}
            {state.opportunities.length === 0 && state.signalCount > 0 && (
              <div className={`rounded-xl border border-[var(--border)] bg-[var(--navy-light)] px-6 py-8 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '450ms' }}>
                <Lightbulb className="w-8 h-8 text-[#fbbf24] mx-auto mb-3 opacity-50" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] font-heading mb-1">
                  Strategy Partner is evaluating signals
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {state.signalCount} signals found. Opportunities will appear here once the analysis completes.
                </p>
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {state.loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">Loading workspace...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
