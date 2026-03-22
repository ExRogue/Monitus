'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radar, Lightbulb, PenTool, FileText, TrendingUp,
  ArrowRight, Clock, Activity, Zap, CheckCircle,
  AlertTriangle, Sparkles, Eye,
} from 'lucide-react';

interface AgentCard {
  id: string;
  name: string;
  role: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGlow: string;
  statusLine: string;
  stats: { label: string; value: string | number }[];
}

const agents: AgentCard[] = [
  {
    id: 'market-monitor',
    name: 'Market Monitor',
    role: 'Scanning sources and surfacing relevant signals',
    href: '/signals',
    icon: Radar,
    color: 'text-cyan-400',
    bgGlow: 'from-cyan-500/20 to-cyan-500/5',
    statusLine: 'Scanning 14 sources...',
    stats: [
      { label: 'New signals today', value: 7 },
      { label: 'Sources monitored', value: 14 },
    ],
  },
  {
    id: 'signal-interpreter',
    name: 'Signal Interpreter',
    role: 'Identifying content angles from market signals',
    href: '/opportunities',
    icon: Lightbulb,
    color: 'text-amber-400',
    bgGlow: 'from-amber-500/20 to-amber-500/5',
    statusLine: '3 high-urgency opportunities flagged',
    stats: [
      { label: 'Active opportunities', value: 12 },
      { label: 'High urgency', value: 3 },
    ],
  },
  {
    id: 'commentary-writer',
    name: 'Commentary Writer',
    role: 'Drafting content in your voice',
    href: '/content',
    icon: PenTool,
    color: 'text-violet-400',
    bgGlow: 'from-violet-500/20 to-violet-500/5',
    statusLine: '2 drafts ready for review',
    stats: [
      { label: 'Drafts ready', value: 2 },
      { label: 'This month', value: 8 },
    ],
  },
  {
    id: 'briefing-partner',
    name: 'Briefing Partner',
    role: 'Preparing your weekly priorities and meeting briefs',
    href: '/briefing',
    icon: FileText,
    color: 'text-emerald-400',
    bgGlow: 'from-emerald-500/20 to-emerald-500/5',
    statusLine: 'Weekly brief ready for review',
    stats: [
      { label: 'Weekly brief', value: 'Ready' },
      { label: 'Upcoming', value: 2 },
    ],
  },
  {
    id: 'performance-analyst',
    name: 'Performance Analyst',
    role: 'Tracking what resonates and refining your approach',
    href: '/learning',
    icon: TrendingUp,
    color: 'text-rose-400',
    bgGlow: 'from-rose-500/20 to-rose-500/5',
    statusLine: 'Tracking 8 themes across 14 sources',
    stats: [
      { label: 'Themes tracked', value: 8 },
      { label: 'Top performing', value: 3 },
    ],
  },
];

interface ActivityItem {
  id: string;
  agent: string;
  agentColor: string;
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  time: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    agent: 'Market Monitor',
    agentColor: 'text-cyan-400',
    icon: Radar,
    message: 'Found 3 new signals matching your narrative on AI governance',
    time: '12 min ago',
  },
  {
    id: '2',
    agent: 'Signal Interpreter',
    agentColor: 'text-amber-400',
    icon: Lightbulb,
    message: 'Flagged high-urgency opportunity: FCA CP26/7 consultation response window',
    time: '34 min ago',
  },
  {
    id: '3',
    agent: 'Commentary Writer',
    agentColor: 'text-violet-400',
    icon: PenTool,
    message: 'Draft complete: "What cyber war exclusions mean for your portfolio"',
    time: '1 hr ago',
  },
  {
    id: '4',
    agent: 'Briefing Partner',
    agentColor: 'text-emerald-400',
    icon: FileText,
    message: 'Weekly priorities updated with latest market developments',
    time: '2 hrs ago',
  },
  {
    id: '5',
    agent: 'Performance Analyst',
    agentColor: 'text-rose-400',
    icon: TrendingUp,
    message: 'Your delegated authority content is outperforming by 2.4x vs industry average',
    time: '3 hrs ago',
  },
  {
    id: '6',
    agent: 'Market Monitor',
    agentColor: 'text-cyan-400',
    icon: Radar,
    message: 'Competitor A published new thought leadership on AI explainability',
    time: '4 hrs ago',
  },
];

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}
      />
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`}
      />
    </span>
  );
}

const pulseColors: Record<string, string> = {
  'text-cyan-400': 'bg-cyan-400',
  'text-amber-400': 'bg-amber-400',
  'text-violet-400': 'bg-violet-400',
  'text-emerald-400': 'bg-emerald-400',
  'text-rose-400': 'bg-rose-400',
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/60 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
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
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {agents.map((agent, idx) => (
          <Link
            key={agent.id}
            href={agent.href}
            className={`group relative rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 transition-all duration-300 hover:border-[var(--accent)]/40 hover:bg-[var(--navy-lighter)] hover:shadow-lg hover:shadow-[var(--accent)]/5 hover:-translate-y-0.5 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{
              transitionDelay: mounted ? `${idx * 80}ms` : '0ms',
            }}
          >
            {/* Subtle glow background */}
            <div
              className={`absolute inset-0 rounded-xl bg-gradient-to-br ${agent.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            />

            <div className="relative">
              {/* Top row: icon + pulse */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-[var(--navy-lighter)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--accent)]/30 transition-colors`}
                >
                  <agent.icon className={`w-5 h-5 ${agent.color}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <PulseDot color={pulseColors[agent.color] || 'bg-green-400'} />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                    Active
                  </span>
                </div>
              </div>

              {/* Name and role */}
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 font-heading">
                {agent.name}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                {agent.role}
              </p>

              {/* Status line */}
              <div className="flex items-center gap-2 mb-4 px-2.5 py-1.5 rounded-md bg-[var(--navy)]/60 border border-[var(--border)]/60">
                <Activity className="w-3 h-3 text-[var(--accent)] flex-shrink-0 animate-pulse" />
                <span className="text-xs text-[var(--accent)] font-medium truncate">
                  {agent.statusLine}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4">
                {agent.stats.map((stat) => (
                  <div key={stat.label} className="flex-1">
                    <div className="text-lg font-bold text-[var(--text-primary)] font-heading">
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hover arrow */}
              <div className="absolute top-5 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 -translate-x-2">
                <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)] font-heading">
              Recent Activity
            </h2>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Last 24 hours
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]/50">
          {recentActivity.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--navy-lighter)]/50 transition-colors ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
              style={{
                transitionDuration: '400ms',
                transitionDelay: mounted ? `${(agents.length * 80) + (idx * 60)}ms` : '0ms',
              }}
            >
              <div className="w-7 h-7 rounded-md bg-[var(--navy-lighter)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className={`w-3.5 h-3.5 ${item.agentColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  <span className={`font-medium ${item.agentColor}`}>{item.agent}</span>
                  {' '}
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
    </div>
  );
}
