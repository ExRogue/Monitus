'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  FileText,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Rocket,
  Shield,
  Target,
  Eye,
  EyeOff,
  Crosshair,
  RefreshCw,
  Loader2,
  ChevronRight,
  Swords,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import OnboardingWizard from '@/components/OnboardingWizard';
import OnboardingChecklist from '@/components/OnboardingChecklist';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  tags: string;
  published_at: string;
}

interface GeneratedContent {
  id: string;
  title: string;
  content_type: string;
  compliance_status: string;
  compliance_score: number;
  created_at: string;
}

/* ---------- mini bar chart (pure CSS, no deps) ---------- */
function MiniBarChart({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-[var(--accent)] to-[var(--purple)] transition-all duration-500 min-h-[2px]"
              style={{ height: `${(v / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d} className="flex-1 text-center text-[11px] text-[var(--text-secondary)]">
            {d}
          </span>
        ))}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">{label}</p>
    </div>
  );
}

/* ---------- donut chart (SVG) ---------- */
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const offset = circumference * (1 - pct);
          const rotation = cumulative * 360 - 90;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="10"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={offset}
              transform={`rotate(${rotation} 50 50)`}
              className="transition-all duration-500"
            />
          );
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-[var(--text-primary)] text-lg font-bold">
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-[var(--text-secondary)]">{seg.label}</span>
            <span className="text-xs font-medium text-[var(--text-primary)] ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- compliance gauge ---------- */
function ComplianceGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = Math.PI * radius; // half-circle
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70" className="overflow-visible">
        <path
          d="M 10 60 A 42 42 0 0 1 110 60"
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 60 A 42 42 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          className="transition-all duration-700"
        />
        <text x="60" y="55" textAnchor="middle" className="fill-[var(--text-primary)] text-xl font-bold">
          {score}%
        </text>
      </svg>
      <p className="text-xs text-[var(--text-secondary)] mt-1">Avg. compliance score</p>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--navy-lighter)] rounded ${className}`} />;
}

/* ---------- Weekly Priority View ---------- */
interface WeeklyTheme {
  name: string;
  relevance: string;
  summary: string;
  articleCount: number;
  action: string;
}

interface WeeklyAngle {
  title: string;
  hook: string;
  format: string;
  urgency: string;
}

interface WeeklyData {
  weekEnding: string;
  themes: WeeklyTheme[];
  angles: WeeklyAngle[];
  competitorMove: { competitor: string; observation: string; implication: string };
  contentMix: { recommendation: string; linkedin: number; email: number; tradMedia: number };
  ignore: { topic: string; reason: string };
  narrativeNote: string | null;
}

function WeeklyPriorityView() {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reports/weekly')
      .then(r => r.json())
      .then(d => {
        if (d.report?.content) {
          try {
            const parsed = typeof d.report.content === 'string' ? JSON.parse(d.report.content) : d.report.content;
            setData(parsed);
          } catch { /* no valid data */ }
        }
        if (d.canGenerate) setCanGenerate(true);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/reports/weekly', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Failed to generate');
        return;
      }
      if (d.weeklyData) setData(d.weeklyData);
    } catch {
      setError('Network error');
    } finally {
      setGenerating(false);
    }
  };

  if (!data && !canGenerate) return null;

  if (!data && canGenerate) {
    return (
      <div className="bg-gradient-to-r from-[var(--accent)]/5 to-[#8B5CF6]/5 border border-[var(--accent)]/20 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Priority View available</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Your AI market analyst has reviewed this week's signals. Generate your priorities.
              </p>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <>Generate <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
        {error && <p className="text-xs text-[var(--error)] mt-2">{error}</p>}
      </div>
    );
  }

  if (!data) return null;

  const actionColor = (action: string) => {
    if (action === 'respond') return 'var(--accent)';
    if (action === 'monitor') return 'var(--warning)';
    return 'var(--text-secondary)';
  };

  const urgencyLabel = (u: string) => {
    if (u === 'this_week') return 'This week';
    if (u === 'next_week') return 'Next week';
    return 'Ongoing';
  };

  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Weekly Priority View</h2>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Themes */}
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Top themes this week</h3>
          <div className="space-y-2.5">
            {data.themes.map((theme, i) => (
              <div key={i} className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{theme.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: actionColor(theme.action), backgroundColor: `color-mix(in srgb, ${actionColor(theme.action)} 15%, transparent)` }}>
                      {theme.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">{theme.articleCount} articles</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{theme.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Angles to own */}
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Angles to own</h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {data.angles.map((angle, i) => (
              <div key={i} className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[var(--accent)]">{angle.title}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">{urgencyLabel(angle.urgency)}</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed mb-2">&ldquo;{angle.hook}&rdquo;</p>
                <Badge className="text-[10px]">{angle.format}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: Competitor + Ignore + Content Mix */}
        <div className="grid sm:grid-cols-3 gap-2.5">
          {/* Competitor move */}
          <div className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Swords className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Competitor</span>
            </div>
            <p className="text-xs font-medium text-[var(--text-primary)] mb-1">{data.competitorMove.competitor}</p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{data.competitorMove.implication}</p>
          </div>

          {/* Content mix */}
          <div className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Publish this week</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{data.contentMix.recommendation}</p>
          </div>

          {/* Ignore */}
          <div className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <EyeOff className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Ignore</span>
            </div>
            <p className="text-xs font-medium text-[var(--text-primary)] mb-1">{data.ignore.topic}</p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{data.ignore.reason}</p>
          </div>
        </div>

        {/* Narrative note */}
        {data.narrativeNote && (
          <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Crosshair className="w-3.5 h-3.5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider">Narrative note</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-1">{data.narrativeNote}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [userRes, companyRes, newsRes, contentRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/company'),
          fetch('/api/news?limit=5'),
          fetch('/api/generate?limit=5'),
        ]);

        const [userData, companyData, newsData, contentData] = await Promise.all([
          userRes.json(),
          companyRes.json(),
          newsRes.json(),
          contentRes.json(),
        ]);

        if (userData.user) setUser(userData.user);
        if (companyData.company) {
          setCompany(companyData.company);
        } else {
          setShowOnboarding(true);
        }
        setNews(newsData.articles || []);
        setContent(contentData.content || []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* Compute analytics from real data */
  const compliancePassed = content.filter(c => c.compliance_status === 'passed').length;
  const complianceWarning = content.filter(c => c.compliance_status === 'warning').length;
  const complianceFailed = content.filter(c => c.compliance_status === 'failed').length;
  const avgCompliance = content.length
    ? Math.round(content.reduce((s, c) => s + (c.compliance_score || 0), 0) / content.length)
    : 0;

  // Content type breakdown
  const typeCounts: Record<string, number> = {};
  content.forEach(c => { typeCounts[c.content_type] = (typeCounts[c.content_type] || 0) + 1; });
  const typeColors = ['#4A9E96', '#7DC4BD', '#3AAF7C', '#6B7D92', '#3D8B84'];
  const typeSegments = Object.entries(typeCounts).map(([label, value], i) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value,
    color: typeColors[i % typeColors.length],
  }));

  // Weekly activity (group by day of week from recent content + news)
  const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
  [...content, ...news].forEach(item => {
    const d = new Date('created_at' in item ? item.created_at : item.published_at);
    if (!isNaN(d.getTime())) {
      const day = (d.getDay() + 6) % 7; // Mon=0
      weeklyActivity[day]++;
    }
  });

  const stats = [
    { label: 'News Articles', value: news.length, icon: Newspaper, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10', hint: 'Fetch news from the Pipeline to get started' },
    { label: 'Content Generated', value: content.length, icon: FileText, color: 'text-[var(--purple)]', bg: 'bg-[var(--purple)]/10', hint: 'Select articles in the Pipeline to generate content' },
    { label: 'Compliance Pass', value: compliancePassed, icon: CheckCircle, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10', hint: 'Compliance is checked automatically on each piece' },
    { label: 'Needs Review', value: complianceWarning, icon: AlertTriangle, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10', hint: 'Items flagged for compliance review appear here' },
  ];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Reload company data
    fetch('/api/company')
      .then(r => r.json())
      .then(d => d.company && setCompany(d.company));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {[1,2].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Show onboarding wizard if needed
  if (showOnboarding && !loading) {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Weekly Priority View */}
      <WeeklyPriorityView />

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">
          {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Monitor your content performance and track what matters.
        </p>
      </div>

      {/* Quick action */}
      <div className="bg-gradient-to-r from-[var(--accent)]/10 to-[var(--purple)]/10 border border-[var(--accent)]/20 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Ready to generate content?</h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Select articles and transform them into branded content</p>
          </div>
        </div>
        <Link href="/pipeline" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            Open Pipeline <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
              </div>
              {stat.value > 0 && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--success)] flex-shrink-0" />}
            </div>
            <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">{stat.label}</p>
            {stat.value === 0 && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 opacity-70">{stat.hint}</p>
            )}
          </div>
        ))}
      </div>

      {/* Analytics row */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Weekly Activity */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Weekly Activity</h3>
          </div>
          <MiniBarChart data={weeklyActivity} label="Items created this week" />
        </div>

        {/* Content Breakdown */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--purple)] flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Content Types</h3>
          </div>
          {typeSegments.length > 0 ? (
            <DonutChart segments={typeSegments} />
          ) : (
            <div className="h-28 flex flex-col items-center justify-center text-center px-4">
              <Rocket className="w-8 h-8 text-[var(--purple)] opacity-40 mb-2" />
              <p className="text-xs text-[var(--text-secondary)]">Your content mix will appear here once you generate your first piece.</p>
              <Link href="/pipeline" className="text-xs text-[var(--accent)] hover:underline mt-1">Go to Pipeline</Link>
            </div>
          )}
        </div>

        {/* Compliance Gauge */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)] flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Compliance Overview</h3>
          </div>
          {content.length > 0 ? (
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <ComplianceGauge score={avgCompliance} />
              <div className="flex flex-wrap gap-2 sm:gap-4 text-[11px] sm:text-xs mt-2 justify-center">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                  <span className="text-[var(--text-secondary)]">Passed {compliancePassed}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                  <span className="text-[var(--text-secondary)]">Warning {complianceWarning}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--error)]" />
                  <span className="text-[var(--text-secondary)]">Failed {complianceFailed}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="h-28 flex flex-col items-center justify-center text-center px-4">
              <Shield className="w-8 h-8 text-[var(--success)] opacity-40 mb-2" />
              <p className="text-xs text-[var(--text-secondary)]">Every piece of content is auto-checked against FCA and GDPR rules. Scores appear here.</p>
              <Link href="/pipeline" className="text-xs text-[var(--accent)] hover:underline mt-1">Generate content</Link>
            </div>
          )}
        </div>
      </div>

      {/* Two columns: news + content */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Latest news */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)] gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 flex-shrink-0">
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
              Latest News
            </h2>
            <Link href="/news" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">View all</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {news.length === 0 ? (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                <Newspaper className="w-10 h-10 text-[var(--accent)] opacity-30 mb-3" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No news articles yet</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-3">
                  Monitus pulls the latest insurance trade press so you can turn breaking stories into branded content.
                </p>
                <Link href="/pipeline">
                  <Button size="sm">
                    Go to Pipeline <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              news.map((article) => {
                const tags = JSON.parse(article.tags || '[]');
                return (
                  <div key={article.id} className="p-3 sm:p-4 hover:bg-[var(--navy-lighter)] transition-colors">
                    <h3 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-1">
                      {article.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2 text-[11px] sm:text-xs">
                      <span className="text-[var(--text-secondary)] truncate">{article.source}</span>
                      <span className="text-[var(--text-secondary)] hidden sm:inline">·</span>
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--text-secondary)] flex-shrink-0" />
                      <span className="text-[var(--text-secondary)]">{formatTime(article.published_at)}</span>
                      {tags.slice(0, 1).map((tag: string) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent content */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)] gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--purple)] flex-shrink-0" />
              Recent Content
            </h2>
            <Link href="/content" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">View all</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {content.length === 0 ? (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                <FileText className="w-10 h-10 text-[var(--purple)] opacity-30 mb-3" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No content generated yet</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-3">
                  Select news articles in the Pipeline and Monitus will draft compliance-checked newsletters, LinkedIn posts, and more.
                </p>
                <Link href="/pipeline">
                  <Button size="sm" variant="secondary">
                    Open Pipeline <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              content.map((item) => (
                <div key={item.id} className="p-3 sm:p-4 hover:bg-[var(--navy-lighter)] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <h3 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                      {item.title}
                    </h3>
                    <Badge
                      variant={item.compliance_status === 'passed' ? 'success' : item.compliance_status === 'warning' ? 'warning' : 'error'}
                      className="text-[11px] sm:text-xs w-fit"
                    >
                      {item.compliance_score}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-[11px] sm:text-xs">
                    <Badge variant="purple" className="text-[11px] sm:text-xs">{item.content_type}</Badge>
                    <span className="text-[var(--text-secondary)]">{formatTime(item.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
