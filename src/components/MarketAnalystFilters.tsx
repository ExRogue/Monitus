'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

export type Period = '7d' | '14d' | '30d';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
};

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  sources: string[];               // currently selected sources (empty = all)
  availableSources: string[];      // discovered sources to choose from
  onSourcesChange: (s: string[]) => void;
}

/**
 * Page-level filters for Market Analyst. Story Saturation reads these via
 * props and forwards them to /api/story-clusters and /api/coverage-trend.
 */
export default function MarketAnalystFilters({
  period, onPeriodChange,
  sources, availableSources, onSourcesChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodPill value={period} onChange={onPeriodChange} />
      <SourcesPill
        selected={sources}
        available={availableSources}
        onChange={onSourcesChange}
      />
    </div>
  );
}

function PeriodPill({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--accent)]/40"
      >
        <span className="text-[var(--text-secondary)]">Period</span>
        <span className="font-medium">{PERIOD_LABELS[value]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--navy-light)] shadow-lg overflow-hidden">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--navy-lighter)] ${
                p === value ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)]'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SourcesPill({
  selected, available, onChange,
}: {
  selected: string[];
  available: string[];
  onChange: (s: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useDismiss(() => setOpen(false));
  const allSelected = selected.length === 0;
  const label = allSelected
    ? `All sources (${available.length})`
    : `${selected.length} of ${available.length} sources`;

  const filtered = search
    ? available.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : available;

  const toggle = (s: string) => {
    if (selected.includes(s)) onChange(selected.filter(x => x !== s));
    else onChange([...selected, s]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--accent)]/40"
      >
        <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        <span className="font-medium">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-lg border border-[var(--border)] bg-[var(--navy-light)] shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border)] flex items-center gap-2">
            <input
              type="text"
              placeholder="Search sources…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-2 py-1 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
            {!allSelected && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-[var(--text-secondary)]">No matching sources.</div>
            ) : (
              filtered.map(s => {
                const isOn = allSelected || selected.includes(s);
                return (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(s)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="truncate">{s}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useDismiss<T extends HTMLElement = HTMLDivElement>(onDismiss: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onDismiss]);
  return ref;
}
