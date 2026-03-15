'use client';

import { useEffect, useState } from 'react';
import { Rss, Plus, Trash2, CheckCircle, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CustomFeed {
  id: string;
  company_id: string;
  url: string;
  name: string;
  category: string;
  status: string;
  last_fetched_at: string | null;
  last_error: string;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  { value: 'custom', label: 'Custom' },
  { value: 'uk_market', label: 'UK Market' },
  { value: 'reinsurance', label: 'Reinsurance' },
  { value: 'ils', label: 'ILS' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'general', label: 'General' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'podcast', label: 'Podcast' },
];

export default function FeedsSettingsPage() {
  const [feeds, setFeeds] = useState<CustomFeed[]>([]);
  const [feedLimit, setFeedLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add form state
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFeeds = async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/feeds');
      if (!res.ok) throw new Error('Failed to load feeds');
      const data = await res.json();
      setFeeds(data.feeds || []);
      setFeedLimit(data.limit || 5);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);

    if (!newUrl.trim() || !newName.trim()) {
      setAddError('URL and name are required');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim(), name: newName.trim(), category: newCategory }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Failed to add feed');
        return;
      }

      setFeeds((prev) => [data.feed, ...prev]);
      setNewUrl('');
      setNewName('');
      setNewCategory('custom');
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (feedId: string) => {
    setDeletingId(feedId);
    try {
      const res = await fetch('/api/feeds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedId }),
      });

      if (res.ok) {
        setFeeds((prev) => prev.filter((f) => f.id !== feedId));
      }
    } catch {
      // silent failure — feed stays in list
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-[var(--text-secondary)] mt-3">Loading feeds...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--text-primary)]">Failed to load feeds</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{loadError}</p>
            <button
              onClick={() => { setLoading(true); loadFeeds(); }}
              className="mt-3 text-sm text-red-400 hover:text-red-300 font-medium underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">Custom RSS Feeds</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Add your own RSS feeds to monitor alongside built-in sources. {feeds.length}/{feedLimit} feeds used.
        </p>
      </div>

      {/* Add feed form */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Add Feed</h2>
        </div>
        <form onSubmit={handleAdd} className="p-4 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Feed name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Cyber Insurance Weekly"
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Feed URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/rss/feed.xml"
              className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              The URL will be validated by test-parsing the RSS feed before saving.
            </p>
          </div>

          {addError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-red-400">{addError}</p>
            </div>
          )}

          {addSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-emerald-400">Feed added successfully</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              {feeds.length >= feedLimit
                ? 'Feed limit reached. Upgrade your plan for more.'
                : `${feedLimit - feeds.length} feed${feedLimit - feeds.length !== 1 ? 's' : ''} remaining`}
            </p>
            <button
              type="submit"
              disabled={adding || feeds.length >= feedLimit}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                adding || feeds.length >= feedLimit
                  ? 'bg-[var(--accent)]/30 text-[var(--text-secondary)] cursor-not-allowed'
                  : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
              }`}
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Feed
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Feed list */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Rss className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
            Your Feeds ({feeds.length})
          </h2>
        </div>

        {feeds.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Rss className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">No custom feeds yet</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Add an RSS feed above to start monitoring additional sources.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {feeds.map((feed) => (
              <div key={feed.id} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 group">
                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {feed.status === 'active' ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Active" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" title="Error" />
                  )}
                </div>

                {/* Feed info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {feed.name}
                    </p>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] flex-shrink-0">
                      {feed.category}
                    </span>
                    {feed.status === 'error' && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex-shrink-0">
                        Error
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                    {feed.url}
                  </p>
                  {feed.last_error && feed.status === 'error' && (
                    <p className="text-xs text-red-400 mt-1 truncate" title={feed.last_error}>
                      {feed.last_error}
                    </p>
                  )}
                  {feed.last_fetched_at && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Last fetched: {new Date(feed.last_fetched_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(feed.id)}
                  disabled={deletingId === feed.id}
                  className="flex-shrink-0 p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                  title="Remove feed"
                >
                  {deletingId === feed.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
