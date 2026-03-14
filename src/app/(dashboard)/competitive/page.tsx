'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Target,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Clock,
  AlertCircle,
  BarChart3,
  Filter,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ShareOfVoice {
  [company: string]: {
    count: number;
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface TimelineEntry {
  date: string;
  mentions: Record<string, number>;
}

interface RecentMention {
  id: string;
  competitor_name: string;
  article_id: string;
  mention_context: string;
  sentiment: string;
  created_at: string;
  article_title?: string;
  article_source?: string;
}

interface CompetitiveData {
  competitors: string[];
  company_name: string;
  share_of_voice: ShareOfVoice;
  timeline: TimelineEntry[];
  recent_mentions: RecentMention[];
  article_count: number;
}

const TIME_RANGES = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-emerald-400',
  neutral: 'text-[var(--text-secondary)]',
  negative: 'text-red-400',
};

const SENTIMENT_BG: Record<string, string> = {
  positive: 'bg-emerald-500/10 border-emerald-500/20',
  neutral: 'bg-[var(--navy-lighter)] border-[var(--border)]',
  negative: 'bg-red-500/10 border-red-500/20',
};

export default function CompetitivePage() {
  const [data, setData] = useState<CompetitiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/competitive?range=${range}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load data');
        return;
      }
      setData(json);
    } catch {
      setError('Failed to load competitive data');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalMentions = data ? Object.values(data.share_of_voice).reduce((sum, v) => sum + v.count, 0) : 0;

  // Sort companies by mention count
  const sortedCompanies = data
    ? Object.entries(data.share_of_voice).sort(([, a], [, b]) => b.count - a.count)
    : [];

  const maxCount = sortedCompanies.length > 0 ? sortedCompanies[0][1].count : 1;

  // Find competitors with significantly more coverage than the user's company
  const alerts: string[] = [];
  if (data) {
    const ownCount = data.share_of_voice[data.company_name]?.count || 0;
    for (const [name, stats] of Object.entries(data.share_of_voice)) {
      if (name !== data.company_name && stats.count > ownCount * 2 && stats.count >= 3) {
        alerts.push(`${name} has ${stats.count} mentions vs your ${ownCount} — consider increasing your media presence.`);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Competitive Intelligence</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track competitor mentions in insurance news and compare share of voice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time range filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.id}
            onClick={() => setRange(tr.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              range === tr.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--navy-light)] border border-[var(--border)]'
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-[var(--text-secondary)]">Scanning articles for mentions...</span>
        </div>
      ) : data && data.competitors.length === 0 ? (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Competitors Configured</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Add competitors to your Messaging Bible to start tracking their share of voice in insurance news.
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Competitive alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {alert}
                </div>
              ))}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Total Mentions</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totalMentions}</p>
            </div>
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Companies Tracked</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{sortedCompanies.length}</p>
            </div>
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Articles Scanned</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{data.article_count}</p>
            </div>
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Your Mentions</p>
              <p className="text-2xl font-bold text-[var(--accent)]">{data.share_of_voice[data.company_name]?.count || 0}</p>
            </div>
          </div>

          {/* Share of Voice Chart */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              Share of Voice
            </h2>
            <div className="space-y-3">
              {sortedCompanies.map(([name, stats]) => {
                const isOwn = name === data.company_name;
                const percentage = totalMentions > 0 ? Math.round((stats.count / totalMentions) * 100) : 0;
                const barWidth = maxCount > 0 ? Math.max((stats.count / maxCount) * 100, 2) : 2;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isOwn ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                          {name}
                        </span>
                        {isOwn && <Badge variant="purple">You</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span>{stats.count} mention{stats.count !== 1 ? 's' : ''}</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                    </div>
                    <div className="h-6 bg-[var(--navy)] rounded-md overflow-hidden">
                      <div
                        className={`h-full rounded-md transition-all duration-500 ${
                          isOwn ? 'bg-[var(--accent)]' : 'bg-[var(--navy-lighter)]'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
              Sentiment Breakdown
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedCompanies.map(([name, stats]) => {
                const isOwn = name === data.company_name;
                const total = stats.count || 1;
                return (
                  <div key={name} className="bg-[var(--navy)] border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-sm font-medium ${isOwn ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                        {name}
                      </span>
                      {isOwn && <Badge variant="purple">You</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{Math.round((stats.positive / total) * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="text-[var(--text-secondary)]">{Math.round((stats.neutral / total) * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">{Math.round((stats.negative / total) * 100)}%</span>
                      </div>
                    </div>
                    {/* Sentiment bar */}
                    <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-[var(--navy-lighter)]">
                      {stats.positive > 0 && (
                        <div className="bg-emerald-400" style={{ width: `${(stats.positive / total) * 100}%` }} />
                      )}
                      {stats.neutral > 0 && (
                        <div className="bg-[var(--text-secondary)]/30" style={{ width: `${(stats.neutral / total) * 100}%` }} />
                      )}
                      {stats.negative > 0 && (
                        <div className="bg-red-400" style={{ width: `${(stats.negative / total) * 100}%` }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mention Timeline */}
          {data.timeline.length > 0 && (
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--accent)]" />
                Mention Timeline
              </h2>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 min-w-[600px] h-32">
                  {data.timeline.map((entry) => {
                    const dayTotal = Object.values(entry.mentions).reduce((sum, v) => sum + v, 0);
                    const maxDayTotal = Math.max(...data.timeline.map((t) => Object.values(t.mentions).reduce((s, v) => s + v, 0)), 1);
                    const barHeight = dayTotal > 0 ? Math.max((dayTotal / maxDayTotal) * 100, 4) : 0;
                    const hasOwnMention = (entry.mentions[data.company_name] || 0) > 0;
                    return (
                      <div key={entry.date} className="flex-1 flex flex-col items-center gap-1" title={`${entry.date}: ${dayTotal} mentions`}>
                        <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                          {barHeight > 0 && (
                            <div
                              className={`w-full rounded-t transition-all ${
                                hasOwnMention ? 'bg-[var(--accent)]' : 'bg-[var(--navy-lighter)]'
                              }`}
                              style={{ height: `${barHeight}%`, minHeight: '3px' }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[var(--text-secondary)] min-w-[600px]">
                  <span>{data.timeline[0]?.date}</span>
                  <span>{data.timeline[data.timeline.length - 1]?.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[var(--accent)]" />
                  <span>Includes your mentions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[var(--navy-lighter)]" />
                  <span>Competitors only</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Mentions */}
          {data.recent_mentions.length > 0 && (
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Recent Mentions</h2>
              <div className="space-y-3">
                {data.recent_mentions.map((mention) => {
                  const isOwn = mention.competitor_name === data.company_name;
                  return (
                    <div
                      key={mention.id}
                      className={`p-3 rounded-lg border ${SENTIMENT_BG[mention.sentiment] || SENTIMENT_BG.neutral}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isOwn ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                            {mention.competitor_name}
                          </span>
                          <Badge variant={mention.sentiment === 'positive' ? 'success' : mention.sentiment === 'negative' ? 'error' : 'default'}>
                            {mention.sentiment}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {new Date(mention.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      {mention.article_title && (
                        <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                          {mention.article_title}
                          {mention.article_source && <span className="font-normal text-[var(--text-secondary)]"> &middot; {mention.article_source}</span>}
                        </p>
                      )}
                      {mention.mention_context && (
                        <p className="text-xs text-[var(--text-secondary)] italic">
                          &ldquo;...{mention.mention_context}...&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
