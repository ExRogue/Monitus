'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radar, Lightbulb, PenTool,
  ArrowRight, Clock, Sparkles, Zap, AlertCircle, RefreshCw,
  Activity, ChevronRight,
} from 'lucide-react';

/* ─── Dashboard data types ─── */
interface DashboardData {
  hasNarrative: boolean;
  signalCount: number;
  signalsToday: number;
  opportunityCount: number;
  highUrgencyCount: number;
  opportunitiesToday: number;
  recentOpportunityTitle: string | null;
  draftCount: number;
  contentThisMonth: number;
  recentDraftTitle: string | null;
  themeCount: number;
  topThemeName: string | null;
  topThemeTrending: boolean;
  linkedinPostsThisWeek: number;
  linkedinWeeklyLimit: number;
  userPlanId: string | null;
  weeklyReportReady: boolean;
  weeklyReportDate: string | null;
  loading: boolean;
  fetchedAt: Date | null;
  recentEvents: ActivityEvent[];
  /* Extended data for pipeline feed */
  pipelineHandoffs: PipelineHandoff[];
  /* Per-agent recent activity */
  marketRecentActivity: AgentActivity[];
  strategyRecentActivity: AgentActivity[];
  contentRecentActivity: AgentActivity[];
  publishedCount: number;
  dismissedCount: number;
  sourceCount: number;
}

interface ActivityEvent {
  id: string;
  agent: string;
  color: string;
  message: string;
  time: string;
  timestamp: number;
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

interface AgentActivity {
  id: string;
  message: string;
  time: string;
  timestamp: number;
  link?: string;
}

const initialData: DashboardData = {
  hasNarrative: false,
  signalCount: 0,
  signalsToday: 0,
  opportunityCount: 0,
  highUrgencyCount: 0,
  opportunitiesToday: 0,
  recentOpportunityTitle: null,
  draftCount: 0,
  contentThisMonth: 0,
  recentDraftTitle: null,
  themeCount: 0,
  topThemeName: null,
  topThemeTrending: false,
  linkedinPostsThisWeek: 0,
  linkedinWeeklyLimit: 0,
  userPlanId: null,
  weeklyReportReady: false,
  weeklyReportDate: null,
  loading: true,
  fetchedAt: null,
  recentEvents: [],
  pipelineHandoffs: [],
  marketRecentActivity: [],
  strategyRecentActivity: [],
  contentRecentActivity: [],
  publishedCount: 0,
  dismissedCount: 0,
  sourceCount: 0,
};

/* ─── Helpers ─── */
function timeAgo(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
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

/* ─── Animated count-up hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

/* ─── Live clock hook ─── */
function useLiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/* ─── Cycling status with fade ─── */
function CyclingStatus({ messages, colorClass }: { messages: string[]; colorClass: string }) {
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIndex(i => (i + 1) % messages.length);
        setOpacity(1);
      }, 300);
    }, 5000);
    return () => clearInterval(timer);
  }, [messages.length]);
  return (
    <span className={`text-xs font-medium transition-opacity duration-300 ${colorClass}`} style={{ opacity }}>
      {messages[index] || ''}
    </span>
  );
}

/* ─── Status message builders ─── */
function getMarketAnalystStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Set up your Narrative first to start scanning'];
  const msgs: string[] = [];
  if (data.signalsToday > 0) msgs.push(`Found ${data.signalsToday} signal${data.signalsToday === 1 ? '' : 's'} matching your narrative today`);
  msgs.push('Scanning Insurance Times, FCA, Artemis, Lloyd\'s...');
  if (data.signalCount > 0) {
    const hoursAgo = data.fetchedAt ? Math.floor((Date.now() - data.fetchedAt.getTime()) / 3600000) : 0;
    msgs.push(`${data.signalCount} signals total \u00b7 Last scan: ${hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`}`);
  }
  if (data.themeCount > 0 && data.topThemeName) {
    msgs.push(`Tracking ${data.themeCount} theme${data.themeCount === 1 ? '' : 's'} \u00b7 "${data.topThemeName}"${data.topThemeTrending ? ' trending \u2191' : ''}`);
  }
  return msgs.length > 0 ? msgs : ['Scanning sources...'];
}

function getStrategyPartnerStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Complete your Narrative to identify opportunities'];
  const msgs: string[] = [];
  if (data.opportunitiesToday > 0) msgs.push(`Identified ${data.opportunitiesToday} new content angle${data.opportunitiesToday === 1 ? '' : 's'} today`);
  if (data.recentOpportunityTitle) msgs.push(`Latest: "${data.recentOpportunityTitle}"`);
  if (data.highUrgencyCount > 0) msgs.push(`${data.highUrgencyCount} high-urgency opportunit${data.highUrgencyCount === 1 ? 'y' : 'ies'} waiting`);
  if (data.weeklyReportReady) msgs.push('Weekly brief ready for review');
  else {
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    msgs.push(`Next brief: Monday 7am (${daysUntilMonday === 1 ? 'tomorrow' : `in ${daysUntilMonday} days`})`);
  }
  msgs.push('Evaluating signal relevance...');
  return msgs;
}

function getContentProducerStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Complete your Narrative to generate content'];
  const msgs: string[] = [];
  if (data.recentDraftTitle) msgs.push(`Draft ready: "${data.recentDraftTitle}"`);
  if (data.draftCount > 0) msgs.push(`${data.draftCount} draft${data.draftCount === 1 ? '' : 's'} ready for review`);
  msgs.push(`Ready to draft \u00b7 ${data.contentThisMonth} piece${data.contentThisMonth === 1 ? '' : 's'} this month`);
  return msgs;
}

/* ─── Agent status logic ─── */
type AgentStatus = 'SCANNING' | 'ANALYSING' | 'READY' | 'DRAFTING' | 'IDLE';

function getMarketStatus(data: DashboardData): AgentStatus {
  if (data.signalsToday > 0) return 'SCANNING';
  return 'IDLE';
}

function getStrategyStatus(data: DashboardData): AgentStatus {
  if (data.opportunitiesToday > 0) return 'ANALYSING';
  if (data.weeklyReportReady) return 'READY';
  return 'IDLE';
}

function getContentStatus(data: DashboardData): AgentStatus {
  if (data.draftCount > 0) return 'DRAFTING';
  return 'IDLE';
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  SCANNING: '#22d3ee',
  ANALYSING: '#fbbf24',
  READY: '#34d399',
  DRAFTING: '#a78bfa',
  IDLE: '#6b7280',
};

const STATUS_BG: Record<AgentStatus, string> = {
  SCANNING: 'rgba(34,211,238,0.15)',
  ANALYSING: 'rgba(251,191,36,0.15)',
  READY: 'rgba(52,211,153,0.15)',
  DRAFTING: 'rgba(167,139,250,0.15)',
  IDLE: 'rgba(107,114,128,0.15)',
};

/* ─── Pipeline stage derivation ─── */
type PipelineStage = 'MONITOR' | 'ANALYSE' | 'DRAFT' | 'REVIEW' | 'READY';

function getCurrentPipelineStage(data: DashboardData): PipelineStage {
  if (data.publishedCount > 0) return 'READY';
  if (data.draftCount > 0) return 'REVIEW';
  if (data.opportunityCount > 0 && data.draftCount === 0) return 'DRAFT';
  if (data.signalCount > 0 && data.opportunityCount === 0) return 'ANALYSE';
  return 'MONITOR';
}

/* ─── Data fetching hook ─── */
function useDashboardData() {
  const [data, setData] = useState<DashboardData>(initialData);

  const fetchAll = useCallback(async () => {
    const results: DashboardData = { ...initialData, loading: false, fetchedAt: new Date(), recentEvents: [], pipelineHandoffs: [], marketRecentActivity: [], strategyRecentActivity: [], contentRecentActivity: [] };
    const events: ActivityEvent[] = [];
    const handoffs: PipelineHandoff[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [narrativeRes, contentRes, newsRes, oppsRes, themesRes, authRes, weeklyRes] = await Promise.allSettled([
      fetch('/api/messaging-bible').then(r => r.json()),
      fetch('/api/generate?limit=100').then(r => r.json()),
      fetch('/api/news?limit=100').then(r => r.json()),
      fetch('/api/opportunities').then(r => r.json()),
      fetch('/api/themes').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/reports/weekly').then(r => r.json()),
    ]);

    // Narrative
    if (narrativeRes.status === 'fulfilled') {
      results.hasNarrative = !!(narrativeRes.value.bible);
    }

    // Content / drafts
    if (contentRes.status === 'fulfilled') {
      const d = contentRes.value;
      const content = Array.isArray(d.content) ? d.content : [];
      const drafts = content.filter((c: any) => c.status === 'draft');
      const published = content.filter((c: any) => c.status === 'published');
      results.draftCount = drafts.length;
      results.publishedCount = published.length;
      if (drafts.length > 0) {
        const sorted = [...drafts].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const title = sorted[0].title || sorted[0].topic || null;
        results.recentDraftTitle = title && title.length > 50 ? title.slice(0, 47) + '...' : title;
      }
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      results.contentThisMonth = content.filter((c: any) => new Date(c.created_at) >= monthStart).length;
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      weekStart.setHours(0, 0, 0, 0);
      results.linkedinPostsThisWeek = content.filter((c: any) => {
        const isLinkedIn = (c.format || c.content_type || '').toLowerCase().includes('linkedin');
        return isLinkedIn && new Date(c.created_at) >= weekStart;
      }).length;

      // Activity events + handoffs from content
      const recentContent = [...content].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
      const contentActivity: AgentActivity[] = [];
      for (const c of recentContent) {
        const title = c.title || c.topic || 'content piece';
        const shortTitle = truncate(title, 40);
        events.push({
          id: `content-${c.id}`,
          agent: 'Content Producer',
          color: '#a78bfa',
          message: c.status === 'draft' ? `Drafted "${shortTitle}"` : `Published "${shortTitle}"`,
          time: timeAgo(c.created_at),
          timestamp: new Date(c.created_at).getTime(),
        });
        handoffs.push({
          id: `handoff-content-${c.id}`,
          time: formatTime(c.created_at),
          timestamp: new Date(c.created_at).getTime(),
          from: 'Strategy',
          to: 'Content',
          description: shortTitle,
          stage: c.status === 'published' ? 'READY' : 'DRAFT',
          link: '/content',
        });
        contentActivity.push({
          id: `ca-${c.id}`,
          message: c.status === 'draft' ? `Drafted: ${shortTitle}` : `Published: ${shortTitle}`,
          time: timeAgo(c.created_at),
          timestamp: new Date(c.created_at).getTime(),
          link: '/content',
        });
      }
      results.contentRecentActivity = contentActivity.slice(0, 4);
    }

    // News / signals
    if (newsRes.status === 'fulfilled') {
      const d = newsRes.value;
      const articles = Array.isArray(d.articles) ? d.articles : [];
      results.signalCount = articles.length;
      results.signalsToday = articles.filter((a: any) => new Date(a.analyzed_at || a.created_at || a.published_at) >= todayStart).length;
      // Count unique sources
      const sources = new Set(articles.map((a: any) => a.source).filter(Boolean));
      results.sourceCount = sources.size || 0;

      const recentSignals = [...articles]
        .sort((a: any, b: any) => new Date(b.analyzed_at || b.created_at || b.published_at).getTime() - new Date(a.analyzed_at || a.created_at || a.published_at).getTime())
        .slice(0, 4);
      const marketActivity: AgentActivity[] = [];
      for (const s of recentSignals) {
        const title = s.title || 'article';
        const shortTitle = truncate(title, 40);
        const ts = s.analyzed_at || s.created_at || s.published_at;
        events.push({
          id: `signal-${s.id}`,
          agent: 'Market Analyst',
          color: '#22d3ee',
          message: `Analyzed "${shortTitle}" from ${s.source || 'news feed'}`,
          time: timeAgo(ts),
          timestamp: new Date(ts).getTime(),
        });
        handoffs.push({
          id: `handoff-signal-${s.id}`,
          time: formatTime(ts),
          timestamp: new Date(ts).getTime(),
          from: 'Market',
          to: 'Strategy',
          description: shortTitle,
          stage: 'ANALYSE',
          link: '/signals',
        });
        marketActivity.push({
          id: `ma-${s.id}`,
          message: `Analyzed: ${shortTitle}`,
          time: timeAgo(ts),
          timestamp: new Date(ts).getTime(),
          link: '/signals',
        });
      }
      results.marketRecentActivity = marketActivity.slice(0, 4);
    }

    // Opportunities
    if (oppsRes.status === 'fulfilled') {
      const d = oppsRes.value;
      const opps = Array.isArray(d.opportunities) ? d.opportunities : [];
      results.opportunityCount = opps.length;
      results.highUrgencyCount = opps.filter((o: any) => (o.opportunity_score ?? o.score ?? 0) >= 75).length;
      results.dismissedCount = opps.filter((o: any) => o.status === 'dismissed').length;
      results.opportunitiesToday = opps.filter((o: any) => new Date(o.created_at) >= todayStart).length;
      if (opps.length > 0) {
        const title = opps[0].title || opps[0].angle || null;
        results.recentOpportunityTitle = title && title.length > 50 ? title.slice(0, 47) + '...' : title;
      }

      const recentOpps = [...opps].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
      const strategyActivity: AgentActivity[] = [];
      for (const o of recentOpps) {
        const title = o.title || o.angle || 'opportunity';
        const shortTitle = truncate(title, 40);
        events.push({
          id: `opp-${o.id}`,
          agent: 'Strategy Partner',
          color: '#fbbf24',
          message: `Identified opportunity: "${shortTitle}"`,
          time: timeAgo(o.created_at),
          timestamp: new Date(o.created_at).getTime(),
        });
        handoffs.push({
          id: `handoff-opp-${o.id}`,
          time: formatTime(o.created_at),
          timestamp: new Date(o.created_at).getTime(),
          from: 'Market',
          to: 'Strategy',
          description: shortTitle,
          stage: 'ANALYSE',
          link: '/opportunities',
        });
        strategyActivity.push({
          id: `sa-${o.id}`,
          message: `Opportunity: ${shortTitle}`,
          time: timeAgo(o.created_at),
          timestamp: new Date(o.created_at).getTime(),
          link: '/opportunities',
        });
      }
      results.strategyRecentActivity = strategyActivity.slice(0, 4);
    }

    // Themes
    if (themesRes.status === 'fulfilled') {
      const d = themesRes.value;
      const themes = Array.isArray(d.themes) ? d.themes : [];
      results.themeCount = themes.length;
      if (themes.length > 0) {
        results.topThemeName = themes[0].name || themes[0].theme || null;
        results.topThemeTrending = (themes[0].score ?? 0) > (themes[1]?.score ?? 0);
      }
      if (themes.length > 0) {
        const topTheme = themes[0];
        events.push({
          id: `theme-top`,
          agent: 'Market Analyst',
          color: '#22d3ee',
          message: `Tracking "${topTheme.name || topTheme.theme}" as top theme${results.topThemeTrending ? ' (trending)' : ''}`,
          time: timeAgo(topTheme.updated_at || topTheme.created_at || new Date()),
          timestamp: new Date(topTheme.updated_at || topTheme.created_at || Date.now()).getTime(),
        });
      }
    }

    // User plan
    if (authRes.status === 'fulfilled') {
      const d = authRes.value;
      const planId = d.plan?.plan_id || 'plan-trial';
      results.userPlanId = planId;
      if (planId === 'plan-starter') results.linkedinWeeklyLimit = 3;
      else if (planId === 'plan-professional' || planId === 'plan-enterprise') results.linkedinWeeklyLimit = 10;
      else results.linkedinWeeklyLimit = 0;
    }

    // Weekly report
    if (weeklyRes.status === 'fulfilled') {
      const d = weeklyRes.value;
      if (d.report) {
        results.weeklyReportReady = true;
        results.weeklyReportDate = d.report.created_at || null;
        events.push({
          id: `weekly-brief`,
          agent: 'Strategy Partner',
          color: '#fbbf24',
          message: 'Weekly Priority View is ready for review',
          time: timeAgo(d.report.created_at || new Date()),
          timestamp: new Date(d.report.created_at || Date.now()).getTime(),
        });
        handoffs.push({
          id: `handoff-weekly`,
          time: formatTime(d.report.created_at || new Date()),
          timestamp: new Date(d.report.created_at || Date.now()).getTime(),
          from: 'Strategy',
          to: 'Content',
          description: 'Weekly priority content mix',
          stage: 'DRAFT',
          link: '/briefing',
        });
      }
    }

    events.sort((a, b) => b.timestamp - a.timestamp);
    results.recentEvents = events.slice(0, 8);
    handoffs.sort((a, b) => b.timestamp - a.timestamp);
    results.pipelineHandoffs = handoffs.slice(0, 8);

    setData(results);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  return { data, refresh: fetchAll };
}

/* ─── Pipeline Flow Diagram ─── */
function PipelineFlow({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const router = useRouter();
  const marketStatus = getMarketStatus(data);
  const strategyStatus = getStrategyStatus(data);
  const contentStatus = getContentStatus(data);

  const agents = [
    { name: 'Market Analyst', status: marketStatus, icon: Radar, color: '#22d3ee', href: '/market-analyst' },
    { name: 'Strategy Partner', status: strategyStatus, icon: Lightbulb, color: '#fbbf24', href: '/strategy' },
    { name: 'Content Producer', status: contentStatus, icon: PenTool, color: '#a78bfa', href: '/content' },
  ];

  const flowLabels = ['SIGNALS', 'DIRECTION'];

  return (
    <div
      className={`relative mb-8 rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 md:p-10 overflow-hidden transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: '150ms' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.04), transparent 70%)' }} />

      <div className="relative flex items-center justify-center gap-0">
        {agents.map((agent, i) => (
          <div key={agent.name} className="flex items-center">
            {/* Agent node */}
            <button
              onClick={() => router.push(agent.href)}
              className="flex flex-col items-center gap-3 group cursor-pointer"
              style={{ minWidth: '120px' }}
            >
              {/* Status badge */}
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                style={{ color: STATUS_COLORS[agent.status], background: STATUS_BG[agent.status] }}
              >
                {agent.status}
              </span>

              {/* Circle node */}
              <div
                className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `radial-gradient(circle, ${agent.color}15, transparent 70%)`,
                  border: `2px solid ${agent.color}40`,
                  boxShadow: agent.status !== 'IDLE' ? `0 0 24px ${agent.color}20, inset 0 0 20px ${agent.color}08` : 'none',
                }}
              >
                {/* Animated ring for active agents */}
                {agent.status !== 'IDLE' && (
                  <div
                    className="absolute inset-[-3px] rounded-full animate-spin"
                    style={{
                      border: `2px dashed ${agent.color}30`,
                      animationDuration: '12s',
                    }}
                  />
                )}
                <agent.icon className="w-8 h-8 md:w-10 md:h-10" style={{ color: agent.color }} />
              </div>

              {/* Agent name */}
              <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors text-center leading-tight">
                {agent.name}
              </span>
            </button>

            {/* Connector arrow */}
            {i < agents.length - 1 && (
              <div className="flex flex-col items-center mx-2 md:mx-6 gap-1" style={{ minWidth: '60px' }}>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  {flowLabels[i]}
                </span>
                <div className="flex items-center gap-0">
                  <div className="w-8 md:w-16 h-[1px]" style={{ background: `linear-gradient(to right, ${agents[i].color}50, ${agents[i + 1].color}50)`, borderTop: '1px dashed' }} />
                  <ChevronRight className="w-3.5 h-3.5 -ml-1" style={{ color: `${agents[i + 1].color}70` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Pipeline Stage Progress Bar ─── */
function PipelineProgress({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const currentStage = getCurrentPipelineStage(data);
  const stages: PipelineStage[] = ['MONITOR', 'ANALYSE', 'DRAFT', 'REVIEW', 'READY'];
  const currentIdx = stages.indexOf(currentStage);

  return (
    <div
      className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: '250ms' }}
    >
      <div className="flex items-center justify-center gap-0">
        {stages.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={stage} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                {/* Dot */}
                <div className="relative">
                  {isCurrent && (
                    <div className="absolute inset-[-4px] rounded-full bg-[var(--accent)] opacity-20 animate-ping" />
                  )}
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-[var(--accent)]' :
                      isCurrent ? 'bg-[var(--accent)] ring-2 ring-[var(--accent)]/30 ring-offset-1 ring-offset-[var(--navy)]' :
                      'bg-[var(--border)] border border-[var(--text-muted)]/30'
                    }`}
                  />
                </div>
                {/* Label */}
                <span className={`text-[9px] font-bold uppercase tracking-widest ${
                  isCurrent ? 'text-[var(--accent)]' : isCompleted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                }`}>
                  {stage}
                </span>
              </div>

              {/* Connector line */}
              {i < stages.length - 1 && (
                <div
                  className="w-10 md:w-20 h-[1px] mx-1 md:mx-2"
                  style={{
                    background: i < currentIdx
                      ? 'var(--accent)'
                      : 'var(--border)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Pipeline Activity Feed ─── */
function PipelineActivityFeed({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const handoffs = data.pipelineHandoffs;

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
          <h2 className="text-sm font-semibold text-[var(--text-primary)] font-heading">
            Pipeline Activity
          </h2>
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
            {/* Time */}
            <span className="text-[11px] tabular-nums text-[var(--text-muted)] w-10 flex-shrink-0 font-mono">
              {h.time}
            </span>

            {/* From -> To */}
            <span className="text-xs flex-shrink-0 flex items-center gap-1">
              <span className="font-semibold" style={{ color: agentColors[h.from] }}>{h.from}</span>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="font-semibold" style={{ color: agentColors[h.to] }}>{h.to}</span>
            </span>

            {/* Description */}
            <span className="text-xs text-[var(--text-secondary)] flex-1 min-w-0 truncate">
              {h.description}
            </span>

            {/* Stage badge */}
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

/* ─── Agent Status Card ─── */
function AgentCard({
  name, href, icon: Icon, color, status, statusMessages, stats, recentActivity, mounted, delay,
}: {
  name: string;
  href: string;
  icon: any;
  color: string;
  status: AgentStatus;
  statusMessages: string[];
  stats: { label: string; value: string | number }[];
  recentActivity: AgentActivity[];
  mounted: boolean;
  delay: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 flex flex-col transition-all duration-500 hover:border-opacity-80 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{
        transitionDelay: delay,
        '--card-color': color,
      } as React.CSSProperties}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 40px ${color}08, 0 0 20px ${color}08` }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2.5 mb-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: STATUS_COLORS[status], boxShadow: status !== 'IDLE' ? `0 0 8px ${STATUS_COLORS[status]}` : 'none' }}
        />
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">{name}</h3>
        </div>
        <span
          className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: STATUS_COLORS[status], background: STATUS_BG[status] }}
        >
          {status}
        </span>
      </div>

      {/* Status description */}
      <div className="relative mb-4 px-2.5 py-1.5 rounded-md border" style={{ background: `${color}06`, borderColor: `${color}15`, color }}>
        <CyclingStatus messages={statusMessages} colorClass="" />
      </div>

      {/* Stats row */}
      <div className="relative flex items-center gap-3 mb-4">
        {stats.map((s, i) => (
          <span key={s.label} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--text-muted)]">&middot;</span>}
            <span className="text-sm font-bold text-[var(--text-primary)] font-heading tabular-nums">{s.value}</span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{s.label}</span>
          </span>
        ))}
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div className="relative border-t border-[var(--border)]/50 pt-3 mt-auto space-y-2">
          {recentActivity.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: `${color}60` }} />
              <span className="text-[11px] text-[var(--text-secondary)] leading-tight flex-1 min-w-0 truncate">
                {a.message}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 tabular-nums">{a.time}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

/* ─── Lifetime Stats Banner ─── */
function LifetimeStatsBanner({ data, mounted }: { data: DashboardData; mounted: boolean }) {
  const signals = useCountUp(data.signalCount);
  const opps = useCountUp(data.opportunityCount);
  const drafts = useCountUp(data.draftCount + data.contentThisMonth);
  return (
    <div
      className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: '50ms' }}
    >
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-1">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]/60" />
        <span>
          Since you joined:{' '}
          <span className="text-[var(--text-primary)] font-semibold tabular-nums">{signals}</span> articles analysed
          {' '}&middot;{' '}
          <span className="text-[var(--text-primary)] font-semibold tabular-nums">{opps}</span> opportunities found
          {' '}&middot;{' '}
          <span className="text-[var(--text-primary)] font-semibold tabular-nums">{drafts}</span> drafts created
        </span>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { data: dashData, refresh } = useDashboardData();
  const noNarrative = !dashData.loading && !dashData.hasNarrative;
  const clock = useLiveClock();
  const [spinning, setSpinning] = useState(false);

  // Count active agents
  const activeCount = [
    getMarketStatus(dashData) !== 'IDLE',
    getStrategyStatus(dashData) !== 'IDLE',
    getContentStatus(dashData) !== 'IDLE',
  ].filter(Boolean).length;

  const handleRefresh = async () => {
    setSpinning(true);
    await refresh();
    setTimeout(() => setSpinning(false), 600);
  };

  useEffect(() => { setMounted(true); }, []);

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
      `}</style>

      <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">

        {/* ── 1. Top Bar ── */}
        <div className={`mb-8 flex items-start justify-between transition-all duration-600 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ animation: mounted ? 'headerFade 0.6s ease-out both' : 'none' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/50 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[var(--text-primary)]">
                Workspace
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                3-agent intelligence pipeline
              </p>
            </div>
          </div>

          {/* Right: active agents + clock + refresh */}
          {!noNarrative && !dashData.loading && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--navy-light)] border border-[var(--border)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[var(--text-secondary)]">
                  <span className="font-semibold text-emerald-400">{activeCount} agent{activeCount !== 1 ? 's' : ''} active</span>
                  <span className="text-[var(--text-muted)] mx-1.5">&middot;</span>
                  <span className="tabular-nums font-mono text-[var(--text-muted)]">{clock}</span>
                </span>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-[var(--navy-lighter)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent hover:border-[var(--border)]"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* ── Narrative gate ── */}
        {noNarrative && (
          <div className={`mb-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-[var(--accent)]" />
                </div>
              </div>
              <h2 className="text-xl font-bold font-heading text-[var(--text-primary)] mb-2">
                Your AI team is ready
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                Define your Narrative to activate the pipeline. Your three agents will start scanning, analysing, and drafting automatically.
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

        {/* ── Content only shown when narrative exists ── */}
        {!noNarrative && !dashData.loading && (
          <>
            {/* Lifetime Stats Banner */}
            <LifetimeStatsBanner data={dashData} mounted={mounted} />

            {/* 2. Pipeline Flow Diagram */}
            <PipelineFlow data={dashData} mounted={mounted} />

            {/* 3. Pipeline Stage Progress */}
            <PipelineProgress data={dashData} mounted={mounted} />

            {/* 4. Pipeline Activity Feed */}
            <PipelineActivityFeed data={dashData} mounted={mounted} />

            {/* 5. Agent Status Cards */}
            <div
              className="grid gap-4 mb-10"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
            >
              <AgentCard
                name="Market Analyst"
                href="/market-analyst"
                icon={Radar}
                color="#22d3ee"
                status={getMarketStatus(dashData)}
                statusMessages={getMarketAnalystStatuses(dashData)}
                stats={[
                  { label: 'signals', value: dashData.signalCount },
                  { label: 'themes', value: dashData.themeCount },
                  { label: 'sources', value: dashData.sourceCount },
                ]}
                recentActivity={dashData.marketRecentActivity}
                mounted={mounted}
                delay="450ms"
              />
              <AgentCard
                name="Strategy Partner"
                href="/strategy"
                icon={Lightbulb}
                color="#fbbf24"
                status={getStrategyStatus(dashData)}
                statusMessages={getStrategyPartnerStatuses(dashData)}
                stats={[
                  { label: 'opportunities', value: dashData.opportunityCount },
                  { label: 'high urgency', value: dashData.highUrgencyCount },
                  { label: 'dismissed', value: dashData.dismissedCount },
                ]}
                recentActivity={dashData.strategyRecentActivity}
                mounted={mounted}
                delay="550ms"
              />
              <AgentCard
                name="Content Producer"
                href="/content"
                icon={PenTool}
                color="#a78bfa"
                status={getContentStatus(dashData)}
                statusMessages={getContentProducerStatuses(dashData)}
                stats={[
                  { label: 'drafts', value: dashData.draftCount },
                  { label: 'published', value: dashData.publishedCount },
                  { label: 'this month', value: dashData.contentThisMonth },
                ]}
                recentActivity={dashData.contentRecentActivity}
                mounted={mounted}
                delay="650ms"
              />
            </div>
          </>
        )}

        {/* Loading state */}
        {dashData.loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">Loading pipeline status...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
