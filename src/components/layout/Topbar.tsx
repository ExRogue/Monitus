'use client';
import { Bell, Search, X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'article' | 'content';
  title: string;
  summary?: string;
  date: string;
}

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setShowResults(false);
    setQuery('');
  }, [pathname]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const [newsRes, contentRes] = await Promise.all([
        fetch(`/api/news?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json()).catch(() => ({ articles: [] })),
        fetch(`/api/generate?search=${encodeURIComponent(q)}&limit=5`).then(r => r.json()).catch(() => ({ content: [] })),
      ]);

      const mapped: SearchResult[] = [
        ...(newsRes.articles || []).map((a: any) => ({
          id: a.id,
          type: 'article' as const,
          title: a.title,
          summary: a.source,
          date: a.published_at || a.created_at,
        })),
        ...(contentRes.content || []).map((c: any) => ({
          id: c.id,
          type: 'content' as const,
          title: c.title || c.content_type,
          summary: c.content_type,
          date: c.created_at,
        })),
      ];

      setResults(mapped);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      doSearch(query);
    }
  };

  const navigateToResult = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    if (result.type === 'article') {
      router.push('/news');
    } else {
      router.push('/content');
    }
  };

  return (
    <header className="h-16 bg-[var(--navy-light)] border-b border-[var(--border)] flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-80" ref={searchRef}>
        <form onSubmit={handleSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            placeholder="Search news, content..."
            className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg pl-10 pr-9 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No results found</div>
            ) : (
              <>
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => navigateToResult(r)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--navy-lighter)] transition-colors border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        r.type === 'article'
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'bg-[var(--purple)]/10 text-[var(--purple)]'
                      }`}>
                        {r.type === 'article' ? 'News' : 'Content'}
                      </span>
                      {r.summary && (
                        <span className="text-[10px] text-[var(--text-secondary)]">{r.summary}</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-primary)] line-clamp-1">{r.title}</p>
                  </button>
                ))}
                <div className="px-4 py-2 text-xs text-[var(--text-secondary)] text-center border-t border-[var(--border)]">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--accent)] rounded-full" />
        </button>
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center text-xs font-bold text-white">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
