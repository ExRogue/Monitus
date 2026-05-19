'use client';
/**
 * Themes — the meta-level groupings (e.g. "AI Underwriting Governance",
 * "Cyber Risk Concentration") that emerge from clustering signal_analyses tags.
 *
 * Lives under Library in the new IA. Different concept from Market
 * Conversations (which are story-level clusters) — themes are the recurring
 * topic patterns across many conversations. Useful for power users who want
 * to see the macro picture.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tags, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Theme {
  id: string;
  company_id: string;
  name: string;
  description: string;
  classification: 'Immediate' | 'Building' | 'Established' | 'Structural';
  score: number;
  momentum_7d: number;
  momentum_30d: number;
  momentum_90d: number;
  momentum_180d: number;
  source_diversity: number;
  competitor_activity: number;
  icp_relevance: number;
  narrative_fit: number;
  recommended_action: 'act_now' | 'reinforce' | 'monitor' | 'ignore';
  article_ids: string;
}

const CLASSIFICATION_COLOR: Record<Theme['classification'], string> = {
  Immediate: 'text-red-400 bg-red-500/10 border-red-500/30',
  Building: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Established: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Structural: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const ACTION_LABEL: Record<Theme['recommended_action'], string> = {
  act_now: 'Act now',
  reinforce: 'Reinforce',
  monitor: 'Monitor',
  ignore: 'Ignore',
};

const ACTION_COLOR: Record<Theme['recommended_action'], string> = {
  act_now: 'text-red-400',
  reinforce: 'text-[var(--accent)]',
  monitor: 'text-amber-400',
  ignore: 'text-[var(--text-secondary)]/60',
};

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/themes')
      .then(r => r.json())
      .then(data => setThemes(data.themes || []))
      .catch(() => setThemes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <header className="mb-6">
        <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]/60 mb-2">LIBRARY</div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">Themes</h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
          Recurring topic patterns that emerge from your market intelligence. Themes are coarser than Market Conversations — use them to spot which subjects you've been tracking over weeks and months.
        </p>
      </header>

      <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Tags className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Looking for what to actually do this week? See <Link href="/market-brief" className="text-[var(--accent)] hover:underline font-medium">Market Brief</Link>. Themes are the underlying signal map; the Brief is the synthesis.
        </div>
      </div>

      {themes.length === 0 ? (
        <div className="text-center py-20">
          <Tags className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-5 opacity-60" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No themes yet</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
            Themes form over time as we score signals against your narrative. They typically appear within a week of consistent market coverage.
          </p>
          <Link
            href="/market-brief"
            className="inline-block px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            See your Market Brief →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {themes.map(theme => (
            <ThemeRow key={theme.id} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeRow({ theme }: { theme: Theme }) {
  const trend = theme.momentum_7d > theme.momentum_30d * 1.1 ? 'up'
              : theme.momentum_7d < theme.momentum_30d * 0.9 ? 'down'
              : 'flat';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400'
                    : trend === 'down' ? 'text-[var(--text-secondary)]/50'
                    : 'text-amber-400';

  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
              {theme.name}
            </h3>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${CLASSIFICATION_COLOR[theme.classification]}`}>
              {theme.classification}
            </span>
          </div>
          {theme.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{theme.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{theme.score}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <MiniMetric label="7d momentum" value={theme.momentum_7d} />
        <MiniMetric label="30d momentum" value={theme.momentum_30d} />
        <MiniMetric label="Source diversity" value={theme.source_diversity} />
        <MiniMetric label="Narrative fit" value={theme.narrative_fit} />
        <MiniMetric label="ICP relevance" value={theme.icp_relevance} />
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/60">
          Recommended:
          <span className={`ml-1.5 font-semibold ${ACTION_COLOR[theme.recommended_action]}`}>
            {ACTION_LABEL[theme.recommended_action]}
          </span>
        </span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/60 mb-1">{label}</div>
      <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{value}</div>
    </div>
  );
}
