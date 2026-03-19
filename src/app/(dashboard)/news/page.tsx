'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Newspaper,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ExternalLink,
  Tag,
  Globe,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Eye,
  Trash2,
  Check,
  Lightbulb,
  Linkedin,
  Mail,
  Megaphone,
  Copy,
  Loader2,
  BarChart3,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { MessagingBibleNudge } from '@/components/OnboardingChecklist';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  source_url: string;
  category: string;
  tags: string;
  published_at: string;
}

interface ContentAngle {
  type: string;
  headline: string;
  angle: string;
  channel: string;
  spokesperson_quote: string;
}

interface NewsValueScore {
  name: string;
  score: number;
  rationale: string;
}

interface AnalysisData {
  newsValues: NewsValueScore[];
  angles: ContentAngle[];
  relevanceScore: number;
}

interface DrySpellSuggestion {
  id: string;
  type: 'evergreen' | 'thought_leadership' | 'event_based' | 'trend_analysis' | 'hot_take';
  title: string;
  description: string;
  suggestedChannel: string;
}

const SUGGESTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  evergreen: { label: 'Evergreen', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  thought_leadership: { label: 'Thought Leadership', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  event_based: { label: 'Event-Based', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  trend_analysis: { label: 'Trend Analysis', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  hot_take: { label: 'Hot Take', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
};

const TIME_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: '24h', label: 'Last 24h' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
];

const CHANNEL_ICONS: Record<string, any> = {
  linkedin: Linkedin,
  email: Mail,
  trade_media: Megaphone,
};

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  email: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  trade_media: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'reinsurance', label: 'Reinsurance' },
  { id: 'ils', label: 'ILS' },
  { id: 'uk_market', label: 'UK Market' },
  { id: 'specialty', label: 'Specialty' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'general', label: 'General' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'source', label: 'By source' },
];

const SOURCE_COLORS: Record<string, string> = {
  'Insurance Journal': 'text-blue-400',
  'Reinsurance News': 'text-teal-400',
  'Artemis': 'text-cyan-400',
  'Insurance Times': 'text-amber-400',
  'The Insurer': 'text-emerald-400',
  'Commercial Risk': 'text-rose-400',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRefreshTime(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const ITEMS_PER_PAGE = 15;

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshResult, setRefreshResult] = useState<{ fetched: number; errors: string[] } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [angles, setAngles] = useState<Record<string, ContentAngle[]>>({});
  const [analysisData, setAnalysisData] = useState<Record<string, AnalysisData>>({});
  const [anglesLoading, setAnglesLoading] = useState<string | null>(null);
  const [anglesOpen, setAnglesOpen] = useState<string | null>(null);
  const [copiedAngle, setCopiedAngle] = useState<string | null>(null);
  const [drySpellSuggestions, setDrySpellSuggestions] = useState<DrySpellSuggestion[]>([]);
  const [drySpellLoading, setDrySpellLoading] = useState(false);
  const [isDrySpell, setIsDrySpell] = useState(false);

  // Debounce search input so we don't refetch on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchArticles = useCallback(async () => {
    setError('');
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (activeCategory !== 'all' && !debouncedSearch) params.set('category', activeCategory);
    if (timeFilter !== 'all') params.set('timeframe', timeFilter);
    params.set('limit', '50');

    const res = await fetch(`/api/news?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403) {
        setError('You\u2019ve reached your article viewing limit. Upgrade your plan to continue browsing news.');
      } else {
        setError(data.error || 'Failed to load news articles');
      }
      setArticles([]);
      return;
    }
    setArticles(data.articles || []);
  }, [debouncedSearch, activeCategory, timeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchArticles().finally(() => setLoading(false));
  }, [fetchArticles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch('/api/news', { method: 'POST' });
      const data = await res.json();
      setRefreshResult(data);
      setLastRefreshed(new Date().toISOString());
      // Re-fetch the articles list
      await fetchArticles();
    } catch {
      setRefreshResult({ fetched: 0, errors: ['Network error \u2013 could not reach server.'] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const newBookmarked = new Set(bookmarked);
    const isBookmarked = newBookmarked.has(articleId);

    try {
      const response = await fetch('/api/news/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isBookmarked ? 'unbookmark' : 'bookmark',
          articleIds: [articleId],
        }),
      });

      if (response.ok) {
        if (isBookmarked) {
          newBookmarked.delete(articleId);
        } else {
          newBookmarked.add(articleId);
        }
        setBookmarked(newBookmarked);
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissed);
    const isDismissed = newDismissed.has(articleId);

    try {
      const response = await fetch('/api/news/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isDismissed ? 'undismiss' : 'dismiss',
          articleIds: [articleId],
        }),
      });

      if (response.ok) {
        if (isDismissed) {
          newDismissed.delete(articleId);
        } else {
          newDismissed.add(articleId);
        }
        setDismissed(newDismissed);
      }
    } catch (error) {
      console.error('Dismiss error:', error);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: 'bookmark' | 'dismiss') => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/news/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, articleIds: ids }),
      });
      if (res.ok) {
        if (action === 'bookmark') {
          setBookmarked((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
        } else {
          setDismissed((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
        }
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Bulk action error:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSuggestAngles = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    if (angles[articleId]) {
      setAnglesOpen(anglesOpen === articleId ? null : articleId);
      return;
    }
    setAnglesLoading(articleId);
    setAnglesOpen(articleId);
    try {
      const res = await fetch('/api/news/angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.angles) {
          setAngles((prev) => ({ ...prev, [articleId]: data.angles }));
        }
        // Store full analysis data (news values + relevance score)
        setAnalysisData((prev) => ({
          ...prev,
          [articleId]: {
            newsValues: data.newsValues || [],
            angles: data.angles || [],
            relevanceScore: data.relevanceScore || 0,
          },
        }));
      }
    } catch (err) {
      console.error('Angles error:', err);
    } finally {
      setAnglesLoading(null);
    }
  };

  // Check for dry spell
  const checkDrySpell = async () => {
    setDrySpellLoading(true);
    try {
      const res = await fetch('/api/news/dry-spell');
      const data = await res.json();
      if (res.ok) {
        setIsDrySpell(data.isDrySpell || false);
        setDrySpellSuggestions(data.suggestions || []);
      }
    } catch {
      // Silently fail — dry spell is supplementary
    } finally {
      setDrySpellLoading(false);
    }
  };

  useEffect(() => {
    checkDrySpell();
  }, []);

  const handleCopyAngle = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedAngle(key);
    setTimeout(() => setCopiedAngle(null), 2000);
  };

  // Apply client-side category filter when browsing (not searching)
  // Exclude dismissed articles from all views
  const undismissed = articles.filter((a) => !dismissed.has(a.id));
  const filtered = searchQuery
    ? undismissed
    : activeCategory === 'all'
      ? undismissed
      : undismissed.filter((a) => a.category === activeCategory);

  // Apply sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    } else if (sortBy === 'source') {
      return a.source.localeCompare(b.source);
    }
    return 0;
  });

  // Apply pagination
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const displayed = sorted.slice(startIdx, endIdx);

  // Reset to page 1 when search/filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, sortBy, timeFilter]);

  // Group by source for source stats
  const sourceCounts: Record<string, number> = {};
  articles.forEach((a) => {
    sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <MessagingBibleNudge />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">News Feed</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Browse industry news, save articles, and turn them into content.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <Button onClick={handleRefresh} loading={refreshing} variant="secondary">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Feeds</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
          {lastRefreshed && (
            <p className="text-xs text-[var(--text-secondary)]">
              Last refreshed: {formatRefreshTime(lastRefreshed)}
            </p>
          )}
        </div>
      </div>

      {/* Refresh result toast */}
      {refreshResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            refreshResult.errors.length > 0
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}
        >
          {refreshResult.errors.length > 0 ? (
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {refreshResult.fetched > 0
                ? `Fetched ${refreshResult.fetched} new article${refreshResult.fetched !== 1 ? 's' : ''}`
                : 'No new articles found'}
            </p>
            {refreshResult.errors.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {refreshResult.errors.length} feed{refreshResult.errors.length !== 1 ? 's' : ''} had errors
              </p>
            )}
          </div>
          <button
            onClick={() => setRefreshResult(null)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
          >
            \u2715
          </button>
        </div>
      )}

      {/* Source stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
        {Object.entries(sourceCounts).map(([source, count]) => (
          <span key={source} className="flex items-center gap-1.5 text-xs">
            <span className={`font-medium ${SOURCE_COLORS[source] || 'text-[var(--text-secondary)]'}`}>
              {source}
            </span>
            <span className="text-[var(--text-secondary)]">({count})</span>
          </span>
        ))}
        {Object.keys(sourceCounts).length === 0 && !loading && (
          <span className="text-xs text-[var(--text-secondary)]">No sources loaded yet</span>
        )}
      </div>

      {/* Usage limit error banner */}
      {error && (
        <div className="text-xs sm:text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 sm:px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Filters + Search + Sort */}
      <div className="flex flex-col gap-3">
        {/* Search and Sort Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--navy-light)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="sort-select" className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-none bg-[var(--navy-light)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
          {TIME_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeFilter === f.id
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveCategory(f.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeCategory === f.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="animate-pulse bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              <div className="h-4 bg-[var(--navy-lighter)] rounded w-3/4 mb-3" />
              <div className="h-3 bg-[var(--navy-lighter)] rounded w-full mb-2" />
              <div className="h-3 bg-[var(--navy-lighter)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-10 sm:p-14 flex flex-col items-center text-center">
          {articles.length === 0 ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                <Newspaper className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No news articles yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-5">
                Monitus aggregates insurance trade press from sources like Insurance Journal, Artemis, and more. Hit the button below to pull in the latest stories.
              </p>
              <Button onClick={handleRefresh} loading={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Fetch News Now
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[var(--navy-lighter)] flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-[var(--text-secondary)] opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No articles match your filters</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-5">
                You have {articles.length} article{articles.length !== 1 ? 's' : ''} loaded, but none match your current search or category filter. Try broadening your criteria.
              </p>
              <Button variant="secondary" onClick={() => { setSearchQuery(''); setActiveCategory('all'); setTimeFilter('all'); }}>
                Clear all filters
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Bulk action toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl px-4 py-3 mb-3">
              <span className="text-sm font-medium text-[var(--accent)]">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkAction('bookmark')}
                  disabled={bulkLoading}
                >
                  <Bookmark className="w-4 h-4 mr-1.5" />
                  Bookmark All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkAction('dismiss')}
                  disabled={bulkLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Dismiss All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Select all */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <input
              type="checkbox"
              checked={displayed.length > 0 && displayed.every((a) => selectedIds.has(a.id))}
              onChange={() => {
                const allSelected = displayed.every((a) => selectedIds.has(a.id));
                if (allSelected) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(displayed.map((a) => a.id)));
                }
              }}
              className="w-4 h-4 rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            <span className="text-xs text-[var(--text-secondary)]">
              Select all ({displayed.length})
            </span>
          </div>

          <div className="space-y-3">
          {displayed.map((article) => {
            const tags: string[] = (() => {
              try {
                return JSON.parse(article.tags || '[]');
              } catch {
                return [];
              }
            })();
            const isExpanded = expandedId === article.id;

            const isSelected = selectedIds.has(article.id);

            return (
              <div
                key={article.id}
                className={`relative bg-[var(--navy-light)] border rounded-xl transition-all ${
                  isSelected
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/20'
                }`}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelect(article.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-4 left-3 z-10 w-4 h-4 rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                />

                {/* Article header row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  className="w-full text-left p-4 sm:p-5 pl-9"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Source icon */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--navy-lighter)] flex items-center justify-center flex-shrink-0">
                      <Newspaper className={`w-4 h-4 sm:w-5 sm:h-5 ${SOURCE_COLORS[article.source] || 'text-[var(--text-secondary)]'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug mb-1.5">
                        {article.title}
                      </h3>
                      <p className={`text-xs text-[var(--text-secondary)] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-2.5 flex-wrap">
                        <span className={`text-xs font-medium ${SOURCE_COLORS[article.source] || 'text-[var(--text-secondary)]'}`}>
                          {article.source}
                        </span>
                        <span className="text-[var(--text-secondary)] text-xs">\u00B7</span>
                        <span className="text-xs text-[var(--text-secondary)] flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="whitespace-nowrap">{formatTime(article.published_at)}</span>
                        </span>
                        {tags.slice(0, 2).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <div className="flex-shrink-0 pt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[var(--border)] pt-4 sm:ml-14">
                    <div className="space-y-4">
                      {/* Full summary */}
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                          Summary
                        </h4>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                          {article.summary || article.content}
                        </p>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            {formatFullDate(article.published_at)}
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                            {article.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleBookmark(e, article.id)}
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${
                              bookmarked.has(article.id)
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
                            }`}
                            title={bookmarked.has(article.id) ? 'Unbookmark' : 'Bookmark'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 flex-shrink-0 ${bookmarked.has(article.id) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => handleDismiss(e, article.id)}
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${
                              dismissed.has(article.id)
                                ? 'text-amber-500'
                                : 'text-[var(--text-secondary)] hover:text-amber-500'
                            }`}
                            title={dismissed.has(article.id) ? 'Restore' : 'Dismiss'}
                          >
                            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                          </button>
                          {article.source_url && article.source_url !== '#' && (
                            <a
                              href={article.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="hidden sm:inline">Read original</span>
                              <span className="sm:hidden">Read</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                          {tags.map((tag) => (
                            <Badge key={tag} variant="purple">{tag}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Suggest Angles Button */}
                      <div className="pt-2 border-t border-[var(--border)]">
                        <button
                          onClick={(e) => handleSuggestAngles(e, article.id)}
                          disabled={anglesLoading === article.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
                        >
                          {anglesLoading === article.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Lightbulb className="w-3.5 h-3.5" />
                          )}
                          {angles[article.id] ? (anglesOpen === article.id ? 'Hide Angles' : 'Show Angles') : 'Suggest Content Angles'}
                        </button>

                        {/* Analysis Panel — 17 News Values + Angles */}
                        {anglesOpen === article.id && analysisData[article.id] && (
                          <div className="mt-3 space-y-4">
                            {/* Relevance score */}
                            {analysisData[article.id].relevanceScore > 0 && (
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                                <span className="text-xs font-medium text-[var(--text-secondary)]">Relevance Score:</span>
                                <Badge
                                  variant={
                                    analysisData[article.id].relevanceScore >= 70 ? 'success'
                                      : analysisData[article.id].relevanceScore >= 40 ? 'warning'
                                        : 'default'
                                  }
                                  size="sm"
                                >
                                  {analysisData[article.id].relevanceScore}%
                                </Badge>
                              </div>
                            )}

                            {/* 17 News Values mini-grid */}
                            {analysisData[article.id].newsValues.length > 0 && (
                              <div>
                                <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <BarChart3 className="w-3 h-3" />
                                  17 News Values
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {[...analysisData[article.id].newsValues]
                                    .sort((a, b) => b.score - a.score)
                                    .map(nv => {
                                      const isStrong = nv.score >= 4;
                                      const isMedium = nv.score >= 2 && nv.score < 4;
                                      return (
                                        <div
                                          key={nv.name}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border cursor-default transition-colors ${
                                            isStrong
                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                              : isMedium
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border-[var(--border)]'
                                          }`}
                                          title={nv.rationale}
                                        >
                                          <span>{nv.name}</span>
                                          <span className="font-bold">{nv.score}</span>
                                        </div>
                                      );
                                    })}
                                </div>

                                {/* Strongest angles highlight */}
                                {analysisData[article.id].newsValues.filter(nv => nv.score >= 4).length > 0 && (
                                  <div className="mt-2">
                                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                                      Strongest: {analysisData[article.id].newsValues
                                        .filter(nv => nv.score >= 4)
                                        .sort((a, b) => b.score - a.score)
                                        .slice(0, 5)
                                        .map(nv => nv.name)
                                        .join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Content angle cards */}
                            {angles[article.id] && angles[article.id].length > 0 && (
                              <div>
                                <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                                  Content Angles
                                </h5>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {angles[article.id].map((angle, idx) => {
                                    const ChannelIcon = CHANNEL_ICONS[angle.channel] || Megaphone;
                                    const colorClasses = CHANNEL_COLORS[angle.channel] || 'text-[var(--text-secondary)] bg-[var(--navy-lighter)] border-[var(--border)]';
                                    const angleKey = `${article.id}-${idx}`;
                                    return (
                                      <div key={idx} className={`rounded-lg border p-3 ${colorClasses}`}>
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <ChannelIcon className="w-3.5 h-3.5" />
                                          <span className="text-xs font-semibold uppercase tracking-wider">{angle.type}</span>
                                        </div>
                                        <h5 className="text-xs font-bold text-[var(--text-primary)] mb-1.5 leading-snug">
                                          {angle.headline}
                                        </h5>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                                          {angle.angle}
                                        </p>
                                        {angle.spokesperson_quote && (
                                          <blockquote className="text-xs italic text-[var(--text-secondary)] border-l-2 border-current pl-2 mb-2 opacity-80">
                                            {angle.spokesperson_quote}
                                          </blockquote>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyAngle(
                                              `${angle.headline}\n\n${angle.angle}\n\n${angle.spokesperson_quote || ''}`,
                                              angleKey
                                            );
                                          }}
                                          className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                                        >
                                          {copiedAngle === angleKey ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              Copied
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              Copy
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </>
      )}

      {/* Dry Spell / Content Inspiration Panel */}
      {!loading && (isDrySpell || sorted.length === 0) && drySpellSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-[var(--navy-light)] to-[var(--navy)] border border-[var(--accent)]/20 rounded-xl p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Content Inspiration</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {sorted.length === 0
                  ? 'No articles match your filters. Here are content ideas based on your positioning...'
                  : 'No breaking news recently? Here are content ideas based on your positioning...'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drySpellSuggestions.slice(0, 5).map((suggestion) => {
              const typeConfig = SUGGESTION_TYPE_LABELS[suggestion.type] || { label: suggestion.type, color: 'text-[var(--text-secondary)] bg-[var(--navy-lighter)] border-[var(--border)]' };
              return (
                <div
                  key={suggestion.id}
                  className="bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)]/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] uppercase">
                      {suggestion.suggestedChannel === 'linkedin' ? 'LinkedIn' : suggestion.suggestedChannel === 'email' ? 'Email' : 'Trade Media'}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] leading-snug mb-1.5">
                    {suggestion.title}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
                    {suggestion.description}
                  </p>
                  <a
                    href={`/pipeline?suggestion=${encodeURIComponent(suggestion.title)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    Draft This
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading dry spell */}
      {!loading && sorted.length === 0 && drySpellSuggestions.length === 0 && drySpellLoading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
          <span className="text-xs text-[var(--text-secondary)]">Checking for content inspiration...</span>
        </div>
      )}

      {/* Pagination */}
      {!loading && sorted.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sorted.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Article count footer */}
      {!loading && sorted.length > 0 && (
        <div className="text-center text-xs text-[var(--text-secondary)] py-2">
          Showing {startIdx + 1}\u2013{Math.min(endIdx, sorted.length)} of {sorted.length} article{sorted.length !== 1 ? 's' : ''}
          {activeCategory !== 'all' && !searchQuery && ` in ${CATEGORY_FILTERS.find(f => f.id === activeCategory)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  );
}
