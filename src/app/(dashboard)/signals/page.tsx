'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Radio, Search, RefreshCw, ExternalLink, Bookmark, Target,
  Globe, AlertCircle, CheckCircle, Loader2, TrendingUp, TrendingDown,
  Minus, Plus, Rss, Trash2, X, ChevronDown, ChevronUp, Zap,
  Clock, Activity, BarChart3, Crosshair, Layers, ArrowRight, Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type SubView = 'priority' | 'themes' | 'rivals' | 'sources';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  category: string;
  tags: string;
  published_at: string;
}

interface Signal {
  id: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  whyItMattersToBuyers: string;
  competitorActivity: 'yes' | 'no' | 'unknown';
  shouldRespond: 'yes' | 'no' | 'watch';
  responseType: string;
  urgency: 'high' | 'medium' | 'low';
  sources: NewsArticle[];
  saved: boolean;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  classification: string;
  score: number;
  momentum_7d: number;
  momentum_30d: number;
  momentum_90d: number;
  momentum_180d: number;
  competitor_activity: number;
  icp_relevance: number;
  narrative_fit: number;
  recommended_action: string;
}

interface Competitor {
  competitor_name: string;
  mention_context: string;
  sentiment: string;
  created_at: string;
}

interface Feed {
  id: string;
  url: string;
  name: string;
  category: string;
  status: string;
  last_fetched_at: string | null;
}

const DEMO_SIGNALS: Signal[] = [
  {
    id: 'demo-1',
    headline: "Lloyd's publishes updated cyber war exclusion model clauses",
    summary: "The Lloyd's Market Association released revised LMA5567 cyber war exclusion clauses, with mandatory adoption for all Lloyd's syndicates from April 2026.",
    whyItMatters: "This sets the floor for market-wide cyber war exclusion language, affecting how all participants define and price cyber war risk.",
    whyItMattersToBuyers: "Your buyers (carriers, MGAs, syndicates) will need to update policy wordings, explain the change to insureds, and assess aggregation exposure under the new definitions.",
    competitorActivity: 'yes',
    shouldRespond: 'yes',
    responseType: 'LinkedIn post + trade media pitch',
    urgency: 'high',
    sources: [],
    saved: false,
  },
  {
    id: 'demo-2',
    headline: "FCA consultation: AI transparency requirements for underwriting models",
    summary: "The FCA issued CP26/7 proposing that firms using AI in underwriting decisions must be able to explain material decisions to customers and regulators.",
    whyItMatters: "Creates compliance requirements that will reshape how carriers and MGAs deploy and document AI underwriting tools.",
    whyItMattersToBuyers: "Buyers who use or are evaluating AI underwriting tools need to understand their explainability obligations before the Q3 deadline.",
    competitorActivity: 'unknown',
    shouldRespond: 'yes',
    responseType: 'Email commentary + talking points',
    urgency: 'high',
    sources: [],
    saved: false,
  },
  {
    id: 'demo-3',
    headline: "Cat bond market hits record $48bn — cyber ILS emerging",
    summary: "Insurance-linked securities hit $48bn outstanding, with the first dedicated cyber cat bonds placed, signalling growing investor appetite for cyber risk transfer.",
    whyItMatters: "Cyber ILS becoming viable changes capital options for carriers and MGAs writing cyber risk, with implications for pricing and capacity.",
    whyItMattersToBuyers: "Relevant to any buyer thinking about alternative capital, reinsurance structure, or how market capacity for cyber may expand.",
    competitorActivity: 'no',
    shouldRespond: 'watch',
    responseType: 'LinkedIn thought leadership',
    urgency: 'medium',
    sources: [],
    saved: false,
  },
];

const DEMO_THEMES: Theme[] = [
  { id: 't1', name: 'AI governance in underwriting', description: 'Explainability, auditability, and model governance requirements', classification: 'Building', score: 82, momentum_7d: 12, momentum_30d: 35, momentum_90d: 68, momentum_180d: 45, competitor_activity: 72, icp_relevance: 88, narrative_fit: 76, recommended_action: 'act_now' },
  { id: 't2', name: 'Cyber war exclusion evolution', description: 'Lloyd\'s LMA clauses and market-wide war exclusion definitions', classification: 'Immediate', score: 91, momentum_7d: 24, momentum_30d: 41, momentum_90d: 38, momentum_180d: 22, competitor_activity: 85, icp_relevance: 94, narrative_fit: 82, recommended_action: 'act_now' },
  { id: 't3', name: 'Delegated authority digitisation', description: 'Coverholder portals, automated binding, digital bordereaux', classification: 'Established', score: 65, momentum_7d: 8, momentum_30d: 22, momentum_90d: 55, momentum_180d: 70, competitor_activity: 60, icp_relevance: 78, narrative_fit: 71, recommended_action: 'reinforce' },
  { id: 't4', name: 'Parametric insurance growth', description: 'Index-based triggers, rapid claims, climate parametrics', classification: 'Building', score: 58, momentum_7d: 15, momentum_30d: 28, momentum_90d: 42, momentum_180d: 30, competitor_activity: 45, icp_relevance: 62, narrative_fit: 55, recommended_action: 'monitor' },
];

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Internal', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  1: { label: 'Regulatory', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  2: { label: 'Trade Press', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  3: { label: 'Competitor/Buyer', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  4: { label: 'Custom RSS', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  Immediate: 'text-red-400 bg-red-400/10 border-red-400/20',
  Building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Established: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Structural: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  act_now: { label: 'Act Now', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  monitor: { label: 'Monitor', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  reinforce: { label: 'Reinforce', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  ignore: { label: 'Ignore', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

const URGENCY_COLORS = {
  high: 'text-red-400 bg-red-400/10 border-red-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const RESPOND_COLORS = {
  yes: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  no: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  watch: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

function articlesToSignals(articles: NewsArticle[]): Signal[] {
  if (!articles.length) return DEMO_SIGNALS;
  return articles.slice(0, 10).map((a, i) => ({
    id: a.id,
    headline: a.title,
    summary: a.summary || 'No summary available.',
    whyItMatters: 'This development may affect your market positioning and buyer conversations.',
    whyItMattersToBuyers: 'Buyers in your target segments will be watching this space.',
    competitorActivity: (['yes', 'no', 'unknown'] as const)[i % 3],
    shouldRespond: (['yes', 'watch', 'no'] as const)[i % 3],
    responseType: ['LinkedIn post', 'Email commentary', 'Trade media pitch'][i % 3],
    urgency: (['high', 'medium', 'low'] as const)[i % 3],
    sources: [a],
    saved: false,
  }));
}

export default function SignalsPage() {
  const [activeTab, setActiveTab] = useState<SubView>('priority');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingFeed, setAddingFeed] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedSaving, setFeedSaving] = useState(false);

  const loadPrioritySignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news?limit=20');
      if (res.ok) {
        const data = await res.json();
        setSignals(articlesToSignals(data.articles || []));
      } else {
        setSignals(DEMO_SIGNALS);
      }
    } catch {
      setSignals(DEMO_SIGNALS);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/themes');
      if (res.ok) {
        const data = await res.json();
        setThemes(data.themes?.length ? data.themes : DEMO_THEMES);
      } else {
        setThemes(DEMO_THEMES);
      }
    } catch {
      setThemes(DEMO_THEMES);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRivals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitive');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.mentions || []);
      }
    } catch {}
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
    if (activeTab === 'priority') loadPrioritySignals();
    else if (activeTab === 'themes') loadThemes();
    else if (activeTab === 'rivals') loadRivals();
    else if (activeTab === 'sources') loadSources();
  }, [activeTab, loadPrioritySignals, loadThemes, loadRivals, loadSources]);

  const toggleSave = (id: string) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, saved: !s.saved } : s));
  };

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
    !search || s.headline.toLowerCase().includes(search.toLowerCase()) || s.summary.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: SubView; label: string; icon: React.ReactNode }[] = [
    { key: 'priority', label: 'Priority Signals', icon: <Zap className="w-4 h-4" /> },
    { key: 'themes', label: 'Themes', icon: <Layers className="w-4 h-4" /> },
    { key: 'rivals', label: 'Rivals', icon: <Crosshair className="w-4 h-4" /> },
    { key: 'sources', label: 'Sources', icon: <Rss className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="w-6 h-6 text-[var(--accent)]" /> Signals
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Market intelligence synthesised into actionable developments
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (activeTab === 'priority') loadPrioritySignals();
            else if (activeTab === 'themes') loadThemes();
          }}
          className="flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
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

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading signals...
            </div>
          ) : filteredSignals.length === 0 ? (
            <DrySpellState />
          ) : (
            filteredSignals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                expanded={expanded === signal.id}
                onToggleExpand={() => setExpanded(expanded === signal.id ? null : signal.id)}
                onToggleSave={() => toggleSave(signal.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Themes */}
      {activeTab === 'themes' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading themes...
            </div>
          ) : themes.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-secondary)]">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No themes tracked yet</p>
              <p className="text-sm mt-1">Themes build up as signals are processed over time.</p>
            </div>
          ) : (
            themes.map(theme => (
              <ThemeCard key={theme.id} theme={theme} />
            ))
          )}
        </div>
      )}

      {/* Rivals */}
      {activeTab === 'rivals' && (
        <RivalsView competitors={competitors} loading={loading} />
      )}

      {/* Sources */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Built-in tiers */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Source Architecture</h3>
            {[0, 1, 2, 3].map(tier => (
              <div key={tier} className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${TIER_LABELS[tier].color}`}>
                    Tier {tier}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{TIER_LABELS[tier].label}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {tier === 0 && 'Internal documents, pitch decks, call transcripts'}
                      {tier === 1 && 'FCA, PRA, Lloyd\'s, EIOPA, NAIC regulatory sources'}
                      {tier === 2 && 'Insurance Times, The Insurer, Artemis, Insurance Journal'}
                      {tier === 3 && 'Competitor websites, buyer-side press, industry associations'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Built-in</span>
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

function SignalCard({ signal, expanded, onToggleExpand, onToggleSave }: {
  signal: Signal;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSave: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'signal-led',
          title: signal.headline,
          summary: signal.summary,
          why_it_matters: signal.whyItMatters,
          why_it_matters_to_buyers: signal.whyItMattersToBuyers,
          recommended_format: signal.responseType,
          urgency_score: signal.urgency === 'high' ? 85 : signal.urgency === 'medium' ? 55 : 30,
          opportunity_score: 70,
          stage: 'analyse',
        }),
      });
      window.location.href = '/opportunities';
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
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${URGENCY_COLORS[signal.urgency]}`}>
                {signal.urgency.charAt(0).toUpperCase() + signal.urgency.slice(1)} urgency
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${RESPOND_COLORS[signal.shouldRespond]}`}>
                {signal.shouldRespond === 'yes' ? 'Respond' : signal.shouldRespond === 'watch' ? 'Watch' : 'Not urgent'}
              </span>
              {signal.competitorActivity === 'yes' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">
                  Competitors active
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">{signal.headline}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{signal.summary}</p>
          </div>
          <button
            onClick={onToggleSave}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${signal.saved ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'}`}
          >
            <Bookmark className="w-4 h-4" fill={signal.saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Why it matters</p>
              <p className="text-sm text-[var(--text-primary)]">{signal.whyItMatters}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Why it matters to your buyers</p>
              <p className="text-sm text-[var(--text-primary)]">{signal.whyItMattersToBuyers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Recommended response</p>
              <p className="text-sm text-[var(--text-primary)]">{signal.responseType}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Competitor activity</p>
              <p className="text-sm text-[var(--text-primary)] capitalize">{signal.competitorActivity}</p>
            </div>
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
          {signal.sources[0]?.source_url && signal.sources[0].source_url !== '#' && (
            <a
              href={signal.sources[0].source_url}
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

function ThemeCard({ theme }: { theme: Theme }) {
  const maxMomentum = Math.max(theme.momentum_7d, theme.momentum_30d, theme.momentum_90d, theme.momentum_180d, 1);
  const action = ACTION_LABELS[theme.recommended_action] || ACTION_LABELS.monitor;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${CLASSIFICATION_COLORS[theme.classification] || CLASSIFICATION_COLORS.Building}`}>
              {theme.classification}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${action.color}`}>
              {action.label}
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{theme.name}</h3>
          {theme.description && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{theme.description}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-[var(--accent)]">{Math.round(theme.score)}</p>
          <p className="text-xs text-[var(--text-secondary)]">score</p>
        </div>
      </div>

      {/* Momentum bars */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Momentum</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '7d', value: theme.momentum_7d },
            { label: '30d', value: theme.momentum_30d },
            { label: '90d', value: theme.momentum_90d },
            { label: '180d', value: theme.momentum_180d },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="h-12 bg-[var(--navy-lighter)] rounded-sm overflow-hidden flex items-end">
                <div
                  className="w-full bg-[var(--accent)] rounded-sm transition-all"
                  style={{ height: `${Math.round((value / maxMomentum) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{label}</p>
              <p className="text-xs font-medium text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
        {[
          { label: 'ICP Relevance', value: theme.icp_relevance },
          { label: 'Narrative Fit', value: theme.narrative_fit },
          { label: 'Competitor Activity', value: theme.competitor_activity },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-lg font-bold text-[var(--text-primary)]">{Math.round(value)}</p>
            <p className="text-xs text-[var(--text-secondary)]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RivalsView({ competitors, loading }: { competitors: Competitor[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading competitive data...
      </div>
    );
  }

  if (!competitors.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Crosshair className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
        <p className="font-medium text-[var(--text-secondary)]">No competitor data yet</p>
        <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">
          Add your competitors in{' '}
          <a href="/narrative" className="text-[var(--accent)] hover:underline">Narrative settings</a>{' '}
          to start tracking their narrative movements.
        </p>
      </div>
    );
  }

  // Group by competitor name
  const grouped = competitors.reduce<Record<string, Competitor[]>>((acc, c) => {
    acc[c.competitor_name] = acc[c.competitor_name] || [];
    acc[c.competitor_name].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([name, mentions]) => {
        const sentiments = mentions.map(m => m.sentiment);
        const dominant = sentiments.sort((a, b) =>
          sentiments.filter(s => s === b).length - sentiments.filter(s => s === a).length
        )[0];
        return (
          <div key={name} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{name}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                dominant === 'positive' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                dominant === 'negative' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                'text-slate-400 bg-slate-400/10 border-slate-400/20'
              }`}>
                {mentions.length} mention{mentions.length !== 1 ? 's' : ''} · {dominant}
              </span>
            </div>
            <div className="space-y-2">
              {mentions.slice(0, 3).map((m, i) => (
                <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {m.mention_context}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DrySpellState() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--navy-light)] p-8 text-center space-y-4">
      <Sparkles className="w-10 h-10 mx-auto text-[var(--accent)] opacity-60" />
      <div>
        <p className="font-semibold text-[var(--text-primary)]">No priority signals right now</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">There are 3 ways to move forward:</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
        {[
          { label: 'A', title: 'Evergreen topics', desc: 'Draw from your Narrative to create timeless content your buyers care about.' },
          { label: 'B', title: 'Extend the window', desc: 'Broaden the time frame to surface recent signals you can still credibly respond to.' },
          { label: 'C', title: 'Join a conversation', desc: 'Add your perspective to an ongoing market debate. You don\'t need a fresh angle.' },
        ].map(option => (
          <div key={option.label} className="rounded-lg border border-[var(--border)] p-4 space-y-1.5">
            <span className="text-xs font-bold text-[var(--accent)] uppercase">Option {option.label}</span>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{option.title}</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{option.desc}</p>
          </div>
        ))}
      </div>
      <a href="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
        Add a manual topic in Opportunities <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
