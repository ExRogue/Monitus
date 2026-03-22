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

interface Opportunity {
  id: string;
  type: OpportunityType;
  stage: OpportunityStage;
  source_development: string;
  summary: string;
  why_it_matters: string;
  narrative_alignment: string;
  competitor_context: string;
  buyer_relevance: string;
  recommended_angle: string;
  recommended_format: RecommendedFormat;
  urgency_score: number;
  opportunity_score: number;
  saved: boolean;
  dismissed: boolean;
  created_at: string;
}

type FilterTab = 'All' | OpportunityType;

/* ──────────────────────────────────────────────────────────────────────────
 * Demo data
 * ────────────────────────────────────────────────────────────────────────── */

const DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'demo-1',
    type: 'Signal-Led',
    stage: 'Analyse',
    source_development: "Lloyd's publishes updated cyber war exclusion model clauses",
    summary:
      "Lloyd's Market Association has released revised model clauses for cyber war exclusions, narrowing the definition of state-backed attacks and introducing a new standalone war buyback provision. The changes take effect from Q2 2026 for new placements.",
    why_it_matters:
      'The revision directly affects how cyber policies are worded and priced across the London Market, with downstream implications for MGA binding authority wordings and broker-carrier negotiations.',
    narrative_alignment:
      'Positions your firm as an authoritative guide through complex regulatory transitions, reinforcing the "clarity in complexity" narrative pillar.',
    competitor_context:
      'Several major Lloyd\'s syndicates have been publicly silent on the practical implications. There is an open window to lead the educational conversation.',
    buyer_relevance:
      'Underwriting directors and compliance heads at cedants need to understand what changes are required to existing binders. CFOs are focused on the pricing impact.',
    recommended_angle:
      'Position as helping clients navigate the transition — publish a concise clause-by-clause explainer focused on what actually changes for buyers.',
    recommended_format: 'LinkedIn Post',
    urgency_score: 85,
    opportunity_score: 78,
    saved: false,
    dismissed: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    type: 'Theme-Led',
    stage: 'Monitor',
    source_development:
      'AI governance in underwriting has been building as a sustained theme for 90 days',
    summary:
      'Coverage of AI explainability in insurance underwriting decisions has grown 340% over the past quarter, driven by PRA consultation papers, FCA DP23/5 follow-ups, and a wave of academic papers challenging black-box models in risk assessment.',
    why_it_matters:
      'Regulators are moving toward requiring documented explainability for algorithmic underwriting decisions. Firms that can demonstrate governance frameworks early will have a competitive advantage and reduced compliance risk.',
    narrative_alignment:
      'Aligns with your "responsible innovation" messaging pillar and supports differentiation from less mature competitors.',
    competitor_context:
      'The loudest voices in the current debate are technology vendors and academics — specialist carriers have largely stayed quiet, leaving a credibility gap.',
    buyer_relevance:
      'CROs, heads of underwriting, and board-level risk committees are actively preparing for regulatory dialogue. Practical guidance is scarce.',
    recommended_angle:
      'Share your perspective on explainability requirements before they become mandatory — establish thought leadership while the policy window is still open.',
    recommended_format: 'Trade Media Pitch',
    urgency_score: 62,
    opportunity_score: 71,
    saved: false,
    dismissed: false,
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    type: 'Rival-Led',
    stage: 'Monitor',
    source_development:
      'Competitor X has gone quiet on delegated authority governance over the past 6 weeks',
    summary:
      'A previously vocal competitor has published nothing on delegated authority governance since their last thought-leadership piece in early February. LinkedIn engagement on that piece was low, and no follow-up has been issued ahead of the upcoming MGAA conference.',
    why_it_matters:
      "Delegated authority governance is high on the MGAA and Lloyd's agenda following recent high-profile capacity withdrawals. The silence creates a narrative gap that a credible voice can fill.",
    narrative_alignment:
      'Directly supports your positioning as the governance intelligence partner for MGAs — a core differentiator vs. generalist brokers.',
    competitor_context:
      'The narrative whitespace is confirmed. No other specialist player has stepped in to fill the gap in the last month.',
    buyer_relevance:
      'MGA principals and coverholder compliance teams are actively seeking guidance as Lloyd\'s prepares its Delegated Authorities Strategy update.',
    recommended_angle:
      'Narrative whitespace — own this conversation before anyone else does. Publish a practical governance checklist tied to the upcoming MGAA event.',
    recommended_format: 'Email Commentary',
    urgency_score: 55,
    opportunity_score: 66,
    saved: false,
    dismissed: false,
    created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

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
      {/* Card header — always visible */}
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

        {/* Source development headline */}
        <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug mb-1">
          {opp.source_development}
        </h3>

        {/* Summary */}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
          {opp.summary}
        </p>

        {/* Recommended angle + format strip */}
        <div className="mt-3 flex items-start gap-2 bg-[var(--navy)]/60 rounded-lg p-3 border border-[var(--border)]">
          <Flag className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Recommended angle</p>
            <p className="text-sm text-[var(--text-primary)] font-medium leading-snug">
              {opp.recommended_angle}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Format: <span className="text-[var(--accent)]">{opp.recommended_format}</span>
            </p>
          </div>
        </div>

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
            <DetailBlock icon={Sparkles} label="Narrative alignment" text={opp.narrative_alignment} iconClass="text-[var(--accent)]" />
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
  const [refreshing, setRefreshing] = useState(false);
  const [isDemoData, setIsDemoData] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [requestingAngleId, setRequestingAngleId] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const loadOpportunities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/opportunities');
      if (res.status === 404 || !res.ok) {
        setOpportunities(DEMO_OPPORTUNITIES);
        setIsDemoData(true);
        return;
      }
      const data = await res.json();
      const items: Opportunity[] = Array.isArray(data.opportunities) ? data.opportunities : [];
      if (items.length > 0) {
        setOpportunities(items);
        setIsDemoData(false);
      } else {
        setOpportunities(DEMO_OPPORTUNITIES);
        setIsDemoData(true);
      }
    } catch {
      setOpportunities(DEMO_OPPORTUNITIES);
      setIsDemoData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunities();
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
          topic: `${opp.source_development}. ${opp.summary}`,
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
    // Simulate a request — in production this would call an API endpoint
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
        body: JSON.stringify({ title: topic, summary: topic, type: 'Topic-Led', recommended_format: tone === 'Direct' ? 'LinkedIn Post' : tone === 'Thought-leadership' ? 'Trade Media Pitch' : 'Email Commentary' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setManualError(data.error || 'Failed to create opportunity. Please try again.');
        return;
      }
      const data = await res.json();
      const newOpp: Opportunity = data.opportunity ?? {
        id: `manual-${Date.now()}`,
        type: 'Topic-Led',
        stage: 'Analyse',
        source_development: topic,
        summary: topic,
        why_it_matters: 'This is a manually added topic for commentary.',
        narrative_alignment: 'To be determined based on your company narrative.',
        competitor_context: 'No competitor context available for manual topics.',
        buyer_relevance: 'Defined by your target audience selection.',
        recommended_angle: `${tone} commentary on this topic.`,
        recommended_format: 'LinkedIn Post',
        urgency_score: 50,
        opportunity_score: 50,
        saved: false,
        dismissed: false,
        created_at: new Date().toISOString(),
      };
      setOpportunities(prev => [newOpp, ...prev]);
      setShowManualForm(false);
    } catch {
      setManualError('Network error. Please check your connection.');
    } finally {
      setManualSubmitting(false);
    }
  };

  /* Filtered + non-dismissed opportunities */
  const visible = opportunities.filter(o => {
    if (o.dismissed) return false;
    if (activeFilter === 'All') return true;
    return o.type === activeFilter;
  });

  const savedCount = opportunities.filter(o => !o.dismissed && o.saved).length;
  const totalActive = opportunities.filter(o => !o.dismissed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading opportunities…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sample data banner */}
      {isDemoData && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-amber-300">Sample data</span>
            <span className="text-amber-300/80"> — these are illustrative opportunities. Connect your feeds and complete your Narrative to see real, AI-generated opportunities based on live market signals.</span>
          </div>
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
                Pre-prioritised moments to publish — ranked by urgency and strategic fit.
              </p>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadOpportunities(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-light)] border border-[var(--border)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
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
            Content generated successfully. Find it in your pipeline — the stage has been updated to Draft.
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
            <h3 className="text-base font-semibold text-[var(--text-primary)]">No opportunities here</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
              New opportunities are generated automatically as market signals come in.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setShowManualForm(true); setManualError(''); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add a manual topic
          </Button>
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
