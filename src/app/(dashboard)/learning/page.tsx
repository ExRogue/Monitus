'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap, TrendingUp, TrendingDown, Minus, Loader2,
  BarChart3, Layers, Globe, RefreshCw, ArrowUp, ArrowDown,
  ArrowRight, Sparkles, CheckCircle, AlertTriangle, Activity,
  Crosshair, Target, Zap, Shield,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type SubView = 'map' | 'momentum' | 'sources' | 'competitive' | 'recommendations';

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
  source_diversity: number;
  competitor_activity: number;
  icp_relevance: number;
  narrative_fit: number;
  recommended_action: string;
}

const DEMO_THEMES: Theme[] = [
  { id: 't1', name: 'AI governance in underwriting', description: 'Explainability, auditability, model governance', classification: 'Building', score: 82, momentum_7d: 12, momentum_30d: 35, momentum_90d: 68, momentum_180d: 45, source_diversity: 78, competitor_activity: 72, icp_relevance: 88, narrative_fit: 76, recommended_action: 'act_now' },
  { id: 't2', name: 'Cyber war exclusion evolution', description: "Lloyd's LMA clauses and market definitions", classification: 'Immediate', score: 91, momentum_7d: 24, momentum_30d: 41, momentum_90d: 38, momentum_180d: 22, source_diversity: 85, competitor_activity: 85, icp_relevance: 94, narrative_fit: 82, recommended_action: 'act_now' },
  { id: 't3', name: 'Delegated authority digitisation', description: 'Coverholder portals, digital bordereaux', classification: 'Established', score: 65, momentum_7d: 8, momentum_30d: 22, momentum_90d: 55, momentum_180d: 70, source_diversity: 62, competitor_activity: 60, icp_relevance: 78, narrative_fit: 71, recommended_action: 'reinforce' },
  { id: 't4', name: 'Parametric insurance growth', description: 'Index-based triggers, climate parametrics', classification: 'Building', score: 58, momentum_7d: 15, momentum_30d: 28, momentum_90d: 42, momentum_180d: 30, source_diversity: 55, competitor_activity: 45, icp_relevance: 62, narrative_fit: 55, recommended_action: 'monitor' },
  { id: 't5', name: 'Lloyd\'s Blueprint Two', description: 'Market digitalisation, PPL, e-placement', classification: 'Established', score: 72, momentum_7d: 5, momentum_30d: 18, momentum_90d: 60, momentum_180d: 75, source_diversity: 70, competitor_activity: 55, icp_relevance: 80, narrative_fit: 68, recommended_action: 'reinforce' },
  { id: 't6', name: 'Embedded insurance expansion', description: 'API-driven, embedded distribution models', classification: 'Building', score: 50, momentum_7d: 18, momentum_30d: 32, momentum_90d: 25, momentum_180d: 15, source_diversity: 40, competitor_activity: 35, icp_relevance: 55, narrative_fit: 42, recommended_action: 'monitor' },
  { id: 't7', name: 'Climate risk modelling', description: 'Physical risk, transition risk, NAT CAT models', classification: 'Structural', score: 45, momentum_7d: 6, momentum_30d: 15, momentum_90d: 38, momentum_180d: 60, source_diversity: 65, competitor_activity: 40, icp_relevance: 50, narrative_fit: 35, recommended_action: 'monitor' },
  { id: 't8', name: 'Digital MGA growth', description: 'Insuretech MGA formation, coverholder digitisation', classification: 'Established', score: 60, momentum_7d: 3, momentum_30d: 12, momentum_90d: 45, momentum_180d: 58, source_diversity: 58, competitor_activity: 50, icp_relevance: 70, narrative_fit: 60, recommended_action: 'reinforce' },
];

const CLASS_COLORS: Record<string, string> = {
  Immediate: 'bg-red-500',
  Building: 'bg-amber-500',
  Established: 'bg-blue-500',
  Structural: 'bg-slate-500',
};
const CLASS_BORDER: Record<string, string> = {
  Immediate: 'text-red-400 bg-red-400/10 border-red-400/20',
  Building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Established: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Structural: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
const ACTION_COLORS: Record<string, string> = {
  act_now: 'text-red-400 bg-red-400/10 border-red-400/20',
  monitor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  reinforce: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ignore: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
const ACTION_LABELS: Record<string, string> = {
  act_now: 'Act Now', monitor: 'Monitor', reinforce: 'Reinforce', ignore: 'Ignore',
};

function getMomentumTrend(theme: Theme): 'up' | 'stable' | 'down' {
  const recent = (theme.momentum_7d + theme.momentum_30d) / 2;
  const older = (theme.momentum_90d + theme.momentum_180d) / 2;
  if (recent > older * 1.15) return 'up';
  if (recent < older * 0.85) return 'down';
  return 'stable';
}

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<SubView>('map');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [sortMomentum, setSortMomentum] = useState<'fastest' | 'persistent' | 'fading'>('fastest');

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

  useEffect(() => { loadThemes(); }, [loadThemes]);

  const tabs: { key: SubView; label: string }[] = [
    { key: 'map', label: 'Theme Map' },
    { key: 'momentum', label: 'Momentum' },
    { key: 'sources', label: 'Source Mix' },
    { key: 'competitive', label: 'Competitive Pressure' },
    { key: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[var(--accent)]" /> Learning
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            How your market intelligence is evolving over time
          </p>
        </div>
        <Button variant="ghost" onClick={loadThemes} className="flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading intelligence data...
        </div>
      ) : (
        <>
          {/* Theme Map */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Themes positioned by <strong className="text-[var(--text-primary)]">narrative fit</strong> (x-axis) vs <strong className="text-[var(--text-primary)]">market momentum</strong> (y-axis). Bubble size reflects score.
              </p>
              <div className="relative rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden" style={{ height: 420 }}>
                {/* Axis labels */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[var(--text-secondary)]">Narrative Fit →</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]" style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}>Market Momentum →</div>
                {/* Quadrant lines */}
                <div className="absolute top-1/2 left-10 right-4 border-t border-dashed border-[var(--border)]" />
                <div className="absolute left-1/2 top-4 bottom-8 border-l border-dashed border-[var(--border)]" />
                {/* Quadrant labels */}
                <div className="absolute top-3 right-5 text-[10px] text-[var(--text-secondary)]/50 text-right">High fit<br/>High momentum</div>
                <div className="absolute top-3 left-12 text-[10px] text-[var(--text-secondary)]/50">Low fit<br/>High momentum</div>
                <div className="absolute bottom-9 right-5 text-[10px] text-[var(--text-secondary)]/50 text-right">High fit<br/>Low momentum</div>
                <div className="absolute bottom-9 left-12 text-[10px] text-[var(--text-secondary)]/50">Low fit<br/>Low momentum</div>

                {/* Theme bubbles */}
                {themes.map(theme => {
                  const x = 10 + (theme.narrative_fit / 100) * 80; // 10-90%
                  const y = 5 + (1 - theme.momentum_30d / Math.max(...themes.map(t => t.momentum_30d), 1)) * 85; // 5-90%, inverted
                  const size = 20 + (theme.score / 100) * 30;
                  const isHovered = hoveredTheme === theme.id;

                  return (
                    <div
                      key={theme.id}
                      className="absolute cursor-pointer transition-all duration-200"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: size,
                        height: size,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isHovered ? 10 : 1,
                      }}
                      onMouseEnter={() => setHoveredTheme(theme.id)}
                      onMouseLeave={() => setHoveredTheme(null)}
                    >
                      <div
                        className={`w-full h-full rounded-full opacity-70 hover:opacity-100 transition-opacity ${CLASS_COLORS[theme.classification] || 'bg-slate-500'}`}
                      />
                      {isHovered && (
                        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--navy-lighter)] p-3 shadow-xl pointer-events-none">
                          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{theme.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{theme.classification} · Score {Math.round(theme.score)}</p>
                          <p className="text-xs text-[var(--accent)] mt-1">{ACTION_LABELS[theme.recommended_action]}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs">
                {['Immediate', 'Building', 'Established', 'Structural'].map(c => (
                  <div key={c} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${CLASS_COLORS[c]}`} />
                    <span className="text-[var(--text-secondary)]">{c}</span>
                  </div>
                ))}
                <span className="text-[var(--text-secondary)]/60">· Bubble size = theme score</span>
              </div>
            </div>
          )}

          {/* Momentum */}
          {activeTab === 'momentum' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {[
                  { key: 'fastest', label: 'Fastest Growing' },
                  { key: 'persistent', label: 'Most Persistent' },
                  { key: 'fading', label: 'Fading' },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortMomentum(s.key as typeof sortMomentum)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      sortMomentum === s.key
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {[...themes]
                .sort((a, b) => {
                  if (sortMomentum === 'fastest') return (b.momentum_7d + b.momentum_30d) - (a.momentum_7d + a.momentum_30d);
                  if (sortMomentum === 'persistent') return b.momentum_180d - a.momentum_180d;
                  return (a.momentum_7d + a.momentum_30d) - (b.momentum_7d + b.momentum_30d);
                })
                .map(theme => {
                  const trend = getMomentumTrend(theme);
                  const maxVal = Math.max(theme.momentum_7d, theme.momentum_30d, theme.momentum_90d, theme.momentum_180d, 1);
                  return (
                    <div key={theme.id} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex-shrink-0 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                            {trend === 'up' ? <ArrowUp className="w-5 h-5" /> : trend === 'down' ? <ArrowDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{theme.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{theme.classification} · {trend === 'up' ? 'Accelerating' : trend === 'down' ? 'Fading' : 'Stable'}</p>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded border ${CLASS_BORDER[theme.classification]}`}>
                          {theme.classification}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: '7d', value: theme.momentum_7d },
                          { label: '30d', value: theme.momentum_30d },
                          { label: '90d', value: theme.momentum_90d },
                          { label: '180d', value: theme.momentum_180d },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center">
                            <div className="h-10 bg-[var(--navy-lighter)] rounded-sm overflow-hidden flex items-end">
                              <div className="w-full bg-[var(--accent)] rounded-sm" style={{ height: `${Math.round((value / maxVal) * 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1">{label}</p>
                            <p className="text-xs font-medium text-[var(--text-primary)]">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Source Mix */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Where each theme is appearing across source tiers. Higher source diversity = more reliable signal.
              </p>
              {[...themes].sort((a, b) => b.source_diversity - a.source_diversity).map(theme => (
                <div key={theme.id} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{theme.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Diversity</span>
                      <span className={`text-xs font-bold ${theme.source_diversity >= 70 ? 'text-emerald-400' : theme.source_diversity >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(theme.source_diversity)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Regulatory', value: Math.round(theme.source_diversity * 0.3), color: 'bg-red-500' },
                      { label: 'Trade Press', value: Math.round(theme.source_diversity * 0.4), color: 'bg-blue-500' },
                      { label: 'Competitor/Buyer', value: Math.round(theme.competitor_activity * 0.5), color: 'bg-amber-500' },
                      { label: 'Custom', value: Math.round(theme.source_diversity * 0.1), color: 'bg-emerald-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-secondary)] w-32 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-[var(--navy-lighter)] rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] w-6 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                  {theme.source_diversity < 40 && (
                    <p className="text-xs text-amber-400/80">Low source diversity — treat this signal with caution until it appears in more source types.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Competitive Pressure */}
          {activeTab === 'competitive' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Which themes competitors are moving on — and where there is narrative whitespace for you to own.
              </p>
              {[...themes].sort((a, b) => b.competitor_activity - a.competitor_activity).map(theme => {
                const pressure = theme.competitor_activity >= 70 ? 'high' : theme.competitor_activity >= 40 ? 'medium' : 'low';
                const whitespace = theme.competitor_activity < 40 && theme.narrative_fit > 60;
                return (
                  <div key={theme.id} className={`rounded-xl border bg-[var(--navy-light)] p-5 space-y-3 ${whitespace ? 'border-emerald-500/30' : 'border-[var(--border)]'}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {whitespace && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                              Narrative whitespace
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            pressure === 'high' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                            pressure === 'medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                            'text-slate-400 bg-slate-400/10 border-slate-400/20'
                          }`}>
                            {pressure === 'high' ? 'High' : pressure === 'medium' ? 'Medium' : 'Low'} competitor pressure
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{theme.name}</p>
                      </div>
                      <div className="flex items-center gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-[var(--text-primary)]">{Math.round(theme.competitor_activity)}</p>
                          <p className="text-xs text-[var(--text-secondary)]">competitor activity</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[var(--text-primary)]">{Math.round(theme.narrative_fit)}</p>
                          <p className="text-xs text-[var(--text-secondary)]">your narrative fit</p>
                        </div>
                      </div>
                    </div>
                    {whitespace && (
                      <p className="text-xs text-emerald-400/80">
                        This theme has strong narrative fit for you but low competitor activity — an opportunity to own the conversation before others do.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {[
                {
                  key: 'act_now',
                  label: 'Act Now',
                  desc: 'High momentum, strong narrative fit, low competitor ownership',
                  icon: <Zap className="w-4 h-4 text-red-400" />,
                  border: 'border-red-500/20',
                  bg: 'bg-red-500/5',
                },
                {
                  key: 'reinforce',
                  label: 'Reinforce Existing Narrative',
                  desc: 'You already speak to this — keep the thread alive',
                  icon: <Shield className="w-4 h-4 text-blue-400" />,
                  border: 'border-blue-500/20',
                  bg: 'bg-blue-500/5',
                },
                {
                  key: 'monitor',
                  label: 'Monitor',
                  desc: 'Building but not yet urgent — watch for inflection',
                  icon: <Activity className="w-4 h-4 text-amber-400" />,
                  border: 'border-amber-500/20',
                  bg: 'bg-amber-500/5',
                },
                {
                  key: 'ignore',
                  label: 'Ignore',
                  desc: 'Noise, low relevance, or competitor-dominated',
                  icon: <Minus className="w-4 h-4 text-slate-400" />,
                  border: 'border-slate-500/20',
                  bg: 'bg-slate-500/5',
                },
              ].map(section => {
                const sectionThemes = themes.filter(t => t.recommended_action === section.key);
                if (!sectionThemes.length) return null;
                return (
                  <div key={section.key} className={`rounded-xl border ${section.border} ${section.bg} p-5 space-y-3`}>
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</h3>
                      <span className="text-xs text-[var(--text-secondary)] ml-1">— {section.desc}</span>
                    </div>
                    <div className="space-y-2">
                      {sectionThemes.map(theme => (
                        <div key={theme.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{theme.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Score {Math.round(theme.score)} · ICP relevance {Math.round(theme.icp_relevance)} · Narrative fit {Math.round(theme.narrative_fit)}
                            </p>
                          </div>
                          {section.key === 'act_now' && (
                            <a
                              href="/opportunities"
                              className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                            >
                              Create opportunity <ArrowRight className="w-3 h-3" />
                            </a>
                          )}
                          {section.key === 'reinforce' && (
                            <a
                              href="/narrative"
                              className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                            >
                              View narrative <ArrowRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
