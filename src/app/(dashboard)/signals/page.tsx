'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio, Search, RefreshCw, ExternalLink, Bookmark, Target,
  Globe, AlertCircle, CheckCircle, Loader2, TrendingUp, TrendingDown,
  Minus, Plus, Rss, Trash2, X, ChevronDown, ChevronUp, Zap,
  Clock, Activity, BarChart3, Crosshair, ArrowRight, Sparkles,
  FileText,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type SubView = 'priority' | 'rivals' | 'sources';

interface AnalyzedSignal {
  id: string;
  company_id: string;
  article_id: string;
  narrative_fit: number;
  urgency: number;
  why_it_matters: string;
  why_it_matters_to_buyers: string;
  recommended_action: string;
  competitor_context: string;
  themes: string;
  created_at: string;
  // Joined article fields
  title: string;
  summary: string;
  source: string;
  source_url: string;
  category: string;
  tags: string;
  published_at: string;
}

interface Competitor {
  competitor_name: string;
  mention_context: string;
  sentiment: string;
  created_at: string;
}

interface CompetitorInsight {
  name: string;
  mention_count: number;
  themes: string[];
  positioning_angles: string[];
  recent_articles: Array<{
    title: string;
    source: string;
    published_at: string;
    competitor_context: string;
    narrative_fit: number;
  }>;
}

interface WhitespaceItem {
  theme: string;
  signal_count: number;
}

interface RivalsData {
  insights: CompetitorInsight[];
  whitespace: WhitespaceItem[];
  total_analyses_with_competitor_context: number;
}

interface Feed {
  id: string;
  url: string;
  name: string;
  category: string;
  status: string;
  last_fetched_at: string | null;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Internal', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  1: { label: 'Regulatory', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  2: { label: 'Trade Press', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  3: { label: 'Competitor/Buyer', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  4: { label: 'Custom RSS', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  act_now: { label: 'Act Now', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  monitor: { label: 'Monitor', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  reinforce: { label: 'Reinforce', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  ignore: { label: 'Ignore', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

function parseThemes(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function urgencyLabel(score: number): { text: string; color: string } {
  if (score >= 70) return { text: 'High urgency', color: 'text-red-400 bg-red-400/10 border-red-400/20' };
  if (score >= 40) return { text: 'Medium urgency', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  return { text: 'Low urgency', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
}

export default function SignalsPage() {
  const [activeTab, setActiveTab] = useState<SubView>('priority');
  const [signals, setSignals] = useState<AnalyzedSignal[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [rivalsData, setRivalsData] = useState<RivalsData | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingFeed, setAddingFeed] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedSaving, setFeedSaving] = useState(false);
  const [hasNarrative, setHasNarrative] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Check if user has a narrative
  useEffect(() => {
    async function checkNarrative() {
      try {
        const res = await fetch('/api/messaging-bible');
        if (res.ok) {
          const data = await res.json();
          const bible = data.bible;
          // Consider narrative complete if it has at least elevator_pitch or company_description
          const hasContent = bible && (bible.elevator_pitch || bible.company_description || bible.messaging_pillars);
          setHasNarrative(!!hasContent);
        } else {
          setHasNarrative(false);
        }
      } catch {
        setHasNarrative(false);
      }
    }
    checkNarrative();
  }, []);

  const loadPrioritySignals = useCallback(async () => {
    setLoading(true);
    try {
      // First try to get cached analyses
      const res = await fetch('/api/signals/analyze');
      if (res.ok) {
        const data = await res.json();
        setSignals(data.analyses || []);
        setPendingCount(data.pending_count || 0);

        // If there are pending articles, trigger analysis
        if (data.pending_count > 0 && data.analyses.length === 0) {
          setAnalyzing(true);
          try {
            const analyzeRes = await fetch('/api/signals/analyze', { method: 'POST' });
            if (analyzeRes.ok) {
              const analyzeData = await analyzeRes.json();
              setSignals(analyzeData.analyses || []);
              // Check if there are more to analyze
              if (!analyzeData.all_analyzed) {
                setPendingCount(Math.max(0, (data.pending_count || 0) - (analyzeData.analyzed_count || 0)));
              } else {
                setPendingCount(0);
              }
            }
          } finally {
            setAnalyzing(false);
          }
        }
      }
    } catch {
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/signals/analyze', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSignals(data.analyses || []);
        if (data.all_analyzed) {
          setPendingCount(0);
        } else {
          setPendingCount(prev => Math.max(0, prev - (data.analyzed_count || 0)));
        }
      }
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const loadRivals = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch AI-driven insights from signal_analyses
      const insightsRes = await fetch('/api/competitive/insights');
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setRivalsData(data);
      } else {
        setRivalsData(null);
      }
    } catch {
      setRivalsData(null);
    }
    finally { setLoading(false); }
  }, []);

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feeds');
      if (res.ok) {
        const data = await res.json();
        setFeeds(data.feeds || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (hasNarrative === null) return; // Still checking
    if (!hasNarrative) return; // No narrative, show gate

    if (activeTab === 'priority') loadPrioritySignals();
    else if (activeTab === 'rivals') loadRivals();
    else if (activeTab === 'sources') loadSources();
  }, [activeTab, hasNarrative, loadPrioritySignals, loadRivals, loadSources]);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;
    setFeedSaving(true);
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feedUrl.trim(), name: feedName.trim() || feedUrl.trim(), category: 'custom' }),
      });
      if (res.ok) {
        setFeedUrl(''); setFeedName(''); setAddingFeed(false);
        loadSources();
      }
    } finally { setFeedSaving(false); }
  };

  const handleDeleteFeed = async (id: string) => {
    await fetch(`/api/feeds?id=${id}`, { method: 'DELETE' });
    loadSources();
  };

  const filteredSignals = signals.filter(s =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.summary?.toLowerCase().includes(search.toLowerCase())
  );

  // Only show signals with narrative_fit > 30 in Priority tab
  const prioritySignals = filteredSignals.filter(s => s.narrative_fit > 30);

  const tabs: { key: SubView; label: string; icon: React.ReactNode }[] = [
    { key: 'priority', label: 'Priority Signals', icon: <Zap className="w-4 h-4" /> },
    { key: 'rivals', label: 'Rivals', icon: <Crosshair className="w-4 h-4" /> },
    { key: 'sources', label: 'Sources', icon: <Rss className="w-4 h-4" /> },
  ];

  // Still checking narrative status
  if (hasNarrative === null) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-center py-24 text-[var(--text-secondary)]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      </div>
    );
  }

  // Gate: No narrative defined
  if (!hasNarrative) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Define your Narrative first</h1>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Signals are scored against your company's narrative -- who you are, who you sell to, and what you stand for.
              Complete your Narrative so we can identify which market signals matter to you.
            </p>
          </div>
          <a
            href="/narrative"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-medium text-sm hover:bg-[var(--accent)]/90 transition-colors"
          >
            Set up your Narrative <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="w-6 h-6 text-[var(--accent)]" /> Market Monitor
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Scanning the market and scoring signals against your Narrative
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (activeTab === 'priority') {
              if (pendingCount > 0) {
                triggerAnalysis();
              } else {
                loadPrioritySignals();
              }
            }
          }}
          disabled={analyzing}
          className="flex items-center gap-1.5 text-sm"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {analyzing ? 'Analysing...' : pendingCount > 0 ? `Analyse ${pendingCount} more` : 'Refresh'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Priority Signals */}
      {activeTab === 'priority' && (
        <div className="space-y-4">
          {pendingCount > 0 && !analyzing && (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
              <Activity className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium text-[var(--accent)]">{pendingCount} new article{pendingCount !== 1 ? 's' : ''} to analyse</span>
                <span className="text-[var(--accent)]/80"> -- click Refresh to score them against your Narrative.</span>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search signals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-md pl-9 pr-4 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {loading || analyzing ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">{analyzing ? 'Your agents are analysing recent market signals...' : 'Loading signals...'}</p>
              {analyzing && <p className="text-xs text-[var(--text-secondary)]/60">This may take a few seconds</p>}
            </div>
          ) : prioritySignals.length === 0 ? (
            signals.length > 0 ? (
              <div className="text-center py-16 space-y-3">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 opacity-60" />
                <p className="font-medium text-[var(--text-primary)]">No high-priority signals right now</p>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                  {signals.length} article{signals.length !== 1 ? 's have' : ' has'} been analysed but none scored above the priority threshold for your Narrative.
                </p>
              </div>
            ) : (
              <DrySpellState />
            )
          ) : (
            prioritySignals.map(signal => (
              <AnalyzedSignalCard
                key={signal.id}
                signal={signal}
                expanded={expanded === signal.id}
                onToggleExpand={() => setExpanded(expanded === signal.id ? null : signal.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Themes */}
      {/* Rivals */}
      {activeTab === 'rivals' && (
        <RivalsView rivalsData={rivalsData} loading={loading} hasNarrative={!!hasNarrative} />
      )}

      {/* Sources */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Built-in tiers */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Source Architecture</h3>
            {[0, 1, 2, 3].map(tier => (
              <div key={tier} className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border whitespace-nowrap flex-shrink-0 ${TIER_LABELS[tier].color}`}>
                    Tier {tier}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{TIER_LABELS[tier].label}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {tier === 0 && 'Internal documents, pitch decks, call transcripts'}
                      {tier === 1 && 'FCA, PRA, Lloyd\'s, EIOPA, Bank of England, IAIS, Bermuda BMA, APRA, OSFI — US: NAIC, NY DFS, CA DOI, TX DOI, FL OIR, NIST, Treasury FIO'}
                      {tier === 2 && 'Insurance Times, The Insurer, Artemis, Insurance Journal, Reinsurance News, InsurTech News, PropertyCasualty360, AM Best, Intelligent Insurer, The Insurance Insider'}
                      {tier === 3 && 'Competitor websites, buyer-side press, industry associations'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap flex-shrink-0">Built-in</span>
              </div>
            ))}
          </div>

          {/* Custom feeds */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Custom RSS Feeds <span className="text-[var(--text-secondary)]/60 font-normal normal-case">(Tier 4)</span>
              </h3>
              <Button variant="secondary" onClick={() => setAddingFeed(!addingFeed)} className="text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add feed
              </Button>
            </div>

            {addingFeed && (
              <form onSubmit={handleAddFeed} className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    placeholder="https://example.com/feed.rss"
                    value={feedUrl}
                    onChange={e => setFeedUrl(e.target.value)}
                    required
                    className="px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    placeholder="Feed name (optional)"
                    value={feedName}
                    onChange={e => setFeedName(e.target.value)}
                    className="px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={feedSaving} className="text-sm">
                    {feedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add feed'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setAddingFeed(false)} className="text-sm">Cancel</Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading feeds...
              </div>
            ) : feeds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-secondary)]">
                No custom feeds yet. Add an RSS feed to supplement built-in sources.
              </div>
            ) : (
              feeds.map(feed => (
                <div key={feed.id} className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${TIER_LABELS[4].color}`}>Tier 4</span>
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{feed.name}</p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{feed.url}</p>
                    {feed.last_fetched_at && (
                      <p className="text-xs text-[var(--text-secondary)]/60 mt-0.5">
                        Last fetched: {new Date(feed.last_fetched_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="text-[var(--text-secondary)] hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyzedSignalCard({ signal, expanded, onToggleExpand }: {
  signal: AnalyzedSignal;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const urg = urgencyLabel(signal.urgency);
  const action = ACTION_LABELS[signal.recommended_action] || ACTION_LABELS.monitor;
  const themes = parseThemes(signal.themes);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'signal-led',
          title: signal.title,
          summary: signal.summary,
          why_it_matters: signal.why_it_matters,
          why_it_matters_to_buyers: signal.why_it_matters_to_buyers,
          recommended_format: signal.recommended_action === 'act_now' ? 'LinkedIn post + trade media pitch' : 'LinkedIn thought leadership',
          urgency_score: signal.urgency,
          opportunity_score: signal.narrative_fit,
          stage: 'analyse',
        }),
      });
      router.push('/opportunities');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${urg.color}`}>
                {urg.text}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${action.color}`}>
                {action.label}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded border border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent)]/5">
                {signal.narrative_fit}% fit
              </span>
              {signal.competitor_context && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" /> Rival alert
                </span>
              )}
              {signal.source && (
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {signal.source}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">{signal.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{signal.why_it_matters || signal.summary}</p>
            {themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {themes.map((theme, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--navy-lighter)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {theme}
                  </span>
                ))}
              </div>
            )}
            {signal.competitor_context && !expanded && (
              <div className="flex items-start gap-2 mt-1 rounded-lg bg-amber-400/5 border border-amber-400/20 px-3 py-2">
                <Crosshair className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">{signal.competitor_context}</p>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-bold text-[var(--accent)]">{signal.narrative_fit}</p>
            <p className="text-xs text-[var(--text-secondary)]">fit</p>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Why it matters</p>
              <p className="text-sm text-[var(--text-primary)]">{signal.why_it_matters}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Why it matters to your buyers</p>
              <p className="text-sm text-[var(--text-primary)]">{signal.why_it_matters_to_buyers}</p>
            </div>
            {signal.competitor_context && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Competitor context</p>
                <p className="text-sm text-[var(--text-primary)]">{signal.competitor_context}</p>
              </div>
            )}
            {signal.summary && signal.why_it_matters && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Article summary</p>
                <p className="text-sm text-[var(--text-primary)]">{signal.summary}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={generating}
            className="text-sm flex items-center gap-1.5"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            Generate opportunity
          </Button>
          {signal.source_url && signal.source_url !== '#' && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] border border-[var(--border)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Source
            </a>
          )}
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2"
          >
            {expanded ? <><ChevronUp className="w-4 h-4" /> Less</> : <><ChevronDown className="w-4 h-4" /> Full analysis</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function RivalsView({ rivalsData, loading, hasNarrative }: { rivalsData: RivalsData | null; loading: boolean; hasNarrative: boolean }) {
  const [expandedRival, setExpandedRival] = useState<string | null>(null);

  if (!hasNarrative) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
          <FileText className="w-8 h-8 text-[var(--accent)]" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Define your Narrative first</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
            Rival intelligence is powered by your Narrative. Define your positioning and competitors so we can track competitive movements.
          </p>
        </div>
        <a
          href="/narrative"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-medium text-sm hover:bg-[var(--accent)]/90 transition-colors"
        >
          Set up your Narrative <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analysing competitive landscape...
      </div>
    );
  }

  if (!rivalsData || (rivalsData.insights.length === 0 && rivalsData.whitespace.length === 0)) {
    return (
      <div className="text-center py-16 space-y-3">
        <Crosshair className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
        <p className="font-medium text-[var(--text-secondary)]">No competitor intelligence yet</p>
        <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">
          Competitive insights build up as signals are analysed. Add competitors in{' '}
          <a href="/narrative" className="text-[var(--accent)] hover:underline">Narrative settings</a>{' '}
          and analyse more signals to see rival activity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitor cards */}
      {rivalsData.insights.map((insight) => {
        const isExpanded = expandedRival === insight.name;
        return (
          <div key={insight.name} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{insight.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">
                      {insight.mention_count} mention{insight.mention_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Themes this competitor is active in */}
                  {insight.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {insight.themes.map((theme, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--navy-lighter)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-2xl font-bold text-amber-400">{insight.mention_count}</p>
                  <p className="text-xs text-[var(--text-secondary)]">signals</p>
                </div>
              </div>

              {/* AI positioning assessment */}
              {insight.positioning_angles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">AI positioning assessment</p>
                  {insight.positioning_angles.slice(0, isExpanded ? 5 : 2).map((angle, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-400/5 border border-amber-400/15 px-3 py-2">
                      <BarChart3 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{angle}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent articles (expanded) */}
              {isExpanded && insight.recent_articles.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Recent articles mentioning {insight.name}</p>
                  {insight.recent_articles.map((article, i) => (
                    <div key={i} className="rounded-lg bg-[var(--navy-lighter)] border border-[var(--border)] px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{article.title}</p>
                        <span className="text-xs text-[var(--accent)] font-medium whitespace-nowrap">{article.narrative_fit}% fit</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        {article.source && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {article.source}</span>}
                        {article.published_at && <span>{new Date(article.published_at).toLocaleDateString()}</span>}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{article.competitor_context}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setExpandedRival(isExpanded ? null : insight.name)}
                className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {isExpanded ? <><ChevronUp className="w-4 h-4" /> Less</> : <><ChevronDown className="w-4 h-4" /> Full intel</>}
              </button>
            </div>
          </div>
        );
      })}

      {/* Whitespace section */}
      {rivalsData.whitespace.length > 0 && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Narrative whitespace</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Themes where your Narrative fits but competitors are silent -- potential positioning opportunities.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rivalsData.whitespace.map((w, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--navy-light)] border border-[var(--border)] px-3 py-2">
                <span className="text-sm text-[var(--text-primary)]">{w.theme}</span>
                <span className="text-xs text-emerald-400 font-medium">{w.signal_count} signal{w.signal_count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DrySpellState() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--navy-light)] p-8 text-center space-y-4">
      <Sparkles className="w-10 h-10 mx-auto text-[var(--accent)] opacity-60" />
      <div>
        <p className="font-semibold text-[var(--text-primary)]">No signals analysed yet</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Your agents will analyse recent market articles against your Narrative. Check back shortly, or add RSS sources in the Sources tab.
        </p>
      </div>
      <a href="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
        Add a manual topic in Opportunities <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
