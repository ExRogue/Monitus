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
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';

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
  'Artemis': 'text-purple-400',
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

  const fetchArticles = useCallback(async () => {
    setError('');
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (activeCategory !== 'all' && !searchQuery) params.set('category', activeCategory);
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
  }, [searchQuery, activeCategory]);

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
      setRefreshResult({ fetched: 0, errors: ['Network error – could not reach server.'] });
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

  // Apply client-side category filter when browsing (not searching)
  const filtered = searchQuery
    ? articles
    : activeCategory === 'all'
      ? articles
      : articles.filter((a) => a.category === activeCategory);

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
  }, [searchQuery, activeCategory, sortBy]);

  // Group by source for source stats
  const sourceCounts: Record<string, number> = {};
  articles.forEach((a) => {
    sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">News Feed</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Insurance industry news from leading trade press
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
            ✕
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Newspaper className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No articles found</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            {articles.length === 0
              ? 'Click "Refresh Feeds" to fetch the latest insurance industry news from trade press.'
              : 'No articles match your search or filter. Try adjusting your criteria.'}
          </p>
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
                        <span className="text-[var(--text-secondary)] text-xs">·</span>
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
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </>
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
          Showing {startIdx + 1}–{Math.min(endIdx, sorted.length)} of {sorted.length} article{sorted.length !== 1 ? 's' : ''}
          {activeCategory !== 'all' && !searchQuery && ` in ${CATEGORY_FILTERS.find(f => f.id === activeCategory)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  );
}
