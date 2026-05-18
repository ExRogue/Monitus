'use client';
/**
 * Settings → Sources
 *
 * Per-company source selection. Lists every global source from the registry,
 * with a toggle to opt out. Excluded sources are filtered out at scoring time
 * (signal_analyses) and at clustering time (market_conversations) so the
 * Market Brief / Market View stay focused on what the company actually cares
 * about.
 */
import { useEffect, useState } from 'react';
import { Loader2, Search, ToggleLeft, ToggleRight, Radio, AlertCircle } from 'lucide-react';

interface SourceEntry {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  classification: string;
  trustWeight: number;
  geography: string | null;
  segment: string | null;
  priority: string;
}

export default function SourcesSettingsPage() {
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/sources').then(r => r.json()),
      fetch('/api/company/sources').then(r => r.json()),
    ]).then(([sourcesData, companyData]) => {
      if (cancelled) return;
      setSources(sourcesData.sources || []);
      setExcluded(new Set(companyData.excludedSourceNames || []));
    }).catch(() => {
      if (!cancelled) {
        setSources([]);
        setExcluded(new Set());
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const toggleSource = (name: string) => {
    const next = new Set(excluded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExcluded(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/company/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedSourceNames: Array.from(excluded) }),
      });
      const data = await r.json();
      if (data?.excludedSourceNames) {
        setExcluded(new Set(data.excludedSourceNames));
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = sources.filter(s => {
    const matchesSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.segment || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.geography || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'on') return !excluded.has(s.name);
    if (filter === 'off') return excluded.has(s.name);
    return true;
  });

  const enabledCount = sources.length - excluded.size;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Sources</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Pick which market sources we scan for you. Sources you turn off won't be scored, clustered, or fed into your Market Brief.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-lg bg-[var(--navy-light)] border border-[var(--border)]">
        <div className="text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--text-primary)] font-semibold">{enabledCount}</span> of {sources.length} sources on
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save changes
          </button>
          {savedToast && (
            <span className="text-xs text-emerald-400">Saved</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, segment, or geography…"
            className="w-full pl-10 pr-3 py-2 text-sm bg-[var(--navy-light)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'on' | 'off')}
          className="text-sm bg-[var(--navy-light)] border border-[var(--border)] text-[var(--text-primary)] rounded-md px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="all">All</option>
          <option value="on">On only</option>
          <option value="off">Off only</option>
        </select>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-20">
          <AlertCircle className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-4 opacity-60" />
          <p className="text-sm text-[var(--text-secondary)]">No sources registered yet. The source registry seeds on first cron run.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(s => {
            const isExcluded = excluded.has(s.name);
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.name)}
                className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-lg border transition-all text-left ${
                  isExcluded
                    ? 'bg-[var(--navy-light)] border-[var(--border)] opacity-60'
                    : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--accent)]/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Radio className={`w-4 h-4 flex-shrink-0 ${isExcluded ? 'text-[var(--text-secondary)]/40' : 'text-[var(--accent)]'}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${isExcluded ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                      {s.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/60 mt-0.5 flex items-center gap-2">
                      {s.classification && <span>{s.classification}</span>}
                      {s.geography && <><span>·</span><span>{s.geography}</span></>}
                      {s.segment && <><span>·</span><span>{s.segment}</span></>}
                      <span>·</span>
                      <span>Trust {s.trustWeight}</span>
                    </div>
                  </div>
                </div>
                {isExcluded
                  ? <ToggleLeft className="w-6 h-6 text-[var(--text-secondary)]/40 flex-shrink-0" />
                  : <ToggleRight className="w-6 h-6 text-[var(--accent)] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
