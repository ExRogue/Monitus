'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap, Loader2, RefreshCw, ArrowRight,
  Zap, Shield, Activity, Minus, BarChart3,
  Globe, Target, Eye, MousePointerClick, Heart,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button';

type SubView = 'sources' | 'competitive' | 'recommendations';

interface SourceBreakdown {
  source: string;
  count: number;
  avg_fit: number;
}

interface CompetitorMention {
  context: string;
  count: number;
  themes: string[];
  sample_articles: string[];
}

interface Whitespace {
  theme: string;
  signal_count: number;
  avg_fit: number;
}

interface Signal {
  id: string;
  title: string;
  narrative_fit: number;
  urgency: number;
  why_it_matters?: string;
  themes: string[];
}

interface ReinforceItem {
  title: string;
  content_type: string;
  views: number;
  clicks: number;
  reactions: number;
}

interface ContentPerformance {
  title: string;
  content_type: string;
  channel: string;
  views: number;
  clicks: number;
  reactions: number;
  published_at: string;
}

interface LearningStats {
  has_narrative: boolean;
  summary?: {
    total_signals: number;
    avg_narrative_fit: number;
    act_now_count: number;
    monitor_count: number;
    reinforce_count: number;
    ignore_count: number;
  };
  source_breakdown?: SourceBreakdown[];
  competitor_mentions?: CompetitorMention[];
  whitespace?: Whitespace[];
  recommendations?: {
    act_now: Signal[];
    reinforce: ReinforceItem[];
    monitor: Signal[];
    ignore: Signal[];
  };
  content_performance?: ContentPerformance[];
}

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<SubView>('sources');
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learning/stats');
      if (!res.ok) throw new Error('Failed to load');
      const data: LearningStats = await res.json();
      setStats(data);
    } catch {
      setError('Failed to load learning data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const tabs: { key: SubView; label: string; icon: React.ReactNode }[] = [
    { key: 'sources', label: 'Source Mix', icon: <Globe className="w-3.5 h-3.5" /> },
    { key: 'competitive', label: 'Competitive Pressure', icon: <Target className="w-3.5 h-3.5" /> },
    { key: 'recommendations', label: 'Recommendations', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const hasData = stats?.has_narrative && (stats.summary?.total_signals ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[var(--accent)]" /> Learning
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            How your market intelligence is evolving over time
          </p>
        </div>
        <Button variant="ghost" onClick={loadStats} className="flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading intelligence data...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red-400">
          <AlertTriangle className="w-5 h-5 mr-2" /> {error}
        </div>
      ) : !stats?.has_narrative ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-10 text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-[var(--text-secondary)] mx-auto" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Set up your narrative first</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Learning tracks how well your signal intelligence performs over time. Create your narrative to start generating signals and tracking source performance.
          </p>
          <a
            href="/narrative"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mt-2"
          >
            Go to Narrative <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-10 text-center space-y-3">
          <Activity className="w-10 h-10 text-[var(--text-secondary)] mx-auto" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No signal data yet</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Your agents will track performance as you publish content. Check back after your first signals have been analysed.
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          {stats.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Signals analysed', value: stats.summary.total_signals },
                { label: 'Avg narrative fit', value: `${stats.summary.avg_narrative_fit}%` },
                { label: 'Sources tracked', value: stats.source_breakdown?.length ?? 0 },
                { label: 'Act now signals', value: stats.summary.act_now_count },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] p-4 text-center">
                  <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Source Mix */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Where your signals come from. Higher source diversity means more reliable market intelligence.
              </p>
              {(!stats.source_breakdown || stats.source_breakdown.length === 0) ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-8 text-center text-sm text-[var(--text-secondary)]">
                  No source data available yet. Sources will appear as signals are analysed.
                </div>
              ) : (
                <>
                  {stats.source_breakdown.map((src) => {
                    const maxCount = Math.max(...stats.source_breakdown!.map(s => s.count), 1);
                    const barWidth = (src.count / maxCount) * 100;
                    const fitColor = src.avg_fit >= 70 ? 'text-emerald-400' : src.avg_fit >= 40 ? 'text-amber-400' : 'text-red-400';

                    return (
                      <div key={src.source} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-4 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{src.source}</span>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-center">
                              <span className="text-sm font-bold text-[var(--text-primary)]">{src.count}</span>
                              <span className="text-xs text-[var(--text-secondary)] ml-1">signals</span>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${fitColor}`}>{src.avg_fit}%</span>
                              <span className="text-xs text-[var(--text-secondary)] ml-1">avg fit</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-[var(--navy-lighter)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Competitive Pressure */}
          {activeTab === 'competitive' && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Competitor activity detected in your signal analyses, and themes where competitors are silent.
              </p>

              {/* Active competitors */}
              {(!stats.competitor_mentions || stats.competitor_mentions.length === 0) ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-8 text-center text-sm text-[var(--text-secondary)]">
                  No competitor mentions detected yet. Competitor context will appear as your signals are analysed.
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-red-400" /> Competitor activity
                  </h3>
                  {stats.competitor_mentions.map((cm, i) => (
                    <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{cm.context}</p>
                        <span className="flex-shrink-0 text-xs font-bold text-[var(--text-secondary)] bg-[var(--navy-lighter)] px-2 py-1 rounded">
                          {cm.count}x
                        </span>
                      </div>
                      {cm.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cm.themes.map(t => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {cm.sample_articles.length > 0 && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          From: {cm.sample_articles.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Whitespace opportunities */}
              {stats.whitespace && stats.whitespace.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" /> Narrative whitespace
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Themes with good narrative fit where no competitor activity was detected.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {stats.whitespace.map((ws, i) => (
                      <div key={i} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{ws.theme}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                          <span>{ws.signal_count} signals</span>
                          <span className="text-emerald-400">{ws.avg_fit}% avg fit</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {/* Act Now */}
              <RecommendationSection
                title="Act Now"
                desc="High-fit signals with no content generated yet"
                icon={<Zap className="w-4 h-4 text-red-400" />}
                border="border-red-500/20"
                bg="bg-red-500/5"
                items={stats.recommendations?.act_now}
                renderItem={(signal: Signal) => (
                  <div key={signal.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Fit {signal.narrative_fit}% · Urgency {signal.urgency}
                        {signal.why_it_matters && ` · ${signal.why_it_matters.slice(0, 80)}${signal.why_it_matters.length > 80 ? '...' : ''}`}
                      </p>
                    </div>
                    <a
                      href="/opportunities"
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      Create content <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              />

              {/* Reinforce */}
              <RecommendationSection
                title="Reinforce"
                desc="Published content that performed well — keep the thread alive"
                icon={<Shield className="w-4 h-4 text-blue-400" />}
                border="border-blue-500/20"
                bg="bg-blue-500/5"
                items={stats.recommendations?.reinforce}
                renderItem={(item: ReinforceItem) => (
                  <div key={item.title} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {item.clicks}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {item.reactions}</span>
                      </div>
                    </div>
                    <a
                      href="/narrative"
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      View narrative <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              />

              {/* Monitor */}
              <RecommendationSection
                title="Monitor"
                desc="Building but not yet urgent — watch for inflection"
                icon={<Activity className="w-4 h-4 text-amber-400" />}
                border="border-amber-500/20"
                bg="bg-amber-500/5"
                items={stats.recommendations?.monitor}
                renderItem={(signal: Signal) => (
                  <div key={signal.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Fit {signal.narrative_fit}% · Urgency {signal.urgency}
                      </p>
                    </div>
                  </div>
                )}
              />

              {/* Ignore */}
              <RecommendationSection
                title="Ignore"
                desc="Low relevance or low narrative fit"
                icon={<Minus className="w-4 h-4 text-slate-400" />}
                border="border-slate-500/20"
                bg="bg-slate-500/5"
                items={stats.recommendations?.ignore}
                renderItem={(signal: Signal) => (
                  <div key={signal.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Fit {signal.narrative_fit}%
                        {signal.themes.length > 0 && ` · ${signal.themes.slice(0, 2).join(', ')}`}
                      </p>
                    </div>
                  </div>
                )}
              />

              {/* Content Performance */}
              {stats.content_performance && stats.content_performance.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[var(--accent)]" /> Published content performance
                  </h3>
                  {stats.content_performance.map((cp, i) => (
                    <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{cp.title}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {cp.content_type} · {cp.channel}
                            {cp.published_at && ` · ${new Date(cp.published_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-shrink-0">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {cp.views}</span>
                          <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {cp.clicks}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {cp.reactions}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function RecommendationSection({
  title,
  desc,
  icon,
  border,
  bg,
  items,
  renderItem,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
  items: any[] | undefined;
  renderItem: (item: any) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-xl border ${border} ${bg} p-5 space-y-3`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="text-xs text-[var(--text-secondary)] ml-1">— {desc}</span>
      </div>
      <div className="space-y-2">
        {items.map(renderItem)}
      </div>
    </div>
  );
}
