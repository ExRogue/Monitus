'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radar, Lightbulb, PenTool, FileText, TrendingUp,
  ArrowRight, Clock, Sparkles, Zap, AlertCircle, RefreshCw,
} from 'lucide-react';
import PixelOffice from '@/components/PixelOffice';

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
  /* For activity feed — real timestamped events */
  recentEvents: ActivityEvent[];
}

interface ActivityEvent {
  id: string;
  agent: string;
  color: string;
  message: string;
  time: string;
  timestamp: number; // epoch ms for sorting
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
};

/* ─── Relative time helper ─── */
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

/* ─── Data fetching hook ─── */
function useDashboardData() {
  const [data, setData] = useState<DashboardData>(initialData);

  const fetchAll = useCallback(async () => {
    const results = { ...initialData, loading: false, fetchedAt: new Date(), recentEvents: [] as ActivityEvent[] };
    const events: ActivityEvent[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch all APIs in parallel, each wrapped in try/catch
    const [narrativeRes, contentRes, newsRes, oppsRes, themesRes, authRes, weeklyRes] = await Promise.allSettled([
      fetch('/api/messaging-bible').then(r => r.json()),
      fetch('/api/generate?limit=100').then(r => r.json()),
      fetch('/api/news?limit=100').then(r => r.json()),
      fetch('/api/opportunities').then(r => r.json()),
      fetch('/api/themes').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/reports/weekly').then(r => r.json()),
    ]);

    // Narrative check
    if (narrativeRes.status === 'fulfilled') {
      const d = narrativeRes.value;
      results.hasNarrative = !!(d.bible);
    }

    // Content / drafts
    if (contentRes.status === 'fulfilled') {
      const d = contentRes.value;
      const content = Array.isArray(d.content) ? d.content : [];
      const drafts = content.filter((c: any) => c.status === 'draft');
      results.draftCount = drafts.length;
      // Most recent draft title
      if (drafts.length > 0) {
        const sorted = [...drafts].sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const title = sorted[0].title || sorted[0].topic || null;
        results.recentDraftTitle = title && title.length > 50 ? title.slice(0, 47) + '...' : title;
      }
      // Count content created this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      results.contentThisMonth = content.filter((c: any) => {
        const created = new Date(c.created_at);
        return created >= monthStart;
      }).length;

      // LinkedIn posts this week
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      weekStart.setHours(0, 0, 0, 0);
      results.linkedinPostsThisWeek = content.filter((c: any) => {
        const isLinkedIn = (c.format || c.content_type || '').toLowerCase().includes('linkedin');
        const created = new Date(c.created_at);
        return isLinkedIn && created >= weekStart;
      }).length;

      // Activity events from content
      const recentContent = [...content]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      for (const c of recentContent) {
        const title = c.title || c.topic || 'content piece';
        const shortTitle = title.length > 40 ? title.slice(0, 37) + '...' : title;
        events.push({
          id: `content-${c.id}`,
          agent: 'Content Writer',
          color: '#a78bfa',
          message: c.status === 'draft'
            ? `Drafted "${shortTitle}"`
            : `Published "${shortTitle}"`,
          time: timeAgo(c.created_at),
          timestamp: new Date(c.created_at).getTime(),
        });
      }
    }

    // News / signals
    if (newsRes.status === 'fulfilled') {
      const d = newsRes.value;
      const articles = Array.isArray(d.articles) ? d.articles : [];
      results.signalCount = articles.length;
      results.signalsToday = articles.filter((a: any) => {
        const created = new Date(a.analyzed_at || a.created_at || a.published_at);
        return created >= todayStart;
      }).length;

      // Activity events from signals
      const recentSignals = [...articles]
        .sort((a: any, b: any) => new Date(b.analyzed_at || b.created_at || b.published_at).getTime() - new Date(a.analyzed_at || a.created_at || a.published_at).getTime())
        .slice(0, 3);
      for (const s of recentSignals) {
        const title = s.title || 'article';
        const shortTitle = title.length > 40 ? title.slice(0, 37) + '...' : title;
        events.push({
          id: `signal-${s.id}`,
          agent: 'Market Monitor',
          color: '#22d3ee',
          message: `Analyzed "${shortTitle}" from ${s.source || 'news feed'}`,
          time: timeAgo(s.analyzed_at || s.created_at || s.published_at),
          timestamp: new Date(s.analyzed_at || s.created_at || s.published_at).getTime(),
        });
      }
    }

    // Opportunities
    if (oppsRes.status === 'fulfilled') {
      const d = oppsRes.value;
      const opps = Array.isArray(d.opportunities) ? d.opportunities : [];
      results.opportunityCount = opps.length;
      results.highUrgencyCount = opps.filter((o: any) => (o.opportunity_score ?? o.score ?? 0) >= 75).length;
      results.opportunitiesToday = opps.filter((o: any) => {
        const created = new Date(o.created_at);
        return created >= todayStart;
      }).length;
      // Most recent opportunity title
      if (opps.length > 0) {
        const title = opps[0].title || opps[0].angle || null;
        results.recentOpportunityTitle = title && title.length > 50 ? title.slice(0, 47) + '...' : title;
      }

      // Activity events from opportunities
      const recentOpps = [...opps]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      for (const o of recentOpps) {
        const title = o.title || o.angle || 'opportunity';
        const shortTitle = title.length > 40 ? title.slice(0, 37) + '...' : title;
        events.push({
          id: `opp-${o.id}`,
          agent: 'Signal Interpreter',
          color: '#fbbf24',
          message: `Identified opportunity: "${shortTitle}"`,
          time: timeAgo(o.created_at),
          timestamp: new Date(o.created_at).getTime(),
        });
      }
    }

    // Themes
    if (themesRes.status === 'fulfilled') {
      const d = themesRes.value;
      const themes = Array.isArray(d.themes) ? d.themes : [];
      results.themeCount = themes.length;
      if (themes.length > 0) {
        // Themes ordered by score DESC from API
        results.topThemeName = themes[0].name || themes[0].theme || null;
        results.topThemeTrending = (themes[0].score ?? 0) > (themes[1]?.score ?? 0);
      }

      // Activity event for themes
      if (themes.length > 0) {
        const topTheme = themes[0];
        events.push({
          id: `theme-top`,
          agent: 'Performance Analyst',
          color: '#fb7185',
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
          agent: 'Briefing Partner',
          color: '#34d399',
          message: 'Weekly Priority View is ready for review',
          time: timeAgo(d.report.created_at || new Date()),
          timestamp: new Date(d.report.created_at || Date.now()).getTime(),
        });
      }
    }

    // Sort events by most recent, take top 8
    events.sort((a, b) => b.timestamp - a.timestamp);
    results.recentEvents = events.slice(0, 8);

    setData(results);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, refresh: fetchAll };
}

/* ─── Cycling status component with fade ─── */
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
    <span
      className={`text-xs font-medium transition-opacity duration-300 ${colorClass}`}
      style={{ opacity }}
    >
      {messages[index] || ''}
    </span>
  );
}

/* ─── Build status messages for each agent ─── */
function getMarketMonitorStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Set up your Narrative first to start scanning'];
  const msgs: string[] = [];
  if (data.signalsToday > 0) {
    msgs.push(`Found ${data.signalsToday} signal${data.signalsToday === 1 ? '' : 's'} matching your narrative today`);
  }
  msgs.push('Scanning Insurance Times, FCA, Artemis, Lloyd\'s...');
  if (data.signalCount > 0) {
    const hoursAgo = data.fetchedAt ? Math.floor((Date.now() - data.fetchedAt.getTime()) / 3600000) : 0;
    msgs.push(`${data.signalCount} signals total \u00b7 Last scan: ${hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`}`);
  }
  return msgs.length > 0 ? msgs : ['Scanning sources...'];
}

function getSignalInterpreterStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Complete your Narrative to identify opportunities'];
  const msgs: string[] = [];
  if (data.opportunitiesToday > 0) {
    msgs.push(`Identified ${data.opportunitiesToday} new content angle${data.opportunitiesToday === 1 ? '' : 's'} today`);
  }
  if (data.recentOpportunityTitle) {
    msgs.push(`Latest: "${data.recentOpportunityTitle}"`);
  }
  if (data.highUrgencyCount > 0) {
    msgs.push(`${data.highUrgencyCount} high-urgency opportunit${data.highUrgencyCount === 1 ? 'y' : 'ies'} waiting`);
  }
  msgs.push('Evaluating signal relevance...');
  return msgs;
}

function getContentWriterStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Complete your Narrative to generate content'];
  const msgs: string[] = [];
  if (data.recentDraftTitle) {
    msgs.push(`Draft ready: "${data.recentDraftTitle}"`);
  }
  if (data.draftCount > 0) {
    msgs.push(`${data.draftCount} draft${data.draftCount === 1 ? '' : 's'} ready for review`);
  }
  msgs.push(`Ready to draft \u00b7 ${data.contentThisMonth} piece${data.contentThisMonth === 1 ? '' : 's'} this month`);
  return msgs;
}

function getBriefingPartnerStatuses(data: DashboardData): string[] {
  if (!data.hasNarrative) return ['Waiting for Narrative...'];
  const msgs: string[] = [];
  if (data.weeklyReportReady) {
    msgs.push('Weekly brief ready for review');
    if (data.weeklyReportDate) {
      msgs.push(`Brief generated ${timeAgo(data.weeklyReportDate)}`);
    }
  } else {
    msgs.push('Preparing this week\'s priorities...');
  }
  // Next brief hint: Monday 7am
  const now = new Date();
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  msgs.push(`Next brief: Monday 7am (${daysUntilMonday === 1 ? 'tomorrow' : `in ${daysUntilMonday} days`})`);
  return msgs;
}

function getPerformanceAnalystStatuses(data: DashboardData): string[] {
  if (data.loading) return ['Loading...'];
  if (!data.hasNarrative) return ['Waiting for Narrative...'];
  const msgs: string[] = [];
  if (data.themeCount > 0 && data.topThemeName) {
    msgs.push(`Tracking ${data.themeCount} theme${data.themeCount === 1 ? '' : 's'} \u00b7 "${data.topThemeName}"${data.topThemeTrending ? ' trending \u2191' : ''}`);
  }
  msgs.push('Monitoring content performance...');
  if (data.contentThisMonth > 0) {
    msgs.push(`Analyzing ${data.contentThisMonth} piece${data.contentThisMonth === 1 ? '' : 's'} from this month`);
  }
  return msgs;
}

/* ─── Build activity feed from real events ─── */
function buildActivityFeed(data: DashboardData): ActivityEvent[] {
  if (data.loading) {
    return [{
      id: '1',
      agent: 'System',
      color: '#818cf8',
      message: 'Loading your growth team status...',
      time: 'now',
      timestamp: Date.now(),
    }];
  }

  if (!data.hasNarrative) {
    return [{
      id: '1',
      agent: 'Growth Team',
      color: '#818cf8',
      message: 'Your agents are getting started \u2014 complete your Narrative to activate them',
      time: 'now',
      timestamp: Date.now(),
    }];
  }

  if (data.recentEvents.length > 0) {
    return data.recentEvents;
  }

  // Fallback if no real events yet
  return [
    {
      id: '1',
      agent: 'Market Monitor',
      color: '#22d3ee',
      message: 'Your Narrative is set \u2014 scanning sources for relevant signals',
      time: 'now',
      timestamp: Date.now(),
    },
    {
      id: '2',
      agent: 'Signal Interpreter',
      color: '#fbbf24',
      message: 'Standing by to analyze incoming signals',
      time: 'now',
      timestamp: Date.now(),
    },
    {
      id: '3',
      agent: 'Content Writer',
      color: '#a78bfa',
      message: 'Ready to draft content when opportunities are identified',
      time: 'now',
      timestamp: Date.now(),
    },
  ];
}

/* ─── Typing animation hook ─── */
function useTypingEffect(text: string, speed = 80, delay = 1000) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    let timeout: NodeJS.Timeout;
    let pauseTimeout: NodeJS.Timeout;

    const startTyping = () => {
      timeout = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timeout);
          // Reset after a pause
          pauseTimeout = setTimeout(() => {
            setDisplayed('');
            i = 0;
            startTyping();
          }, 3000);
        }
      }, speed);
    };

    const initial = setTimeout(startTyping, delay);

    // Blinking cursor
    const cursorInterval = setInterval(() => {
      setShowCursor((v) => !v);
    }, 530);

    return () => {
      clearTimeout(initial);
      clearTimeout(pauseTimeout);
      clearInterval(timeout);
      clearInterval(cursorInterval);
    };
  }, [text, speed, delay]);

  return { displayed, showCursor };
}

/* ─── Radar Sweep Animation ─── */
function RadarSweep() {
  return (
    <div className="radar-container">
      <div className="radar-grid">
        {/* Concentric circles */}
        <div className="radar-circle radar-circle-1" />
        <div className="radar-circle radar-circle-2" />
        <div className="radar-circle radar-circle-3" />
        {/* Cross lines */}
        <div className="radar-crosshair-h" />
        <div className="radar-crosshair-v" />
        {/* Sweep */}
        <div className="radar-sweep" />
        {/* Blips */}
        <div className="radar-blip blip-1" />
        <div className="radar-blip blip-2" />
        <div className="radar-blip blip-3" />
      </div>
    </div>
  );
}

/* ─── Lightbulb Pulse Animation ─── */
function LightbulbPulse() {
  return (
    <div className="lightbulb-container">
      <div className="lightbulb-glow" />
      <div className="lightbulb-icon">
        <Lightbulb className="w-10 h-10 text-amber-400" />
      </div>
      {/* Floating idea sparks */}
      <div className="idea-spark spark-1">!</div>
      <div className="idea-spark spark-2">?</div>
      <div className="idea-spark spark-3">+</div>
    </div>
  );
}

/* ─── Typing Animation ─── */
function TypingAnimation() {
  const { displayed, showCursor } = useTypingEffect(
    'Drafting LinkedIn post on AI governance implications for specialty carriers...',
    45,
    500
  );

  return (
    <div className="typing-container">
      <div className="typing-window">
        <div className="typing-header">
          <div className="typing-dot" style={{ background: '#D05050' }} />
          <div className="typing-dot" style={{ background: '#D4943A' }} />
          <div className="typing-dot" style={{ background: '#3AAF7C' }} />
        </div>
        <div className="typing-content">
          <span className="typing-text">{displayed}</span>
          <span className={`typing-cursor ${showCursor ? 'visible' : 'invisible'}`}>|</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Document Stack Animation ─── */
function DocumentStack() {
  return (
    <div className="doc-container">
      <div className="doc-page doc-page-3">
        <div className="doc-line doc-line-short" />
        <div className="doc-line" />
        <div className="doc-line" />
        <div className="doc-line doc-line-medium" />
      </div>
      <div className="doc-page doc-page-2">
        <div className="doc-line doc-line-short" />
        <div className="doc-line" />
        <div className="doc-line doc-line-medium" />
        <div className="doc-line" />
      </div>
      <div className="doc-page doc-page-1">
        <div className="doc-line doc-line-short" />
        <div className="doc-line" />
        <div className="doc-line" />
        <div className="doc-line doc-line-medium" />
        <div className="doc-line doc-line-short" />
      </div>
    </div>
  );
}

/* ─── Self-Drawing Chart ─── */
function DrawingChart() {
  return (
    <div className="chart-container">
      <svg viewBox="0 0 200 100" className="chart-svg" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1="25" x2="200" y2="25" className="chart-gridline" />
        <line x1="0" y1="50" x2="200" y2="50" className="chart-gridline" />
        <line x1="0" y1="75" x2="200" y2="75" className="chart-gridline" />
        {/* Area fill */}
        <path
          d="M0,85 L25,70 L50,75 L75,55 L100,60 L125,40 L150,35 L175,20 L200,15 L200,100 L0,100 Z"
          className="chart-area"
        />
        {/* Main line */}
        <path
          d="M0,85 L25,70 L50,75 L75,55 L100,60 L125,40 L150,35 L175,20 L200,15"
          className="chart-line"
          fill="none"
        />
        {/* Data points */}
        <circle cx="75" cy="55" r="3" className="chart-point chart-point-1" />
        <circle cx="125" cy="40" r="3" className="chart-point chart-point-2" />
        <circle cx="200" cy="15" r="3" className="chart-point chart-point-3" />
      </svg>
      {/* Labels */}
      <div className="chart-labels">
        <span className="chart-label">6w ago</span>
        <span className="chart-label">Now</span>
      </div>
    </div>
  );
}

/* ─── Animated Count-Up Hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
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

/* ─── Agent Active Indicator ─── */
function AgentStatusBar({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [lastUpdatedText, setLastUpdatedText] = useState('just now');
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!data.fetchedAt) return;
    const updateText = () => setLastUpdatedText(timeAgo(data.fetchedAt!));
    updateText();
    const timer = setInterval(updateText, 30000);
    return () => clearInterval(timer);
  }, [data.fetchedAt]);

  const handleRefresh = async () => {
    setSpinning(true);
    await onRefresh();
    setLastUpdatedText('just now');
    setTimeout(() => setSpinning(false), 600);
  };

  if (data.loading || !data.hasNarrative) return null;

  return (
    <div className="mb-4 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="font-medium text-emerald-400">All agents active</span>
      </span>
      <span className="text-[var(--text-muted)]">&middot;</span>
      <span>Last update: {lastUpdatedText}</span>
      <button
        onClick={handleRefresh}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[var(--navy-lighter)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        <RefreshCw className={`w-3 h-3 ${spinning ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
      </button>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { data: dashData, refresh } = useDashboardData();
  const activityFeed = buildActivityFeed(dashData);
  const noNarrative = !dashData.loading && !dashData.hasNarrative;
  const router = useRouter();

  // Determine which cards have "new" data (for glow effect)
  const hasNewSignals = dashData.signalsToday > 0;
  const hasNewOpps = dashData.opportunitiesToday > 0;
  const hasNewDrafts = dashData.draftCount > 0;
  const hasNewBrief = dashData.weeklyReportReady;
  const hasNewThemes = dashData.themeCount > 0 && dashData.topThemeTrending;

  // Pixel Office agent states derived from dashboard data
  const pixelAgentStates = {
    marketMonitor: (dashData.signalsToday > 0 ? 'working' : 'idle') as 'idle' | 'working' | 'found',
    signalInterpreter: (dashData.opportunitiesToday > 0 ? 'working' : dashData.highUrgencyCount > 0 ? 'found' : 'idle') as 'idle' | 'working' | 'found',
    contentWriter: (dashData.draftCount > 0 ? 'working' : dashData.contentThisMonth > 0 ? 'found' : 'idle') as 'idle' | 'working' | 'found',
    briefingPartner: (dashData.weeklyReportReady ? 'found' : 'idle') as 'idle' | 'working' | 'found',
    performanceAnalyst: (dashData.topThemeTrending ? 'working' : dashData.themeCount > 0 ? 'found' : 'idle') as 'idle' | 'working' | 'found',
  };

  const handleAgentClick = useCallback((route: string) => {
    router.push(route);
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <style jsx global>{`
        /* === KEYFRAMES === */

        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes blipPulse {
          0%, 100% { opacity: 0; transform: scale(0); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 0.6; transform: scale(1); }
        }

        @keyframes lightbulbGlow {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        @keyframes lightbulbIcon {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(251,191,36,0.3)); }
          50% { filter: brightness(1.4) drop-shadow(0 0 20px rgba(251,191,36,0.8)); }
        }

        @keyframes sparkFloat {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          30% { opacity: 1; transform: translate(var(--sx), var(--sy)) scale(1); }
          100% { opacity: 0; transform: translate(var(--ex), var(--ey)) scale(0.3); }
        }

        @keyframes docShuffle1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-30px) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(0deg); }
        }

        @keyframes docShuffle2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          35% { transform: translateY(-20px) rotate(1deg); }
          60% { transform: translateY(-5px) rotate(0deg); }
        }

        @keyframes docShuffle3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          45% { transform: translateY(-15px) rotate(-1deg); }
          70% { transform: translateY(-3px) rotate(0deg); }
        }

        @keyframes chartDraw {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes chartAreaReveal {
          0% { opacity: 0; }
          100% { opacity: 0.15; }
        }

        @keyframes pointAppear {
          0% { opacity: 0; r: 0; }
          100% { opacity: 1; r: 3; }
        }

        @keyframes cardGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        @keyframes statusPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        @keyframes feedSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes headerFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes newDataPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--card-glow); }
          50% { box-shadow: 0 0 20px 4px var(--card-glow); }
        }

        /* === RADAR === */

        .radar-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 16px;
        }

        .radar-grid {
          position: relative;
          width: 130px;
          height: 130px;
        }

        .radar-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(34, 211, 238, 0.15);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .radar-circle-1 { width: 40px; height: 40px; }
        .radar-circle-2 { width: 80px; height: 80px; }
        .radar-circle-3 { width: 120px; height: 120px; }

        .radar-crosshair-h, .radar-crosshair-v {
          position: absolute;
          background: rgba(34, 211, 238, 0.08);
        }

        .radar-crosshair-h {
          top: 50%;
          left: 5px;
          right: 5px;
          height: 1px;
        }

        .radar-crosshair-v {
          left: 50%;
          top: 5px;
          bottom: 5px;
          width: 1px;
        }

        .radar-sweep {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 60px;
          height: 60px;
          transform-origin: 0 0;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(34, 211, 238, 0.3) 30deg,
            transparent 60deg
          );
          animation: radarSweep 3s linear infinite;
          border-radius: 0 60px 0 0;
          clip-path: polygon(0 0, 100% 0, 100% 100%);
        }

        .radar-blip {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 8px rgba(34, 211, 238, 0.8);
        }

        .blip-1 {
          top: 25%;
          left: 60%;
          animation: blipPulse 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .blip-2 {
          top: 40%;
          right: 15%;
          animation: blipPulse 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        .blip-3 {
          bottom: 30%;
          left: 35%;
          animation: blipPulse 3s ease-in-out infinite;
          animation-delay: 2.2s;
        }

        /* === LIGHTBULB === */

        .lightbulb-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          position: relative;
        }

        .lightbulb-glow {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 70%);
          animation: lightbulbGlow 3s ease-in-out infinite;
        }

        .lightbulb-icon {
          position: relative;
          z-index: 1;
          animation: lightbulbIcon 3s ease-in-out infinite;
        }

        .idea-spark {
          position: absolute;
          font-size: 14px;
          font-weight: 700;
          color: rgba(251, 191, 36, 0.8);
          font-family: 'Space Grotesk', monospace;
        }

        .spark-1 {
          --sx: -15px;
          --sy: -20px;
          --ex: -25px;
          --ey: -40px;
          top: 30%;
          left: 30%;
          animation: sparkFloat 2.5s ease-out infinite;
          animation-delay: 0.3s;
        }

        .spark-2 {
          --sx: 15px;
          --sy: -18px;
          --ex: 30px;
          --ey: -35px;
          top: 30%;
          right: 30%;
          animation: sparkFloat 2.5s ease-out infinite;
          animation-delay: 1.1s;
        }

        .spark-3 {
          --sx: 5px;
          --sy: -22px;
          --ex: 8px;
          --ey: -45px;
          top: 35%;
          left: 48%;
          animation: sparkFloat 2.5s ease-out infinite;
          animation-delay: 1.8s;
        }

        /* === TYPING === */

        .typing-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 12px;
        }

        .typing-window {
          width: 100%;
          background: rgba(17, 25, 39, 0.8);
          border-radius: 8px;
          border: 1px solid rgba(167, 139, 250, 0.2);
          overflow: hidden;
        }

        .typing-header {
          display: flex;
          gap: 5px;
          padding: 6px 10px;
          background: rgba(30, 40, 58, 0.8);
          border-bottom: 1px solid rgba(167, 139, 250, 0.1);
        }

        .typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          opacity: 0.7;
        }

        .typing-content {
          padding: 10px 12px;
          min-height: 60px;
          font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
          font-size: 11px;
          line-height: 1.6;
          color: rgba(167, 139, 250, 0.9);
        }

        .typing-text {
          color: var(--text-secondary);
        }

        .typing-cursor {
          color: #a78bfa;
          font-weight: 300;
          animation: none;
        }

        .typing-cursor.invisible {
          opacity: 0;
        }

        .typing-cursor.visible {
          opacity: 1;
        }

        /* === DOCUMENTS === */

        .doc-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          position: relative;
          padding: 12px;
        }

        .doc-page {
          position: absolute;
          width: 80px;
          background: rgba(30, 40, 58, 0.9);
          border: 1px solid rgba(52, 211, 153, 0.2);
          border-radius: 4px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .doc-page-1 {
          z-index: 3;
          height: 90px;
          animation: docShuffle1 4s ease-in-out infinite;
          box-shadow: 0 0 15px rgba(52, 211, 153, 0.1);
        }

        .doc-page-2 {
          z-index: 2;
          height: 85px;
          transform: translateX(6px);
          opacity: 0.7;
          animation: docShuffle2 4s ease-in-out infinite;
          animation-delay: 0.3s;
        }

        .doc-page-3 {
          z-index: 1;
          height: 80px;
          transform: translateX(12px);
          opacity: 0.4;
          animation: docShuffle3 4s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .doc-line {
          height: 3px;
          background: rgba(52, 211, 153, 0.25);
          border-radius: 2px;
          width: 100%;
        }

        .doc-line-short { width: 50%; }
        .doc-line-medium { width: 75%; }

        /* === CHART === */

        .chart-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 16px 12px 8px;
        }

        .chart-svg {
          flex: 1;
          width: 100%;
        }

        .chart-gridline {
          stroke: rgba(251, 113, 133, 0.08);
          stroke-width: 0.5;
        }

        .chart-line {
          stroke: #fb7185;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 400;
          animation: chartDraw 3s ease-out forwards;
          filter: drop-shadow(0 0 4px rgba(251, 113, 133, 0.5));
        }

        .chart-area {
          fill: #fb7185;
          animation: chartAreaReveal 3s ease-out forwards;
        }

        .chart-point {
          fill: #fb7185;
          stroke: var(--navy-light);
          stroke-width: 2;
          opacity: 0;
        }

        .chart-point-1 { animation: pointAppear 0.3s ease-out 1.5s forwards; }
        .chart-point-2 { animation: pointAppear 0.3s ease-out 2s forwards; }
        .chart-point-3 { animation: pointAppear 0.3s ease-out 2.8s forwards; }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          padding-top: 4px;
        }

        .chart-label {
          font-size: 9px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* === WORKSTATION CARDS === */

        .workstation-card {
          position: relative;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--navy-light);
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .workstation-card:hover {
          transform: translateY(-4px);
          border-color: var(--card-accent);
          box-shadow: 0 0 30px var(--card-glow), 0 8px 32px rgba(0,0,0,0.3);
        }

        .workstation-card:hover .card-border-glow {
          opacity: 1;
        }

        .workstation-card.has-new-data {
          animation: newDataPulse 3s ease-in-out 2;
        }

        .card-border-glow {
          position: absolute;
          inset: -1px;
          border-radius: 13px;
          background: linear-gradient(135deg, var(--card-accent), transparent 50%);
          opacity: 0;
          transition: opacity 0.4s ease;
          z-index: 0;
          pointer-events: none;
        }

        .animation-area {
          position: relative;
          height: 160px;
          background: radial-gradient(ellipse at center, var(--card-glow-subtle), transparent 70%);
          border-bottom: 1px solid var(--border);
          z-index: 1;
        }

        .card-info {
          position: relative;
          z-index: 1;
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--navy-light);
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .agent-grid .workstation-card:nth-child(4),
        .agent-grid .workstation-card:nth-child(5) {
          /* Bottom row centered: handled via separate wrapper */
        }

        @media (max-width: 1024px) {
          .agent-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .agent-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Status line animation */
        .status-line {
          animation: statusPulse 2s ease-in-out infinite;
        }

        /* Feed animation */
        .feed-item {
          animation: feedSlideIn 0.5s ease-out both;
        }

        /* Header animation */
        .dash-header {
          animation: headerFade 0.6s ease-out both;
        }

        /* Active indicator */
        .active-beacon {
          position: relative;
        }

        .active-beacon::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: cardGlow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
        {/* -- Header -- */}
        <div className={`mb-10 dash-header ${mounted ? '' : 'opacity-0'}`}>
          <div className="flex items-center gap-4 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/50 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[var(--text-primary)]">
                Workspace
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                5 AI agents working on your market credibility
              </p>
            </div>
          </div>
          {noNarrative && (
            <Link
              href="/narrative"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 text-white text-sm font-semibold shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 transition-all hover:scale-[1.02]"
            >
              <AlertCircle className="w-4 h-4" />
              Start by defining your Narrative
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* -- Agent Status Bar -- */}
        <AgentStatusBar data={dashData} onRefresh={refresh} />

        {/* -- Lifetime Stats Banner -- */}
        {!noNarrative && !dashData.loading && (
          <LifetimeStatsBanner data={dashData} mounted={mounted} />
        )}

        {/* -- Pixel Office Hero -- */}
        {!noNarrative && !dashData.loading && (
          <div
            className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '150ms' }}
          >
            <PixelOffice agentStates={pixelAgentStates} onAgentClick={handleAgentClick} />
          </div>
        )}

        {/* -- Agent Workstation Grid -- */}
        {/* Top row: 3 cards */}
        <div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          {/* Market Monitor */}
          <Link
            href="/signals"
            className={`workstation-card transition-all duration-500 ${hasNewSignals ? 'has-new-data' : ''} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{
              '--card-accent': '#22d3ee',
              '--card-glow': 'rgba(34,211,238,0.15)',
              '--card-glow-subtle': 'rgba(34,211,238,0.05)',
              transitionDelay: '100ms',
            } as React.CSSProperties}
          >
            <div className="card-border-glow" />
            <div className="animation-area">
              <RadarSweep />
            </div>
            <div className="card-info">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">
                    Market Monitor
                  </h3>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
              </div>
              <div className="status-line flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-cyan-500/10 mb-3">
                <CyclingStatus
                  messages={getMarketMonitorStatuses(dashData)}
                  colorClass="text-cyan-400"
                />
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.signalCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Signals</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.signalsToday}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Today</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>

          {/* Signal Interpreter */}
          <Link
            href="/opportunities"
            className={`workstation-card transition-all duration-500 ${hasNewOpps ? 'has-new-data' : ''} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{
              '--card-accent': '#fbbf24',
              '--card-glow': 'rgba(251,191,36,0.15)',
              '--card-glow-subtle': 'rgba(251,191,36,0.05)',
              transitionDelay: '200ms',
            } as React.CSSProperties}
          >
            <div className="card-border-glow" />
            <div className="animation-area">
              <LightbulbPulse />
            </div>
            <div className="card-info">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">
                    Signal Interpreter
                  </h3>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
              </div>
              <div className="status-line flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-amber-500/10 mb-3">
                <CyclingStatus
                  messages={getSignalInterpreterStatuses(dashData)}
                  colorClass="text-amber-400"
                />
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.opportunityCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Opportunities</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.highUrgencyCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">High urgency</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Content Writer */}
          <Link
            href="/content"
            className={`workstation-card transition-all duration-500 ${hasNewDrafts ? 'has-new-data' : ''} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{
              '--card-accent': '#a78bfa',
              '--card-glow': 'rgba(167,139,250,0.15)',
              '--card-glow-subtle': 'rgba(167,139,250,0.05)',
              transitionDelay: '300ms',
            } as React.CSSProperties}
          >
            <div className="card-border-glow" />
            <div className="animation-area">
              <TypingAnimation />
            </div>
            <div className="card-info">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">
                    Content Writer
                  </h3>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                </span>
              </div>
              <div className="status-line flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-violet-500/10 mb-3">
                <CyclingStatus
                  messages={getContentWriterStatuses(dashData)}
                  colorClass="text-violet-400"
                />
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.draftCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Drafts ready</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.contentThisMonth}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">This month</div>
                </div>
                {!noNarrative && dashData.linkedinWeeklyLimit > 0 && (
                  <div>
                    <div className={`text-lg font-bold font-heading ${
                      dashData.linkedinPostsThisWeek >= dashData.linkedinWeeklyLimit ? 'text-red-400' : 'text-[var(--text-primary)]'
                    }`}>
                      {dashData.linkedinPostsThisWeek}/{dashData.linkedinWeeklyLimit}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">LinkedIn/wk</div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom row: 2 cards, centered */}
        <div className="flex justify-center gap-4 mb-10">
          {/* Briefing Partner */}
          <Link
            href="/briefing"
            className={`workstation-card w-full max-w-[400px] transition-all duration-500 ${hasNewBrief ? 'has-new-data' : ''} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{
              '--card-accent': '#34d399',
              '--card-glow': 'rgba(52,211,153,0.15)',
              '--card-glow-subtle': 'rgba(52,211,153,0.05)',
              transitionDelay: '400ms',
            } as React.CSSProperties}
          >
            <div className="card-border-glow" />
            <div className="animation-area">
              <DocumentStack />
            </div>
            <div className="card-info">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">
                    Briefing Partner
                  </h3>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
              <div className="status-line flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-emerald-500/10 mb-3">
                <CyclingStatus
                  messages={getBriefingPartnerStatuses(dashData)}
                  colorClass="text-emerald-400"
                />
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">
                    {dashData.weeklyReportReady ? 'Ready' : 'Pending'}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Weekly brief</div>
                </div>
                {dashData.weeklyReportDate && (
                  <div>
                    <div className="text-lg font-bold text-[var(--text-primary)] font-heading">
                      {timeAgo(dashData.weeklyReportDate)}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Generated</div>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Performance Analyst */}
          <Link
            href="/learning"
            className={`workstation-card w-full max-w-[400px] transition-all duration-500 ${hasNewThemes ? 'has-new-data' : ''} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{
              '--card-accent': '#fb7185',
              '--card-glow': 'rgba(251,113,133,0.15)',
              '--card-glow-subtle': 'rgba(251,113,133,0.05)',
              transitionDelay: '500ms',
            } as React.CSSProperties}
          >
            <div className="card-border-glow" />
            <div className="animation-area">
              <DrawingChart />
            </div>
            <div className="card-info">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-semibold font-heading text-[var(--text-primary)]">
                    Performance Analyst
                  </h3>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                </span>
              </div>
              <div className="status-line flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-rose-500/10 mb-3">
                <CyclingStatus
                  messages={getPerformanceAnalystStatuses(dashData)}
                  colorClass="text-rose-400"
                />
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.themeCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Themes tracked</div>
                </div>
                {dashData.topThemeName && (
                  <div>
                    <div className="text-lg font-bold text-[var(--text-primary)] font-heading truncate max-w-[120px]">
                      {dashData.topThemeName}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      Top theme{dashData.topThemeTrending ? ' \u2191' : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* -- Activity Feed -- */}
        {!noNarrative && (
        <div className={`rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '600ms' }}
        >
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)] font-heading">
                Live Activity Feed
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                Live
              </span>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]/50">
            {activityFeed.map((item, idx) => (
              <div
                key={item.id}
                className="feed-item flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--navy-lighter)]/50 transition-colors"
                style={{
                  animationDelay: mounted ? `${700 + idx * 80}ms` : '0ms',
                }}
              >
                <div
                  className="w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    borderColor: `${item.color}30`,
                    background: `${item.color}10`,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium" style={{ color: item.color }}>
                      {item.agent}
                    </span>{' '}
                    <span className="text-[var(--text-secondary)]">{item.message}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                  <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </>
  );
}
