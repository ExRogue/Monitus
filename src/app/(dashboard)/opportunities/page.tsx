'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Target,
  Zap,
  Plus,
  ArrowRight,
  Bookmark,
  CheckCircle,
  X,
  ChevronDown,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Eye,
  Loader2,
  Edit3,
  Filter,
  RefreshCw,
  Radio,
  BarChart3,
  Clock,
  Users,
  Crosshair,
  Flag,
  FileText,
  ExternalLink,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

/* ──────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────── */

type OpportunityType = 'Signal-Led' | 'Theme-Led' | 'Rival-Led' | 'Topic-Led';
type OpportunityStage = 'Monitor' | 'Analyse' | 'Draft' | 'Review' | 'Ready';
type RecommendedFormat =
  | 'LinkedIn Post'
  | 'Email Commentary'
  | 'Trade Media Pitch'
  | 'Briefing Snippet';
type ToneOption = 'Direct' | 'Measured' | 'Thought-leadership';

interface SourceArticle {
  title: string;
  source: string;
  source_url: string;
  published_at: string;
}

interface Opportunity {
  id: string;
  type: OpportunityType;
  stage: OpportunityStage;
  title: string;
  summary: string;
  why_it_matters: string;
  narrative_pillar: string;
  competitor_context: string;
  buyer_relevance: string;
  recommended_angle: string;
  recommended_format: RecommendedFormat;
  urgency_score: number;
  opportunity_score: number;
  saved: boolean;
  dismissed: boolean;
  created_at: string;
  source_signal_ids: string;
  source_article?: SourceArticle | null;
}

type FilterTab = 'All' | OpportunityType;

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

function normalizeType(raw: string): OpportunityType {
  const lower = (raw || '').toLowerCase().replace(/[_-]/g, '');
  if (lower.includes('signal')) return 'Signal-Led';
  if (lower.includes('theme')) return 'Theme-Led';
  if (lower.includes('rival')) return 'Rival-Led';
  if (lower.includes('topic')) return 'Topic-Led';
  return 'Signal-Led';
}

function normalizeStage(raw: string): OpportunityStage {
  const lower = (raw || '').toLowerCase();
  if (lower === 'ready') return 'Ready';
  if (lower === 'review') return 'Review';
  if (lower === 'draft') return 'Draft';
  if (lower === 'analyse' || lower === 'analyze') return 'Analyse';
  return 'Monitor';
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (score >= 50) return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  return 'bg-red-500/10 border-red-500/20 text-red-400';
}

function stageBadgeVariant(stage: OpportunityStage): 'default' | 'success' | 'warning' | 'error' | 'purple' {
  switch (stage) {
    case 'Ready': return 'success';
    case 'Review': return 'purple';
    case 'Draft': return 'warning';
    case 'Analyse': return 'default';
    case 'Monitor': return 'default';
  }
}

function typeIcon(type: OpportunityType) {
  switch (type) {
    case 'Signal-Led': return Radio;
    case 'Theme-Led': return TrendingUp;
    case 'Rival-Led': return Crosshair;
    case 'Topic-Led': return Target;
  }
}

function typeColor(type: OpportunityType): string {
  switch (type) {
    case 'Signal-Led': return 'text-[var(--accent)]';
    case 'Theme-Led': return 'text-[var(--purple)]';
    case 'Rival-Led': return 'text-amber-400';
    case 'Topic-Led': return 'text-emerald-400';
  }
}

function typeBg(type: OpportunityType): string {
  switch (type) {
    case 'Signal-Led': return 'bg-[var(--accent)]/10';
    case 'Theme-Led': return 'bg-[var(--purple)]/10';
    case 'Rival-Led': return 'bg-amber-400/10';
    case 'Topic-Led': return 'bg-emerald-400/10';
  }
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const FILTER_TABS: FilterTab[] = ['All', 'Signal-Led', 'Theme-Led', 'Rival-Led', 'Topic-Led'];
const STAGES: OpportunityStage[] = ['Monitor', 'Analyse', 'Draft', 'Review', 'Ready'];
const TONES: ToneOption[] = ['Direct', 'Measured', 'Thought-leadership'];

/* ──────────────────────────────────────────────────────────────────────────
 * Opportunity Card
 * ────────────────────────────────────────────────────────────────────────── */

interface OpportunityCardProps {
  opp: Opportunity;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDismiss: (id: string) => void;
  onToggleSave: (id: string) => void;
  onStageChange: (id: string, stage: OpportunityStage) => void;
  onGenerate: (opp: Opportunity) => void;
  onRequestAngle: (id: string) => void;
  generatingId: string | null;
  requestingAngleId: string | null;
}

function OpportunityCard({
  opp,
  isExpanded,
  onToggleExpand,
  onDismiss,
  onToggleSave,
  onStageChange,
  onGenerate,
  onRequestAngle,
  generatingId,
  requestingAngleId,
}: OpportunityCardProps) {
  const TypeIcon = typeIcon(opp.type);
  const isGenerating = generatingId === opp.id;
  const isRequestingAngle = requestingAngleId === opp.id;

  return (
    <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] overflow-hidden transition-all">
      {/* Card header -- always visible */}
      <div className="p-5">
        {/* Top row: type chip + scores + stage + actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${typeBg(opp.type)} ${typeColor(opp.type)} border-current/20`}>
              <TypeIcon className="w-3 h-3" />
              {opp.type}
            </span>
            {/* Stage badge */}
            <Badge variant={stageBadgeVariant(opp.stage)} size="sm">
              {opp.stage}
            </Badge>
            {/* Urgency */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${scoreBg(opp.urgency_score)}`}>
              <Zap className="w-2.5 h-2.5" />
              {opp.urgency_score} urgency
            </span>
            {/* Opportunity score */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${scoreBg(opp.opportunity_score)}`}>
              <BarChart3 className="w-2.5 h-2.5" />
              {opp.opportunity_score} score
            </span>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onToggleSave(opp.id)}
              title={opp.saved ? 'Remove from saved' : 'Save / Prioritise'}
              className={`p-1.5 rounded-lg transition-colors ${
                opp.saved
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10'
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDismiss(opp.id)}
              title="Dismiss"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug mb-1">
          {opp.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
          {opp.summary}
        </p>

        {/* Source article link */}
        {opp.source_article && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Radio className="w-3 h-3 text-[var(--accent)]" />
            <span>Based on:</span>
            {opp.source_article.source_url ? (
              <a
                href={opp.source_article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 truncate max-w-[400px]"
              >
                {opp.source_article.title}
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              </a>
            ) : (
              <span className="text-[var(--text-secondary)] truncate max-w-[400px]">{opp.source_article.title}</span>
            )}
            {opp.source_article.source && (
              <span className="text-[var(--text-muted)] flex-shrink-0">({opp.source_article.source})</span>
            )}
          </div>
        )}

        {/* Recommended angle + format strip */}
        {opp.recommended_angle && (
          <div className="mt-3 flex items-start gap-2 bg-[var(--navy)]/60 rounded-lg p-3 border border-[var(--border)]">
            <Flag className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Recommended angle</p>
              <p className="text-sm text-[var(--text-primary)] font-medium leading-snug">
                {opp.recommended_angle}
              </p>
              {opp.recommended_format && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Format: <span className="text-[var(--accent)]">{opp.recommended_format}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Expand/collapse + metadata row */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(opp.created_at)}
            </span>
          </div>
          <button
            onClick={() => onToggleExpand(opp.id)}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {isExpanded ? 'Less detail' : 'Full analysis'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] bg-[var(--navy)]/40">
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailBlock icon={AlertTriangle} label="Why it matters" text={opp.why_it_matters} iconClass="text-amber-400" />
            <DetailBlock icon={Sparkles} label="Narrative alignment" text={opp.narrative_pillar} iconClass="text-[var(--accent)]" />
            <DetailBlock icon={Crosshair} label="Competitor context" text={opp.competitor_context} iconClass="text-red-400" />
            <DetailBlock icon={Users} label="Buyer relevance" text={opp.buyer_relevance} iconClass="text-[var(--purple)]" />
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="border-t border-[var(--border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--navy)]/20 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Generate Content */}
          <Button
            variant="primary"
            size="sm"
            loading={isGenerating}
            onClick={() => onGenerate(opp)}
          >
            {!isGenerating && <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            Generate Content
          </Button>

          {/* Request Different Angle */}
          <Button
            variant="secondary"
            size="sm"
            loading={isRequestingAngle}
            onClick={() => onRequestAngle(opp.id)}
          >
            {!isRequestingAngle && <Edit3 className="w-3.5 h-3.5 mr-1.5" />}
            Different Angle
          </Button>
        </div>

        {/* Stage selector */}
        <div className="relative flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <div className="relative">
            <select
              value={opp.stage}
              onChange={e => onStageChange(opp.id, e.target.value as OpportunityStage)}
              className="appearance-none bg-[var(--navy-lighter)] border border-[var(--border)] text-[var(--text-secondary)] text-xs rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] cursor-pointer"
            >
              {STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  icon: Icon,
  label,
  text,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  text: string;
  iconClass: string;
}) {
  if (!text) return null;
  return (
    <div className="space-y-1">
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${iconClass}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{text}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Manual topic form
 * ────────────────────────────────────────────────────────────────────────── */

interface ManualTopicFormProps {
  onClose: () => void;
  onSubmit: (topic: string, tone: ToneOption) => Promise<void>;
  submitting: boolean;
  error: string;
}

function ManualTopicForm({ onClose, onSubmit, submitting, error }: ManualTopicFormProps) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<ToneOption>('Measured');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    await onSubmit(topic.trim(), tone);
  };

  return (
    <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--accent)]/40 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent)]" />
          Add Manual Topic
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            What do you want to comment on?
          </label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. The FCA's latest guidance on Consumer Duty for commercial intermediaries..."
            rows={3}
            maxLength={1000}
            className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] resize-none"
            required
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-[var(--text-muted)]">{topic.length}/1000</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Recommended tone
          </label>
          <div className="relative">
            <select
              value={tone}
              onChange={e => setTone(e.target.value as ToneOption)}
              className="w-full appearance-none bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 pr-9 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
            >
              {TONES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" size="sm" loading={submitting}>
            {!submitting && <ArrowRight className="w-3.5 h-3.5 mr-1.5" />}
            Create Opportunity
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Main page
 * ────────────────────────────────────────────────────────────────────────── */

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNarrative, setHasNarrative] = useState<boolean | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [requestingAngleId, setRequestingAngleId] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  const loadOpportunities = useCallback(async (silent = false, autoGen = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    if (autoGen) setGenerating(true);

    try {
      const url = autoGen ? '/api/opportunities?auto_generate=true' : '/api/opportunities';
      const res = await fetch(url);
      if (!res.ok) {
        setOpportunities([]);
        setHasNarrative(false);
        return;
      }
      const data = await res.json();

      if (data.has_narrative === false) {
        setHasNarrative(false);
        setOpportunities([]);
        return;
      }

      setHasNarrative(true);

      const items: Opportunity[] = (Array.isArray(data.opportunities) ? data.opportunities : []).map((o: any) => ({
        ...o,
        type: normalizeType(o.type),
        stage: normalizeStage(o.stage),
        urgency_score: Number(o.urgency_score) || 0,
        opportunity_score: Number(o.opportunity_score) || 0,
        saved: !!o.saved,
        dismissed: !!o.dismissed,
        source_article: o.source_article || null,
      }));

      setOpportunities(items);
      if (data.generated_count > 0) {
        setGeneratedCount(data.generated_count);
      }
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunities(false, true); // auto-generate on first load
  }, [loadOpportunities]);

  const handleDismiss = (id: string) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, dismissed: true } : o));
  };

  const handleToggleSave = (id: string) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, saved: !o.saved } : o));
  };

  const handleStageChange = (id: string, stage: OpportunityStage) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleGenerate = async (opp: Opportunity) => {
    setGeneratingId(opp.id);
    setGenerateSuccess(null);
    setGenerateError(null);
    try {
      const res = await fetch('/api/generate/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${opp.title}. ${opp.summary}`,
          context: `Recommended angle: ${opp.recommended_angle}. Buyer relevance: ${opp.buyer_relevance}`,
          contentTypes: [opp.recommended_format.toLowerCase().replace(/ /g, '_')],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || 'Generation failed. Please try again.');
        return;
      }
      setGenerateSuccess(opp.id);
      handleStageChange(opp.id, 'Draft');
    } catch {
      setGenerateError('Network error. Please check your connection.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRequestAngle = async (id: string) => {
    setRequestingAngleId(id);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setRequestingAngleId(null);
  };

  const handleManualSubmit = async (topic: string, tone: ToneOption) => {
    setManualSubmitting(true);
    setManualError('');
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic,
          summary: topic,
          type: 'Topic-Led',
          recommended_format: tone === 'Direct' ? 'LinkedIn Post' : tone === 'Thought-leadership' ? 'Trade Media Pitch' : 'Email Commentary',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setManualError(data.error || 'Failed to create opportunity. Please try again.');
        return;
      }
      const data = await res.json();
      const newOpp: Opportunity = {
        id: data.opportunity?.id || `manual-${Date.now()}`,
        type: 'Topic-Led',
        stage: 'Analyse',
        title: topic,
        summary: topic,
        why_it_matters: data.opportunity?.why_it_matters || '',
        narrative_pillar: data.opportunity?.narrative_pillar || '',
        competitor_context: data.opportunity?.competitor_context || '',
        buyer_relevance: data.opportunity?.buyer_relevance || '',
        recommended_angle: data.opportunity?.recommended_angle || `${tone} commentary on this topic.`,
        recommended_format: (tone === 'Direct' ? 'LinkedIn Post' : tone === 'Thought-leadership' ? 'Trade Media Pitch' : 'Email Commentary') as RecommendedFormat,
        urgency_score: Number(data.opportunity?.urgency_score) || 50,
        opportunity_score: Number(data.opportunity?.opportunity_score) || 50,
        saved: false,
        dismissed: false,
        created_at: new Date().toISOString(),
        source_signal_ids: '[]',
        source_article: null,
      };
      setOpportunities(prev => [newOpp, ...prev]);
      setShowManualForm(false);
    } catch {
      setManualError('Network error. Please check your connection.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setGeneratedCount(0);
    loadOpportunities(true, true);
  };

  /* Filtered + non-dismissed opportunities */
  const visible = opportunities.filter(o => {
    if (o.dismissed) return false;
    if (activeFilter === 'All') return true;
    return o.type === activeFilter;
  });

  const savedCount = opportunities.filter(o => !o.dismissed && o.saved).length;
  const totalActive = opportunities.filter(o => !o.dismissed).length;

  // Still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">
            {generating ? 'Generating opportunities from your signals...' : 'Loading opportunities...'}
          </p>
        </div>
      </div>
    );
  }

  // Gate: No narrative defined
  if (hasNarrative === false) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Define your Narrative first</h1>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Opportunities are generated from market signals scored against your company narrative.
              Complete your Narrative so we can identify content opportunities that matter to your buyers.
            </p>
          </div>
          <a
            href="/narrative"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-medium text-sm hover:bg-[var(--accent)]/90 transition-colors"
          >
            Set up your Narrative <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New opportunities generated banner */}
      {generatedCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium text-emerald-300">{generatedCount} new {generatedCount === 1 ? 'opportunity' : 'opportunities'} generated</span>
            <span className="text-emerald-300/80"> from your latest analyzed signals.</span>
          </div>
          <button onClick={() => setGeneratedCount(0)} className="p-1 text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Opportunities</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Pre-prioritised moments to publish -- ranked by urgency and strategic fit.
              </p>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-light)] border border-[var(--border)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Refresh'}
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setShowManualForm(v => !v); setManualError(''); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Topic
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill icon={Target} label="Active" value={totalActive} color="text-[var(--accent)]" />
        <StatPill icon={Bookmark} label="Saved" value={savedCount} color="text-emerald-400" />
        <StatPill
          icon={Zap}
          label="High urgency"
          value={opportunities.filter(o => !o.dismissed && o.urgency_score >= 75).length}
          color="text-amber-400"
        />
        <StatPill
          icon={CheckCircle}
          label="Ready to publish"
          value={opportunities.filter(o => !o.dismissed && o.stage === 'Ready').length}
          color="text-[var(--purple)]"
        />
      </div>

      {/* Manual topic form (inline) */}
      {showManualForm && (
        <ManualTopicForm
          onClose={() => setShowManualForm(false)}
          onSubmit={handleManualSubmit}
          submitting={manualSubmitting}
          error={manualError}
        />
      )}

      {/* Generate success / error feedback */}
      {generateSuccess && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">
            Content generated successfully. Find it in your pipeline -- the stage has been updated to Draft.
          </p>
          <button onClick={() => setGenerateSuccess(null)} className="ml-auto p-1 text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {generateError && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{generateError}</p>
          <button onClick={() => setGenerateError(null)} className="ml-auto p-1 text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border)]">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mr-1" />
        {FILTER_TABS.map(tab => {
          const count =
            tab === 'All'
              ? totalActive
              : opportunities.filter(o => !o.dismissed && o.type === tab).length;
          const isActive = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
              }`}
            >
              {tab}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[var(--accent)]/20' : 'bg-[var(--navy-lighter)]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Opportunity list */}
      {visible.length > 0 ? (
        <div className="space-y-4">
          {visible.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              isExpanded={expandedId === opp.id}
              onToggleExpand={handleToggleExpand}
              onDismiss={handleDismiss}
              onToggleSave={handleToggleSave}
              onStageChange={handleStageChange}
              onGenerate={handleGenerate}
              onRequestAngle={handleRequestAngle}
              generatingId={generatingId}
              requestingAngleId={requestingAngleId}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--navy-light)] border border-[var(--border)] flex items-center justify-center">
            <Target className="w-7 h-7 text-[var(--text-muted)]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">No opportunities yet</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
              Opportunities are auto-generated from your analyzed signals. Visit the{' '}
              <a href="/signals" className="text-[var(--accent)] hover:underline">Signals</a>{' '}
              page to analyze market news first, or add a manual topic below.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/signals"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent)]/20 transition-colors"
            >
              <Radio className="w-3.5 h-3.5" />
              Go to Signals
            </a>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowManualForm(true); setManualError(''); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add a manual topic
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Stat pill (header summary)
 * ────────────────────────────────────────────────────────────────────────── */

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] px-4 py-3 flex items-center gap-3">
      <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)] truncate">{label}</p>
        <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
      </div>
    </div>
  );
}
