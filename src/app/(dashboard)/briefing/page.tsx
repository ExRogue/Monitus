'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  FileStack, Loader2, RefreshCw, Download, Eye, Sparkles,
  TrendingUp, Crosshair, ChevronDown, ChevronUp, Plus,
  Clock, Activity, BarChart3, ArrowRight, Zap, Target,
  FileText, Users, Building, CheckCircle, X, Calendar,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ExportPdfButton from '@/components/ExportPdfButton';

type SubView = 'weekly' | 'themes' | 'rivals' | 'reports' | 'builder';

interface WeeklyPriority {
  id: string;
  top_themes: string;
  recommended_angles: string;
  competitor_move: string;
  content_mix: string;
  thing_to_ignore: string;
  full_content: string;
  week_start: string;
  created_at: string;
}

interface Theme {
  id: string;
  name: string;
  classification: string;
  score: number;
  momentum_7d: number;
  momentum_90d: number;
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

interface Report {
  id: string;
  report_type: string;
  title: string;
  content: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

interface Briefing {
  id: string;
  title: string;
  content: string;
  metadata: string;
  created_at: string;
}

const DEMO_WEEKLY: Partial<WeeklyPriority> = {
  top_themes: JSON.stringify([
    { name: 'AI governance in underwriting', reason: 'FCA CP26/7 consultation closes in 6 weeks. Buyers are asking questions now.' },
    { name: 'Cyber war exclusion adoption', reason: 'LMA mandatory adoption date approaching. Market is actively navigating this.' },
    { name: 'Delegated authority digitisation', reason: 'Persistent theme gaining momentum in Lloyd\'s Blueprint Two context.' },
  ]),
  recommended_angles: JSON.stringify([
    { angle: 'Explain what FCA CP26/7 means practically for underwriting teams', format: 'LinkedIn post + email commentary' },
    { angle: 'Position on cyber war exclusion as a clarity opportunity, not a restriction', format: 'Trade media pitch' },
  ]),
  competitor_move: 'Competitor A published a thought leadership piece on AI explainability this week — first mover in this conversation. Whitespace: no one has addressed the practical compliance implementation challenge yet.',
  content_mix: JSON.stringify(['2x LinkedIn posts', '1x email commentary', '1x trade media pitch']),
  thing_to_ignore: 'General market softening commentary — too broad, not specific to your buyers, and doesn\'t reflect specialty lines dynamics.',
  full_content: '',
  week_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
};

const DEMO_THEMES: Theme[] = [
  { id: 't1', name: 'AI governance in underwriting', classification: 'Building', score: 82, momentum_7d: 12, momentum_90d: 68, competitor_activity: 72, icp_relevance: 88, narrative_fit: 76, recommended_action: 'act_now' },
  { id: 't2', name: 'Cyber war exclusion evolution', classification: 'Immediate', score: 91, momentum_7d: 24, momentum_90d: 38, competitor_activity: 85, icp_relevance: 94, narrative_fit: 82, recommended_action: 'act_now' },
  { id: 't3', name: 'Delegated authority digitisation', classification: 'Established', score: 65, momentum_7d: 8, momentum_90d: 55, competitor_activity: 60, icp_relevance: 78, narrative_fit: 71, recommended_action: 'reinforce' },
  { id: 't4', name: 'Parametric insurance growth', classification: 'Building', score: 58, momentum_7d: 15, momentum_90d: 42, competitor_activity: 45, icp_relevance: 62, narrative_fit: 55, recommended_action: 'monitor' },
];

const ACTION_COLORS: Record<string, string> = {
  act_now: 'text-red-400 bg-red-400/10 border-red-400/20',
  monitor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  reinforce: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ignore: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
const ACTION_LABELS: Record<string, string> = {
  act_now: 'Act Now', monitor: 'Monitor', reinforce: 'Reinforce', ignore: 'Ignore',
};
const CLASS_COLORS: Record<string, string> = {
  Immediate: 'text-red-400 bg-red-400/10 border-red-400/20',
  Building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Established: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Structural: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

function safeParse<T>(val: string | undefined, fallback: T): T {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}

export default function BriefingPage() {
  const [activeTab, setActiveTab] = useState<SubView>('weekly');
  const [weekly, setWeekly] = useState<Partial<WeeklyPriority> | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyGenerating, setWeeklyGenerating] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [rivalsLoading, setRivalsLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [briefingGenerating, setBriefingGenerating] = useState(false);
  const [expandedBriefing, setExpandedBriefing] = useState<string | null>(null);

  // Builder form state
  const [meetingWith, setMeetingWith] = useState('');
  const [meetingType, setMeetingType] = useState('client');
  const [meetingDate, setMeetingDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [tone, setTone] = useState('executive');

  const loadWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch('/api/reports/weekly');
      if (res.ok) {
        const data = await res.json();
        setWeekly(data.report || DEMO_WEEKLY);
      } else {
        setWeekly(DEMO_WEEKLY);
      }
    } catch { setWeekly(DEMO_WEEKLY); }
    finally { setWeeklyLoading(false); }
  }, []);

  const generateWeekly = async () => {
    setWeeklyGenerating(true);
    try {
      const res = await fetch('/api/reports/weekly', { method: 'POST' });
      if (res.ok) { await loadWeekly(); }
    } catch {}
    finally { setWeeklyGenerating(false); }
  };

  const loadThemes = useCallback(async () => {
    setThemesLoading(true);
    try {
      const res = await fetch('/api/themes');
      if (res.ok) {
        const data = await res.json();
        setThemes(data.themes?.length ? data.themes : DEMO_THEMES);
      } else { setThemes(DEMO_THEMES); }
    } catch { setThemes(DEMO_THEMES); }
    finally { setThemesLoading(false); }
  }, []);

  const loadRivals = useCallback(async () => {
    setRivalsLoading(true);
    try {
      const res = await fetch('/api/competitive');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.mentions || []);
      }
    } catch {}
    finally { setRivalsLoading(false); }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {}
    finally { setReportsLoading(false); }
  }, []);

  const loadBriefings = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing');
      if (res.ok) {
        const data = await res.json();
        setBriefings(data.briefings || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'weekly') loadWeekly();
    else if (activeTab === 'themes') loadThemes();
    else if (activeTab === 'rivals') loadRivals();
    else if (activeTab === 'reports') loadReports();
    else if (activeTab === 'builder') loadBriefings();
  }, [activeTab, loadWeekly, loadThemes, loadRivals, loadReports, loadBriefings]);

  const generateReport = async (type: string) => {
    setReportGenerating(type);
    try {
      const endpoint = type === 'monthly' ? '/api/reports/monthly' : '/api/reports/quarterly';
      await fetch(endpoint, { method: 'POST' });
      await loadReports();
    } catch {}
    finally { setReportGenerating(null); }
  };

  const handleGenerateBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    setBriefingGenerating(true);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefing_type: 'meeting_briefing',
          context: { meetingWith, meetingType, meetingDate, agenda, tone },
        }),
      });
      if (res.ok) {
        setMeetingWith(''); setMeetingDate(''); setAgenda('');
        await loadBriefings();
      }
    } catch {}
    finally { setBriefingGenerating(false); }
  };

  const tabs: { key: SubView; label: string }[] = [
    { key: 'weekly', label: 'Weekly Priority' },
    { key: 'themes', label: 'Themes' },
    { key: 'rivals', label: 'Rivals' },
    { key: 'reports', label: 'Reports' },
    { key: 'builder', label: 'Brief Builder' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FileStack className="w-6 h-6 text-[var(--accent)]" /> Briefing
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Strategic intelligence, competitive context, and meeting-ready briefings
          </p>
        </div>
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

      {/* Weekly Priority */}
      {activeTab === 'weekly' && (
        <div className="space-y-5">
          {weeklyLoading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading weekly priority...
            </div>
          ) : (
            <>
              {/* Header card */}
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-1">This week</p>
                  <p className="text-[var(--text-secondary)] text-sm">
                    {weekly?.week_start
                      ? `Week of ${new Date(weekly.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
                      : 'Current week'}
                    {weekly?.created_at && (
                      <span className="ml-2 text-[var(--text-secondary)]/60">
                        · Generated {new Date(weekly.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={generateWeekly}
                  disabled={weeklyGenerating}
                  className="flex items-center gap-1.5 text-sm"
                >
                  {weeklyGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Regenerate
                </Button>
              </div>

              {/* Top themes */}
              <WeeklySection title="Top 3 themes this week" icon={<TrendingUp className="w-4 h-4" />}>
                <div className="space-y-3">
                  {safeParse<{ name: string; reason: string }[]>(weekly?.top_themes, []).map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{t.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </WeeklySection>

              {/* Recommended angles */}
              <WeeklySection title="Top 2 angles to own" icon={<Target className="w-4 h-4" />}>
                <div className="space-y-3">
                  {safeParse<{ angle: string; format: string }[]>(weekly?.recommended_angles, []).map((a, i) => (
                    <div key={i} className="rounded-lg bg-[var(--navy-lighter)] p-3 space-y-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{a.angle}</p>
                      <p className="text-xs text-[var(--accent)]">{a.format}</p>
                    </div>
                  ))}
                </div>
              </WeeklySection>

              {/* Competitor move */}
              {weekly?.competitor_move && (
                <WeeklySection title="1 competitor move worth noting" icon={<Crosshair className="w-4 h-4" />}>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{weekly.competitor_move}</p>
                </WeeklySection>
              )}

              {/* Content mix */}
              <WeeklySection title="Recommended content mix" icon={<BarChart3 className="w-4 h-4" />}>
                <div className="flex flex-wrap gap-2">
                  {safeParse<string[]>(weekly?.content_mix, []).map((item, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--navy-lighter)] text-[var(--text-primary)]">
                      {item}
                    </span>
                  ))}
                </div>
              </WeeklySection>

              {/* Thing to ignore */}
              {weekly?.thing_to_ignore && (
                <WeeklySection title="1 thing to ignore this week" icon={<X className="w-4 h-4 text-slate-400" />} muted>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{weekly.thing_to_ignore}</p>
                </WeeklySection>
              )}

              <div className="pt-2">
                <a href="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                  Open Opportunities to act on these angles <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Themes */}
      {activeTab === 'themes' && (
        <div className="space-y-4">
          {themesLoading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            </div>
          ) : (
            themes.map(theme => (
              <div key={theme.id} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${CLASS_COLORS[theme.classification] || CLASS_COLORS.Building}`}>
                        {theme.classification}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${ACTION_COLORS[theme.recommended_action] || ACTION_COLORS.monitor}`}>
                        {ACTION_LABELS[theme.recommended_action] || 'Monitor'}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{theme.name}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-[var(--accent)]">{Math.round(theme.score)}</p>
                    <p className="text-xs text-[var(--text-secondary)]">score</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[var(--border)]">
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
            ))
          )}
        </div>
      )}

      {/* Rivals */}
      {activeTab === 'rivals' && (
        <div className="space-y-4">
          {rivalsLoading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            </div>
          ) : competitors.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Crosshair className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-secondary)]">No competitor data yet</p>
              <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">
                Add competitors in your{' '}
                <a href="/narrative" className="text-[var(--accent)] hover:underline">Narrative settings</a>{' '}
                to track their movements.
              </p>
            </div>
          ) : (
            (() => {
              const grouped = competitors.reduce<Record<string, Competitor[]>>((acc, c) => {
                acc[c.competitor_name] = acc[c.competitor_name] || [];
                acc[c.competitor_name].push(c);
                return acc;
              }, {});
              return Object.entries(grouped).map(([name, mentions]) => (
                <div key={name} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{name}</h3>
                    <span className="text-xs text-[var(--text-secondary)]">{mentions.length} mention{mentions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {mentions.slice(0, 3).map((m, i) => (
                      <p key={i} className="text-sm text-[var(--text-secondary)]">{m.mention_context}</p>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      )}

      {/* Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => generateReport('monthly')}
              disabled={reportGenerating === 'monthly'}
              className="text-sm flex items-center gap-1.5"
            >
              {reportGenerating === 'monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Monthly Report
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateReport('quarterly')}
              disabled={reportGenerating === 'quarterly'}
              className="text-sm flex items-center gap-1.5"
            >
              {reportGenerating === 'quarterly' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Quarterly Review
            </Button>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-secondary)]">No reports yet</p>
              <p className="text-sm text-[var(--text-secondary)]/60">Generate your first monthly intelligence report above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--navy-lighter)] capitalize">
                          {report.report_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{report.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {new Date(report.period_start).toLocaleDateString()} – {new Date(report.period_end).toLocaleDateString()}
                        {' · '}Generated {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {expandedReport === report.id ? 'Hide' : 'View'}
                      </button>
                      <ExportPdfButton title={report.title} companyName="" content={report.content} filename={report.title} />
                    </div>
                  </div>
                  {expandedReport === report.id && (
                    <div className="px-5 pb-5 border-t border-[var(--border)] pt-4">
                      <div className="prose-content max-h-96 overflow-y-auto">
                        <SimpleMarkdown content={report.content} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brief Builder */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Build a meeting briefing</h3>
            <form onSubmit={handleGenerateBriefing} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Who is this meeting with?</label>
                  <input
                    type="text"
                    value={meetingWith}
                    onChange={e => setMeetingWith(e.target.value)}
                    placeholder="e.g. CUO at Beazley"
                    required
                    className="w-full px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Meeting type</label>
                  <select
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="client">Client meeting</option>
                    <option value="investor">Investor meeting</option>
                    <option value="partner">Partner / distribution</option>
                    <option value="board">Board update</option>
                    <option value="event">Event / panel</option>
                    <option value="podcast">Podcast / interview</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Desired tone</label>
                  <select
                    value={tone}
                    onChange={e => setTone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="executive">Executive</option>
                    <option value="technical">Technical</option>
                    <option value="commercial">Commercial</option>
                    <option value="diplomatic">Diplomatic</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Agenda / context</label>
                <textarea
                  value={agenda}
                  onChange={e => setAgenda(e.target.value)}
                  placeholder="What are you hoping to discuss or achieve? Any specific topics, concerns, or context the briefing should address?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
              <Button type="submit" variant="primary" disabled={briefingGenerating} className="flex items-center gap-1.5 text-sm">
                {briefingGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate briefing
              </Button>
            </form>
          </div>

          {briefings.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Previous briefings</h3>
              {briefings.map(b => {
                const meta = safeParse<Record<string, string>>(b.metadata, {});
                return (
                  <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{b.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {meta.meetingType && <span className="capitalize">{meta.meetingType.replace(/_/g, ' ')} · </span>}
                          {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpandedBriefing(expandedBriefing === b.id ? null : b.id)}
                          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 px-2 py-1 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" /> {expandedBriefing === b.id ? 'Hide' : 'View'}
                        </button>
                        <ExportPdfButton title={b.title} companyName="" content={b.content} filename={b.title} />
                      </div>
                    </div>
                    {expandedBriefing === b.id && (
                      <div className="px-5 pb-5 border-t border-[var(--border)] pt-4">
                        <div className="prose-content max-h-96 overflow-y-auto">
                          <SimpleMarkdown content={b.content} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeeklySection({ title, icon, children, muted = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className={muted ? 'text-[var(--text-secondary)]' : 'text-[var(--accent)]'}>{icon}</span>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}
