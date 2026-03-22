'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radar, Lightbulb, PenTool, FileText, TrendingUp,
  ArrowRight, Clock, Sparkles, Zap, AlertCircle,
} from 'lucide-react';

/* ─── Dashboard data types ─── */
interface DashboardData {
  hasNarrative: boolean;
  signalCount: number;
  opportunityCount: number;
  highUrgencyCount: number;
  draftCount: number;
  contentThisMonth: number;
  themeCount: number;
  linkedinPostsThisWeek: number;
  linkedinWeeklyLimit: number;
  userPlanId: string | null;
  loading: boolean;
}

const initialData: DashboardData = {
  hasNarrative: false,
  signalCount: 0,
  opportunityCount: 0,
  highUrgencyCount: 0,
  draftCount: 0,
  contentThisMonth: 0,
  themeCount: 0,
  linkedinPostsThisWeek: 0,
  linkedinWeeklyLimit: 0,
  userPlanId: null,
  loading: true,
};

/* ─── Data fetching hook ─── */
function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>(initialData);

  useEffect(() => {
    async function fetchAll() {
      const results = { ...initialData, loading: false };

      // Fetch all APIs in parallel, each wrapped in try/catch
      const [narrativeRes, contentRes, newsRes, oppsRes, themesRes, authRes] = await Promise.allSettled([
        fetch('/api/messaging-bible').then(r => r.json()),
        fetch('/api/generate?limit=100').then(r => r.json()),
        fetch('/api/news?limit=100').then(r => r.json()),
        fetch('/api/opportunities').then(r => r.json()),
        fetch('/api/themes').then(r => r.json()),
        fetch('/api/auth/me').then(r => r.json()),
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
        results.draftCount = content.filter((c: any) => c.status === 'draft').length;
        // Count content created this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        results.contentThisMonth = content.filter((c: any) => {
          const created = new Date(c.created_at);
          return created >= monthStart;
        }).length;
      }

      // News / signals
      if (newsRes.status === 'fulfilled') {
        const d = newsRes.value;
        const articles = Array.isArray(d.articles) ? d.articles : [];
        results.signalCount = articles.length;
      }

      // Opportunities
      if (oppsRes.status === 'fulfilled') {
        const d = oppsRes.value;
        const opps = Array.isArray(d.opportunities) ? d.opportunities : [];
        results.opportunityCount = opps.length;
        results.highUrgencyCount = opps.filter((o: any) => (o.opportunity_score ?? o.score ?? 0) >= 75).length;
      }

      // Themes
      if (themesRes.status === 'fulfilled') {
        const d = themesRes.value;
        const themes = Array.isArray(d.themes) ? d.themes : [];
        results.themeCount = themes.length;
      }

      // User plan + LinkedIn weekly limit
      if (authRes.status === 'fulfilled') {
        const d = authRes.value;
        const planId = d.plan?.plan_id || 'plan-trial';
        results.userPlanId = planId;
        // LinkedIn weekly limits: Starter=3, Growth=10, Intelligence=10
        if (planId === 'plan-starter') results.linkedinWeeklyLimit = 3;
        else if (planId === 'plan-professional' || planId === 'plan-enterprise') results.linkedinWeeklyLimit = 10;
        else results.linkedinWeeklyLimit = 0;
      }

      // Count LinkedIn posts this week from content data
      if (contentRes.status === 'fulfilled') {
        const d = contentRes.value;
        const content = Array.isArray(d.content) ? d.content : [];
        const now = new Date();
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        weekStart.setHours(0, 0, 0, 0);
        results.linkedinPostsThisWeek = content.filter((c: any) => {
          const isLinkedIn = (c.format || c.content_type || '').toLowerCase().includes('linkedin');
          const created = new Date(c.created_at);
          return isLinkedIn && created >= weekStart;
        }).length;
      }

      setData(results);
    }

    fetchAll();
  }, []);

  return data;
}

/* ─── Build dynamic activity feed ─── */
function buildActivityFeed(data: DashboardData) {
  if (data.loading) {
    return [{
      id: '1',
      agent: 'System',
      color: '#818cf8',
      message: 'Loading your growth team status...',
      time: 'now',
    }];
  }

  if (!data.hasNarrative) {
    return [{
      id: '1',
      agent: 'Growth Team',
      color: '#818cf8',
      message: 'Your growth team is ready — define your Narrative to get started',
      time: 'now',
    }];
  }

  const feed: { id: string; agent: string; color: string; message: string; time: string }[] = [];

  if (data.signalCount > 0) {
    feed.push({
      id: '1',
      agent: 'Market Monitor',
      color: '#22d3ee',
      message: `Found ${data.signalCount} signal${data.signalCount === 1 ? '' : 's'} matching your narrative`,
      time: 'Recent',
    });
  }

  if (data.highUrgencyCount > 0) {
    feed.push({
      id: '2',
      agent: 'Signal Interpreter',
      color: '#fbbf24',
      message: `${data.highUrgencyCount} high-urgency opportunit${data.highUrgencyCount === 1 ? 'y' : 'ies'} flagged for review`,
      time: 'Recent',
    });
  } else if (data.opportunityCount > 0) {
    feed.push({
      id: '2',
      agent: 'Signal Interpreter',
      color: '#fbbf24',
      message: `${data.opportunityCount} opportunit${data.opportunityCount === 1 ? 'y' : 'ies'} identified from your signals`,
      time: 'Recent',
    });
  }

  if (data.draftCount > 0) {
    feed.push({
      id: '3',
      agent: 'Commentary Writer',
      color: '#a78bfa',
      message: `${data.draftCount} draft${data.draftCount === 1 ? '' : 's'} ready for your review`,
      time: 'Recent',
    });
  }

  if (data.themeCount > 0) {
    feed.push({
      id: '5',
      agent: 'Performance Analyst',
      color: '#fb7185',
      message: `Tracking ${data.themeCount} theme${data.themeCount === 1 ? '' : 's'} across your content`,
      time: 'Recent',
    });
  }

  // If narrative exists but nothing else, show getting-started messages
  if (feed.length === 0) {
    feed.push(
      {
        id: '1',
        agent: 'Market Monitor',
        color: '#22d3ee',
        message: 'Your Narrative is set — scanning sources for relevant signals',
        time: 'now',
      },
      {
        id: '2',
        agent: 'Signal Interpreter',
        color: '#fbbf24',
        message: 'Standing by to analyze incoming signals',
        time: 'now',
      },
      {
        id: '3',
        agent: 'Commentary Writer',
        color: '#a78bfa',
        message: 'Ready to draft content when opportunities are identified',
        time: 'now',
      },
    );
  }

  return feed;
}

/* ─── Typing animation hook ─── */
function useTypingEffect(text: string, speed = 80, delay = 1000) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    let timeout: NodeJS.Timeout;

    const startTyping = () => {
      timeout = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timeout);
          // Reset after a pause
          setTimeout(() => {
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

/* ─── Activity Data (now dynamic — see buildActivityFeed) ─── */

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const dashData = useDashboardData();
  const activityFeed = buildActivityFeed(dashData);
  const noNarrative = !dashData.loading && !dashData.hasNarrative;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <style jsx global>{`
        /* ═══ KEYFRAMES ═══ */

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

        /* ═══ RADAR ═══ */

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

        /* ═══ LIGHTBULB ═══ */

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

        /* ═══ TYPING ═══ */

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

        /* ═══ DOCUMENTS ═══ */

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

        /* ═══ CHART ═══ */

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

        /* ═══ WORKSTATION CARDS ═══ */

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
        {/* ── Header ── */}
        <div className={`mb-10 dash-header ${mounted ? '' : 'opacity-0'}`}>
          <div className="flex items-center gap-4 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/50 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[var(--text-primary)]">
                Your Growth Team
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

        {/* ── Agent Workstation Grid ── */}
        {/* Top row: 3 cards */}
        <div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          {/* Market Monitor */}
          <Link
            href="/signals"
            className={`workstation-card transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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
                <span className="text-xs text-cyan-400 font-medium">
                  {noNarrative
                    ? 'Set up your Narrative first to start scanning'
                    : dashData.signalCount > 0
                      ? `Found ${dashData.signalCount} signal${dashData.signalCount === 1 ? '' : 's'}`
                      : dashData.loading
                        ? 'Loading...'
                        : 'Scanning sources...'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.signalCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Signals</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">14</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Sources</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>

          {/* Signal Interpreter */}
          <Link
            href="/opportunities"
            className={`workstation-card transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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
                <span className="text-xs text-amber-400 font-medium">
                  {noNarrative
                    ? 'Complete your Narrative to identify opportunities'
                    : dashData.opportunityCount > 0
                      ? `${dashData.highUrgencyCount > 0 ? `${dashData.highUrgencyCount} high-urgency` : 'Analyzing'} signals...`
                      : dashData.loading
                        ? 'Loading...'
                        : 'Waiting for signals...'}
                </span>
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

          {/* Commentary Writer */}
          <Link
            href="/content"
            className={`workstation-card transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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
                    Commentary Writer
                  </h3>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                </span>
              </div>
              <div className="status-line flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-violet-500/10 mb-3">
                <span className="text-xs text-violet-400 font-medium">
                  {noNarrative
                    ? 'Complete your Narrative to generate content'
                    : dashData.draftCount > 0
                      ? `${dashData.draftCount} draft${dashData.draftCount === 1 ? '' : 's'} ready for review`
                      : dashData.loading
                        ? 'Loading...'
                        : 'Ready to draft content...'}
                </span>
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
            className={`workstation-card w-full max-w-[400px] transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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
                <span className="text-xs text-emerald-400 font-medium">
                  {noNarrative ? 'Waiting for Narrative...' : 'Preparing weekly brief...'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">Ready</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Weekly brief</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">2</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Upcoming</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Performance Analyst */}
          <Link
            href="/learning"
            className={`workstation-card w-full max-w-[400px] transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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
                <span className="text-xs text-rose-400 font-medium">
                  {noNarrative
                    ? 'Waiting for Narrative...'
                    : dashData.themeCount > 0
                      ? `Tracking ${dashData.themeCount} theme${dashData.themeCount === 1 ? '' : 's'}...`
                      : dashData.loading
                        ? 'Loading...'
                        : 'Waiting for content to analyze...'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-auto">
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">{noNarrative ? '0' : dashData.themeCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Themes tracked</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-heading">3</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Top performing</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Activity Feed ── */}
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
