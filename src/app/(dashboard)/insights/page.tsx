'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radio, FileText, Clock, Share2, Eye, Flame,
  TrendingUp, Loader2, ArrowRight, Lightbulb, Send,
} from 'lucide-react';

interface InsightsData {
  signals_surfaced: number;
  content_generated: number;
  hours_saved: number;
  team_shares: number;
  distribution_reach: number;
  active_streak: number;
  signals_trend: { date: string; count: number }[];
  content_trend: { date: string; count: number }[];
  period: string;
}

const PERIODS = [
  { value: '7d', label: 'This week' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const height = 32;
  const width = 100;
  const step = width / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  trendData,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  trendData?: number[];
}) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-3xl font-bold text-[var(--text-primary)]">
            {value.toLocaleString()}
          </span>
          {suffix && <span className="text-sm text-[var(--text-secondary)] ml-1">{suffix}</span>}
        </div>
        {trendData && trendData.length > 1 && (
          <div className="w-24 flex-shrink-0">
            <Sparkline data={trendData} color={color.includes('teal') ? '#14B8A6' : '#A855F7'} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/insights?period=${period}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to load insights:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Your Monitus in Numbers</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            See the measurable impact Monitus delivers for your business
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            icon={Radio}
            label="Signals Surfaced"
            value={data.signals_surfaced}
            color="bg-teal-500/10 text-teal-400"
            trendData={data.signals_trend.map(t => t.count)}
          />
          <MetricCard
            icon={FileText}
            label="Content Generated"
            value={data.content_generated}
            color="bg-purple-500/10 text-purple-400"
            trendData={data.content_trend.map(t => t.count)}
          />
          <MetricCard
            icon={Clock}
            label="Hours Saved"
            value={data.hours_saved}
            suffix="h"
            color="bg-green-500/10 text-green-400"
          />
          <MetricCard
            icon={Share2}
            label="Team Shares"
            value={data.team_shares}
            color="bg-blue-500/10 text-blue-400"
          />
          <MetricCard
            icon={Eye}
            label="Distribution Reach"
            value={data.distribution_reach}
            suffix="views"
            color="bg-amber-500/10 text-amber-400"
          />
          <MetricCard
            icon={Flame}
            label="Active Streak"
            value={data.active_streak}
            suffix={data.active_streak === 1 ? 'day' : 'days'}
            color="bg-orange-500/10 text-orange-400"
          />
        </div>
      ) : (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No data available yet. Start using Monitus to see your insights.</p>
        </div>
      )}

      {/* Value summary */}
      {data && data.hours_saved > 0 && (
        <div className="bg-gradient-to-r from-teal-500/5 to-purple-500/5 border border-[var(--border)] rounded-xl p-5 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Monitus has saved you approximately <span className="font-semibold text-[var(--text-primary)]">~{data.hours_saved} hours</span> of
            market research and content creation{' '}
            {period === '7d' ? 'this week' : period === '30d' ? 'in the last 30 days' : 'overall'}.
          </p>
        </div>
      )}

      {/* Empty-state next-step prompts when nothing's happened in the period.
          Stops the page from being a wall of zeros and points the user back
          into the workflow. */}
      {data && data.signals_surfaced === 0 && data.content_generated === 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide font-semibold text-[var(--text-secondary)] mt-4">Get started</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NextStepCard
              icon={Radio}
              title="Surface market signals"
              body="See what's saturating your market and where your narrative is being picked up."
              href="/market-analyst"
              cta="Open Market Analyst"
            />
            <NextStepCard
              icon={Lightbulb}
              title="Review opportunities"
              body="Turn high-fit stories into content angles ready to publish."
              href="/strategy"
              cta="Open Strategy Partner"
            />
            <NextStepCard
              icon={Send}
              title="Distribute content"
              body="Connect LinkedIn or email and ship a draft this week."
              href="/content"
              cta="Open Content Producer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NextStepCard({
  icon: Icon, title, body, href, cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; body: string; href: string; cta: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2 hover:border-[var(--accent)]/50 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--accent)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-snug">{body}</p>
      </div>
      <p className="text-xs font-semibold text-[var(--accent)] inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
        {cta} <ArrowRight className="w-3 h-3" />
      </p>
    </Link>
  );
}
