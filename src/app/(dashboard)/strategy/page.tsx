'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Lightbulb,
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
  Lock,
  Activity,
  Download,
  Calendar,
  Shield,
  Minus,
  MousePointerClick,
  Heart,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ExportPdfButton from '@/components/ExportPdfButton';

/* ──────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────── */

type StrategyTab = 'opportunities' | 'weekly' | 'reports' | 'builder' | 'recommendations';

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

interface Signal {
  id: string;
  title: string;
  narrative_fit: number;
  urgency: number;
  why_it_matters?: string;
  themes: string[];
}

interface ReinforceItem {
  title: string;
  content_type: string;
  views: number;
  clicks: number;
  reactions: number;
}

interface ContentPerformance {
  title: string;
  content_type: string;
  channel: string;
  views: number;
  clicks: number;
  reactions: number;
  published_at: string;
}

interface LearningStats {
  has_narrative: boolean;
  summary?: {
    total_signals: number;
    avg_narrative_fit: number;
    act_now_count: number;
    monitor_count: number;
    reinforce_count: number;
    ignore_count: number;
  };
  recommendations?: {
    act_now: Signal[];
    reinforce: ReinforceItem[];
    monitor: Signal[];
    ignore: Signal[];
  };
  content_performance?: ContentPerformance[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

function safeParse<T>(val: string | undefined, fallback: T): T {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}

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

function mapFormatToContentType(format: string): string {
  const lower = (format || '').toLowerCase();
  if (lower.includes('linkedin')) return 'linkedin';
  if (lower.includes('email')) return 'email';
  if (lower.includes('trade') || lower.includes('media')) return 'trade_media';
  if (lower.includes('briefing') || lower.includes('snippet')) return 'briefing';
  if (lower.includes('newsletter')) return 'newsletter';
  if (lower.includes('podcast')) return 'podcast';
  return 'linkedin'; // safe default
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

// Format-to-tier gating
const FORMAT_TIER_REQUIREMENTS: Record<string, { tier: string; tierDisplay: string }> = {
  'Trade Media Pitch': { tier: 'plan-professional', tierDisplay: 'Growth' },
  'trade_media': { tier: 'plan-professional', tierDisplay: 'Growth' },
  'Briefing Snippet': { tier: 'plan-enterprise', tierDisplay: 'Intelligence' },
  'briefing_builder': { tier: 'plan-enterprise', tierDisplay: 'Intelligence' },
};

const TIER_HIERARCHY = ['plan-trial', 'plan-starter', 'plan-professional', 'plan-enterprise'];

function isFormatLocked(format: string, userPlanId: string | null): { locked: boolean; requiredTier: string } {
  const requirement = FORMAT_TIER_REQUIREMENTS[format];
  if (!requirement) return { locked: false, requiredTier: '' };
  const currentIndex = TIER_HIERARCHY.indexOf(userPlanId || 'plan-trial');
  const requiredIndex = TIER_HIERARCHY.indexOf(requirement.tier);
  return {
    locked: currentIndex < requiredIndex,
    requiredTier: requirement.tierDisplay,
  };
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
  userPlanId: string | null;
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
  userPlanId,
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
              {opp.recommended_format && (() => {
                const gate = isFormatLocked(opp.recommended_format, userPlanId);
                return (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                    Format: {gate.locked ? (
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]" title={`Upgrade to ${gate.requiredTier} to access this format`}>
                        <Lock className="w-3 h-3" />
                        {opp.recommended_format}
                        <span className="text-[10px] text-amber-400 ml-1">Upgrade to {gate.requiredTier}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--accent)]">{opp.recommended_format}</span>
                    )}
                  </p>
                );
              })()}
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
 * Weekly Section helper
 * ────────────────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────────────────
 * Recommendation Section helper
 * ────────────────────────────────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
function RecommendationSection({
  title,
  desc,
  icon,
  border,
  bg,
  items,
  renderItem,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
  items: any[] | undefined;
  renderItem: (item: any) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-xl border ${border} ${bg} p-5 space-y-3`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="text-xs text-[var(--text-secondary)] ml-1">&mdash; {desc}</span>
      </div>
      <div className="space-y-2">
        {items.map(renderItem)}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Stat Pill helper
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

/* ──────────────────────────────────────────────────────────────────────────
 * Main page
 * ────────────────────────────────────────────────────────────────────────── */

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState<StrategyTab>('opportunities');

  // ── Opportunities state ──
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNarrative, setHasNarrative] = useState<boolean | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [userPlanId, setUserPlanId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [requestingAngleId, setRequestingAngleId] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  // ── Weekly Priorities state ──
  const [weekly, setWeekly] = useState<Partial<WeeklyPriority> | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyGenerating, setWeeklyGenerating] = useState(false);
  const [weeklyNeedsNarrative, setWeeklyNeedsNarrative] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [weeklyMessage, setWeeklyMessage] = useState('');

  // ── Reports state ──
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // ── Brief Builder state ──
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [briefingGenerating, setBriefingGenerating] = useState(false);
  const [expandedBriefing, setExpandedBriefing] = useState<string | null>(null);
  const [meetingWith, setMeetingWith] = useState('');
  const [meetingType, setMeetingType] = useState('client');
  const [meetingDate, setMeetingDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [tone, setTone] = useState('executive');

  // ── Recommendations state ──
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [learningLoading, setLearningLoading] = useState(true);
  const [learningError, setLearningError] = useState<string | null>(null);

  /* ── Opportunities data loading ── */
  const loadOpportunities = useCallback(async (silent = false, autoGen = false) => {
    if (!silent) setOppLoading(true);
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
      setOppLoading(false);
      setRefreshing(false);
      setGenerating(false);
    }
  }, []);

  /* ── Weekly data loading ── */
  const loadWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    setWeeklyNeedsNarrative(false);
    setCanGenerate(false);
    setWeeklyMessage('');
    try {
      const res = await fetch('/api/reports/weekly');
      if (res.ok) {
        const data = await res.json();
        if (data.needsNarrative) {
          setWeeklyNeedsNarrative(true);
          setWeekly(null);
        } else if (data.report) {
          setWeekly(data.report);
        } else {
          setWeekly(null);
          setCanGenerate(data.canGenerate || false);
          setWeeklyMessage(data.message || '');
        }
      } else {
        setWeekly(null);
      }
    } catch { setWeekly(null); }
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

  /* ── Reports data loading ── */
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

  const generateReport = async (type: string) => {
    setReportGenerating(type);
    try {
      const endpoint = type === 'monthly' ? '/api/reports/monthly' : '/api/reports/quarterly';
      await fetch(endpoint, { method: 'POST' });
      await loadReports();
    } catch {}
    finally { setReportGenerating(null); }
  };

  /* ── Briefings data loading ── */
  const loadBriefings = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing');
      if (res.ok) {
        const data = await res.json();
        setBriefings(data.briefings || []);
      }
    } catch {}
  }, []);

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

  /* ── Recommendations data loading ── */
  const loadLearningStats = useCallback(async () => {
    setLearningLoading(true);
    setLearningError(null);
    try {
      const res = await fetch('/api/learning/stats');
      if (!res.ok) throw new Error('Failed to load');
      const data: LearningStats = await res.json();
      setLearningStats(data);
    } catch {
      setLearningError('Failed to load recommendation data');
    } finally {
      setLearningLoading(false);
    }
  }, []);

  /* ── Tab-driven data loading ── */
  useEffect(() => {
    if (activeTab === 'opportunities') {
      loadOpportunities(false, true);
      fetch('/api/auth/me').then(r => r.json()).then(d => {
        setUserPlanId(d.plan?.plan_id || 'plan-trial');
      }).catch(() => setUserPlanId('plan-trial'));
    } else if (activeTab === 'weekly') {
      loadWeekly();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'builder') {
      loadBriefings();
    } else if (activeTab === 'recommendations') {
      loadLearningStats();
    }
  }, [activeTab, loadOpportunities, loadWeekly, loadReports, loadBriefings, loadLearningStats]);

  /* ── Opportunity handlers ── */
  const handleDismiss = async (id: string) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, dismissed: true } : o));
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true }),
      });
    } catch {
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, dismissed: false } : o));
    }
  };

  const handleToggleSave = async (id: string) => {
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return;
    const newSaved = !opp.saved;
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, saved: newSaved } : o));
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved: newSaved }),
      });
    } catch {
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, saved: !newSaved } : o));
    }
  };

  const handleStageChange = async (id: string, stage: OpportunityStage) => {
    const opp = opportunities.find(o => o.id === id);
    const prevStage = opp?.stage;
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
    } catch {
      if (prevStage) {
        setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage: prevStage } : o));
      }
    }
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
          contentTypes: [mapFormatToContentType(opp.recommended_format)],
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
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return;
    setRequestingAngleId(id);
    try {
      const res = await fetch('/api/generate/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Suggest a different angle for: ${opp.title}. ${opp.summary}`,
          context: `Current angle: ${opp.recommended_angle}. Please suggest an alternative angle or perspective.`,
          contentTypes: ['linkedin'],
        }),
      });
      if (res.ok) {
        setGenerateSuccess(id);
        handleStageChange(id, 'Draft');
      } else {
        setGenerateError('Could not generate a different angle. Please try again.');
      }
    } catch {
      setGenerateError('Network error. Please check your connection.');
    } finally {
      setRequestingAngleId(null);
    }
  };

  const handleManualSubmit = async (topic: string, manualTone: ToneOption) => {
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
          recommended_format: manualTone === 'Direct' ? 'LinkedIn Post' : manualTone === 'Thought-leadership' ? 'Trade Media Pitch' : 'Email Commentary',
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
        recommended_angle: data.opportunity?.recommended_angle || `${manualTone} commentary on this topic.`,
        recommended_format: (manualTone === 'Direct' ? 'LinkedIn Post' : manualTone === 'Thought-leadership' ? 'Trade Media Pitch' : 'Email Commentary') as RecommendedFormat,
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

  /* ── Tab config ── */
  const tabs: { key: StrategyTab; label: string }[] = [
    { key: 'opportunities', label: 'Opportunities' },
    { key: 'weekly', label: 'Weekly Priorities' },
    { key: 'reports', label: 'Reports' },
    { key: 'builder', label: 'Brief Builder' },
    { key: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-[var(--accent)]" /> Strategy Partner
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Converting market intelligence into strategic decisions and content angles
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

      {/* ════════════════════════════════════════════════════════════════════
       * TAB: Opportunities
       * ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'opportunities' && (
        <>
          {oppLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {generating ? 'Generating opportunities from your signals...' : 'Loading opportunities...'}
                </p>
              </div>
            </div>
          ) : hasNarrative === false ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Define your Narrative first</h2>
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
          ) : (
            <div className="space-y-6">
              {/* New opportunities generated banner */}
              {generatedCount > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-medium text-emerald-300">{generatedCount} new {generatedCount === 1 ? 'opportunity' : 'opportunities'} generated</span>
                    <span className="text-emerald-300/80"> from your latest analysed signals.</span>
                  </div>
                  <button onClick={() => setGeneratedCount(0)} className="p-1 text-emerald-400 hover:text-emerald-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Header actions */}
              <div className="flex items-center justify-end gap-2">
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
                      userPlanId={userPlanId}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--navy-light)] border border-[var(--border)] flex items-center justify-center">
                    <Target className="w-7 h-7 text-[var(--text-muted)]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">No opportunities yet</h3>
                    <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                      Opportunities are auto-generated from your analysed signals. Visit the{' '}
                      <a href="/signals" className="text-[var(--accent)] hover:underline">Market Analyst</a>{' '}
                      page to analyse market news first, or add a manual topic below.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="/signals"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent)]/20 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Go to Market Analyst
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
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
       * TAB: Weekly Priorities
       * ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'weekly' && (
        <div className="space-y-5">
          {weeklyLoading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading weekly priority...
            </div>
          ) : weeklyNeedsNarrative ? (
            <div className="text-center py-16 space-y-3">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 opacity-60" />
              <p className="font-medium text-[var(--text-primary)]">Set up your Narrative first</p>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                The Weekly Priority View generates insights based on your company narrative and analysed signals. Complete your narrative to get started.
              </p>
              <a
                href="/narrative"
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" /> Go to Narrative
              </a>
            </div>
          ) : !weekly ? (
            <div className="text-center py-16 space-y-3">
              <Activity className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-primary)]">No weekly brief yet</p>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                {weeklyMessage || 'Generate this week\'s priority view from your analysed signals.'}
              </p>
              {canGenerate ? (
                <Button
                  variant="primary"
                  onClick={generateWeekly}
                  disabled={weeklyGenerating}
                  className="mt-2 flex items-center gap-1.5 text-sm mx-auto"
                >
                  {weeklyGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {weeklyGenerating ? 'Generating...' : 'Generate this week\'s brief'}
                </Button>
              ) : (
                <a
                  href="/signals"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-[var(--accent)] hover:underline"
                >
                  <Zap className="w-4 h-4" /> Analyse signals first
                </a>
              )}
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
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
       * TAB: Reports
       * ════════════════════════════════════════════════════════════════════ */}
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

      {/* ════════════════════════════════════════════════════════════════════
       * TAB: Brief Builder
       * ════════════════════════════════════════════════════════════════════ */}
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

      {/* ════════════════════════════════════════════════════════════════════
       * TAB: Recommendations
       * ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {learningLoading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading recommendations...
            </div>
          ) : learningError ? (
            <div className="flex items-center justify-center py-20 text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" /> {learningError}
            </div>
          ) : !learningStats?.has_narrative ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-10 text-center space-y-3">
              <Lightbulb className="w-10 h-10 text-[var(--text-secondary)] mx-auto" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Set up your narrative first</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Recommendations are based on your signal intelligence and content performance. Create your narrative to start generating signals and tracking performance.
              </p>
              <a
                href="/narrative"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mt-2"
              >
                Go to Narrative <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : !(learningStats?.summary && (learningStats.summary.total_signals ?? 0) > 0) ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-10 text-center space-y-3">
              <Activity className="w-10 h-10 text-[var(--text-secondary)] mx-auto" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">No signal data yet</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Recommendations will appear as you publish content and signals are analysed. Check back after your first signals have been processed.
              </p>
            </div>
          ) : (
            <>
              {/* Act Now */}
              <RecommendationSection
                title="Act Now"
                desc="High-fit signals with no content generated yet"
                icon={<Zap className="w-4 h-4 text-red-400" />}
                border="border-red-500/20"
                bg="bg-red-500/5"
                items={learningStats.recommendations?.act_now}
                renderItem={(signal: Signal) => (
                  <div key={signal.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Fit {signal.narrative_fit}% · Urgency {signal.urgency}
                        {signal.why_it_matters && ` · ${signal.why_it_matters.slice(0, 80)}${signal.why_it_matters.length > 80 ? '...' : ''}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('opportunities')}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      Create content <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              />

              {/* Reinforce */}
              <RecommendationSection
                title="Reinforce"
                desc="Published content that performed well -- keep the thread alive"
                icon={<Shield className="w-4 h-4 text-blue-400" />}
                border="border-blue-500/20"
                bg="bg-blue-500/5"
                items={learningStats.recommendations?.reinforce}
                renderItem={(item: ReinforceItem) => (
                  <div key={item.title} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {item.clicks}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {item.reactions}</span>
                      </div>
                    </div>
                  </div>
                )}
              />

              {/* Monitor */}
              <RecommendationSection
                title="Monitor"
                desc="Building but not yet urgent -- watch for inflection"
                icon={<Activity className="w-4 h-4 text-amber-400" />}
                border="border-amber-500/20"
                bg="bg-amber-500/5"
                items={learningStats.recommendations?.monitor}
                renderItem={(signal: Signal) => (
                  <div key={signal.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Fit {signal.narrative_fit}% · Urgency {signal.urgency}
                      </p>
                    </div>
                  </div>
                )}
              />

              {/* Ignore */}
              <RecommendationSection
                title="Ignore"
                desc="Low relevance or low narrative fit"
                icon={<Minus className="w-4 h-4 text-slate-400" />}
                border="border-slate-500/20"
                bg="bg-slate-500/5"
                items={learningStats.recommendations?.ignore}
                renderItem={(signal: Signal) => (
                  <div key={signal.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--navy-light)] p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Fit {signal.narrative_fit}%
                        {signal.themes.length > 0 && ` · ${signal.themes.slice(0, 2).join(', ')}`}
                      </p>
                    </div>
                  </div>
                )}
              />

              {/* Content Performance */}
              {learningStats.content_performance && learningStats.content_performance.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[var(--accent)]" /> Published content performance
                  </h3>
                  {learningStats.content_performance.map((cp, i) => (
                    <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{cp.title}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {cp.content_type} · {cp.channel}
                            {cp.published_at && ` · ${new Date(cp.published_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-shrink-0">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {cp.views}</span>
                          <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {cp.clicks}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {cp.reactions}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
