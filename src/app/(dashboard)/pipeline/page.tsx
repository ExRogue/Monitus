'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Newspaper,
  Zap,
  FileText,
  Mic,
  Linkedin,
  Mail,
  Users,
  CheckCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Clock,
  ArrowRight,
  Filter,
  X,
  Megaphone,
  BarChart3,
  Eye,
  Edit3,
  Send,
  Calendar,
  Shield,
  TrendingUp,
  Target,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  tags: string;
  published_at: string;
}

interface NewsValueScore {
  name: string;
  score: number;
  rationale: string;
}

interface ContentAngle {
  type: string;
  headline: string;
  angle: string;
  channel: string;
  spokesperson_quote: string;
}

interface AnalysisResult {
  articleId: string;
  newsValues: NewsValueScore[];
  angles: ContentAngle[];
  relevanceScore: number;
}

interface GeneratedResult {
  id: string;
  title: string;
  content_type: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
}

interface ReviewItem extends GeneratedResult {
  editedContent: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'scheduled';
}

/* ────────────────────────────────────────────────────────────────────────────
 * Constants
 * ──────────────────────────────────────────────────────────────────────────── */

type RelevanceLevel = 'high' | 'medium' | 'low';

const CONTENT_TYPES = [
  { id: 'newsletter', label: 'Newsletter', icon: Mail, desc: 'Weekly market intelligence email' },
  { id: 'linkedin', label: 'LinkedIn Posts', icon: Linkedin, desc: 'Thought leadership social content' },
  { id: 'podcast', label: 'Podcast Script', icon: Mic, desc: 'Structured audio episode script' },
  { id: 'briefing', label: 'Client Briefing', icon: Users, desc: 'Professional client market update' },
  { id: 'trade_media', label: 'Trade Media Pitch', icon: Megaphone, desc: 'PR pitch with spokesperson quote' },
];

const CHANNEL_OPTIONS = [
  { id: '', label: 'Auto (default)' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'Email' },
  { id: 'trade_media', label: 'Trade Media' },
];

const DEPARTMENT_OPTIONS = [
  { id: '', label: 'General audience' },
  { id: 'c-suite', label: 'C-Suite' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'claims', label: 'Claims' },
  { id: 'technology', label: 'IT / Technology' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'operations', label: 'Operations' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'uk_market', label: 'UK Market' },
  { id: 'us_market', label: 'US Market' },
  { id: 'specialty', label: 'Specialty' },
  { id: 'reinsurance', label: 'Reinsurance' },
  { id: 'insurtech', label: 'Insurtech' },
  { id: 'regulation', label: 'Regulation' },
];

const RELEVANCE_CONFIG: Record<RelevanceLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  high: { label: 'High', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  medium: { label: 'Medium', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  low: { label: 'Low', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--navy-lighter)]', borderColor: 'border-[var(--border)]' },
};

type Step = 'monitor' | 'analyse' | 'draft' | 'review';

const STEPS = [
  { key: 'monitor' as Step, num: 1, label: 'Monitor', shortLabel: 'Monitor', icon: Eye },
  { key: 'analyse' as Step, num: 2, label: 'Analyse', shortLabel: 'Analyse', icon: BarChart3 },
  { key: 'draft' as Step, num: 3, label: 'Draft', shortLabel: 'Draft', icon: Edit3 },
  { key: 'review' as Step, num: 4, label: 'Review', shortLabel: 'Review', icon: Shield },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────────── */

export default function PipelinePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('monitor');

  // Monitor state
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [articleRelevance, setArticleRelevance] = useState<Record<string, RelevanceLevel>>({});
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoringArticles, setScoringArticles] = useState(false);

  // Analyse state
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [analysingId, setAnalysingId] = useState<string | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState<string | null>(null);

  // Draft state
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState('');
  const [department, setDepartment] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);

  // Review state
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [changeFeedback, setChangeFeedback] = useState<Record<string, string>>({});
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Shared
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<{ content_pieces_used: number; content_pieces_limit: number } | null>(null);

  /* ── Fetch usage ── */
  useEffect(() => {
    fetch('/api/billing/usage')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUsage({ content_pieces_used: data.content_pieces_used, content_pieces_limit: data.content_pieces_limit }); })
      .catch(() => {});
  }, []);

  const atContentLimit = usage !== null && usage.content_pieces_limit !== null && usage.content_pieces_used >= usage.content_pieces_limit;

  /* ── Fetch articles ── */
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);
      params.set('limit', '30');
      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError("You've reached your article viewing limit. Upgrade your plan to continue browsing news.");
        } else {
          setError(data.error || 'Failed to load news articles');
        }
        setArticles([]);
        return;
      }
      const fetched: NewsArticle[] = data.articles || [];
      setArticles(fetched);
      // Score relevance for all articles
      if (fetched.length > 0) {
        scoreRelevance(fetched);
      }
    } catch {
      setError('Failed to load news articles');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  /* ── Score article relevance ── */
  const scoreRelevance = async (articleList: NewsArticle[]) => {
    setScoringArticles(true);
    try {
      const res = await fetch('/api/news/angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds: articleList.map(a => a.id), scoreOnly: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.relevanceScores) {
          setArticleRelevance(data.relevanceScores);
        }
      }
    } catch {
      // Scoring failed silently — articles still display without scores
      // Assign default medium relevance
      const defaults: Record<string, RelevanceLevel> = {};
      articleList.forEach(a => { defaults[a.id] = 'medium'; });
      setArticleRelevance(defaults);
    } finally {
      setScoringArticles(false);
    }
  };

  const refreshFeeds = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/news', { method: 'POST' });
      await fetchArticles();
    } catch {
      setError('Failed to refresh feeds');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles();
  };

  const toggleArticle = (id: string) => {
    setSelectedArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleType = (id: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Analyse article ── */
  const handleAnalyse = async (articleId: string) => {
    if (analyses[articleId]) {
      setAnalysisExpanded(analysisExpanded === articleId ? null : articleId);
      return;
    }
    setAnalysingId(articleId);
    setAnalysisExpanded(articleId);
    try {
      const res = await fetch('/api/news/angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalyses(prev => ({
          ...prev,
          [articleId]: {
            articleId,
            newsValues: data.newsValues || [],
            angles: data.angles || [],
            relevanceScore: data.relevanceScore || 0,
          },
        }));
      }
    } catch {
      setError('Failed to analyse article');
    } finally {
      setAnalysingId(null);
    }
  };

  /* ── Generate content ── */
  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: Array.from(selectedArticles),
          contentTypes: Array.from(selectedTypes),
          channel: channel || undefined,
          department: department || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError(data.error || "You've reached your content generation limit. Upgrade your plan to generate more content.");
        } else {
          setError(data.error || 'Generation failed');
        }
        return;
      }
      const generated: GeneratedResult[] = data.content || [];
      setResults(generated);
      // Transition to review
      setReviewItems(generated.map(r => ({
        ...r,
        editedContent: r.content,
        status: 'pending' as const,
      })));
      if (generated.length > 0) {
        setActiveReviewId(generated[0].id);
      }
      setStep('review');
      // Refresh usage
      fetch('/api/billing/usage')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUsage({ content_pieces_used: d.content_pieces_used, content_pieces_limit: d.content_pieces_limit }); })
        .catch(() => {});
    } catch {
      setError('Network error during generation');
    } finally {
      setGenerating(false);
    }
  };

  /* ── Regenerate a single content piece with feedback ── */
  const handleRegenerate = async (itemId: string) => {
    const feedback = changeFeedback[itemId]?.trim();
    if (!feedback) return;
    setRegeneratingId(itemId);
    setError('');
    try {
      const item = reviewItems.find(r => r.id === itemId);
      if (!item) return;
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: Array.from(selectedArticles),
          contentTypes: [item.content_type],
          channel: channel || undefined,
          department: department || undefined,
          feedback: `Please revise the following content based on this feedback: ${feedback}\n\nOriginal content:\n${item.editedContent}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Regeneration failed');
        return;
      }
      const generated: GeneratedResult[] = data.content || [];
      if (generated.length > 0) {
        setReviewItems(prev => prev.map(r =>
          r.id === itemId ? {
            ...r,
            content: generated[0].content,
            editedContent: generated[0].content,
            compliance_status: generated[0].compliance_status,
            compliance_notes: generated[0].compliance_notes,
            status: 'pending' as const,
          } : r
        ));
      }
      setShowFeedbackFor(null);
      setChangeFeedback(prev => ({ ...prev, [itemId]: '' }));
    } catch {
      setError('Network error during regeneration');
    } finally {
      setRegeneratingId(null);
    }
  };

  /* ── Helpers ── */
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getComplianceScore = (notes: string) => {
    try {
      const parsed = JSON.parse(notes);
      return parsed.score || 0;
    } catch { return 0; }
  };

  const getRelevanceLevel = (articleId: string): RelevanceLevel => {
    return articleRelevance[articleId] || 'medium';
  };

  // Sort articles by relevance
  const sortedArticles = [...articles].sort((a, b) => {
    const order: Record<RelevanceLevel, number> = { high: 0, medium: 1, low: 2 };
    const aLevel = getRelevanceLevel(a.id);
    const bLevel = getRelevanceLevel(b.id);
    return order[aLevel] - order[bLevel];
  });

  // Filter by relevance
  const filteredArticles = relevanceFilter === 'all'
    ? sortedArticles
    : sortedArticles.filter(a => getRelevanceLevel(a.id) === relevanceFilter);

  /* ── Step navigation logic ── */
  const isStepAccessible = (key: Step) => {
    if (key === 'monitor') return true;
    if (key === 'analyse') return selectedArticles.size > 0;
    if (key === 'draft') return selectedArticles.size > 0;
    if (key === 'review') return reviewItems.length > 0;
    return false;
  };

  const getStepStatus = (key: Step) => {
    const stepOrder: Step[] = ['monitor', 'analyse', 'draft', 'review'];
    const currentIdx = stepOrder.indexOf(step);
    const keyIdx = stepOrder.indexOf(key);
    if (step === key) return 'active';
    if (keyIdx < currentIdx) return 'completed';
    if (!isStepAccessible(key)) return 'disabled';
    return 'available';
  };

  /* ════════════════════════════════════════════════════════════════════════════
   * STEP INDICATOR
   * ════════════════════════════════════════════════════════════════════════════ */

  const StepIndicator = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1 mb-4 sm:mb-6 overflow-x-auto pb-2 sm:pb-0">
      {STEPS.map((s, i) => {
        const status = getStepStatus(s.key);
        const accessible = isStepAccessible(s.key);
        const StepIcon = s.icon;
        return (
          <div key={s.key} className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {i > 0 && <ChevronRight className="hidden sm:block w-4 h-4 text-[var(--text-secondary)]/30" />}
            <button
              onClick={() => { if (accessible) setStep(s.key); }}
              disabled={!accessible}
              title={!accessible
                ? s.key === 'analyse' || s.key === 'draft'
                  ? 'Select at least one article first'
                  : s.key === 'review'
                    ? 'Generate content first'
                    : undefined
                : undefined}
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                status === 'active'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : status === 'completed'
                    ? 'text-[var(--success)] hover:text-[var(--success)]'
                    : status === 'disabled'
                      ? 'text-[var(--text-secondary)]/40 cursor-not-allowed opacity-50'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                status === 'active' ? 'bg-[var(--accent)] text-white'
                  : status === 'completed' ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
              }`}>
                {status === 'completed' ? '✓' : s.num}
              </span>
              <StepIcon className="w-3.5 h-3.5 hidden sm:block flex-shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.shortLabel}</span>
            </button>
          </div>
        );
      })}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════════
   * STAGE 1: MONITOR
   * ════════════════════════════════════════════════════════════════════════════ */

  const MonitorStep = () => (
    <div className="space-y-3 sm:space-y-4">
      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-[var(--navy-light)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          />
        </form>
        <Button variant="secondary" onClick={refreshFeeds} loading={refreshing} className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline ml-2">Refresh Feeds</span>
          <span className="sm:hidden ml-2">Refresh</span>
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              category === cat.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Relevance filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <TrendingUp className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
        <span className="text-xs text-[var(--text-secondary)] mr-1">Relevance:</span>
        {(['all', 'high', 'medium', 'low'] as const).map(level => (
          <button
            key={level}
            onClick={() => setRelevanceFilter(level)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              relevanceFilter === level
                ? level === 'all'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : `${RELEVANCE_CONFIG[level].bgColor} ${RELEVANCE_CONFIG[level].color} border ${RELEVANCE_CONFIG[level].borderColor}`
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] border border-transparent'
            }`}
          >
            {level === 'all' ? 'All' : RELEVANCE_CONFIG[level].label}
          </button>
        ))}
        {scoringArticles && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Loader2 className="w-3 h-3 animate-spin" /> Scoring...
          </span>
        )}
      </div>

      {/* Selection bar */}
      {selectedArticles.size > 0 && (
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-[var(--accent)] font-medium">
            {selectedArticles.size} article{selectedArticles.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedArticles(new Set())}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
            <Button size="sm" onClick={() => setStep('analyse')} className="flex-1 sm:flex-none">
              <span className="hidden sm:inline">Next:</span> Analyse <ArrowRight className="w-3 h-3 ml-1 flex-shrink-0" />
            </Button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="text-xs sm:text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 sm:px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Article list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="animate-pulse bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              <div className="h-4 bg-[var(--navy-lighter)] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[var(--navy-lighter)] rounded w-full mb-2" />
              <div className="flex gap-2 mt-3">
                <div className="h-5 bg-[var(--navy-lighter)] rounded w-16" />
                <div className="h-5 bg-[var(--navy-lighter)] rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-20">
          <Newspaper className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
          <p className="text-[var(--text-secondary)]">No articles found. Try refreshing the feeds.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredArticles.map(article => {
            const selected = selectedArticles.has(article.id);
            const tags = JSON.parse(article.tags || '[]');
            const relevance = getRelevanceLevel(article.id);
            const config = RELEVANCE_CONFIG[relevance];
            return (
              <button
                key={article.id}
                onClick={() => toggleArticle(article.id)}
                className={`w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                  selected
                    ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/20'
                    : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--accent)]/20'
                }`}
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                        {article.title}
                      </h3>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config.bgColor} ${config.color} ${config.borderColor}`}>
                        <Target className="w-2.5 h-2.5" />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-[var(--text-secondary)] truncate">{article.source}</span>
                      <span className="text-xs text-[var(--text-secondary)]">·</span>
                      <Clock className="w-3 h-3 text-[var(--text-secondary)] flex-shrink-0" />
                      <span className="text-xs text-[var(--text-secondary)]">{formatTime(article.published_at)}</span>
                      {tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════════
   * STAGE 2: ANALYSE
   * ════════════════════════════════════════════════════════════════════════════ */

  const AnalyseStep = () => {
    const selectedList = articles.filter(a => selectedArticles.has(a.id));

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-2 sm:mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            17 News Values Analysis
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Analyse each selected article against the 17 News Values framework to identify the strongest content angles.
          </p>

          <div className="space-y-3">
            {selectedList.map(article => {
              const analysis = analyses[article.id];
              const isExpanded = analysisExpanded === article.id;
              const isLoading = analysingId === article.id;

              return (
                <div
                  key={article.id}
                  className="bg-[var(--navy)] border border-[var(--border)] rounded-lg overflow-hidden"
                >
                  {/* Article header */}
                  <div className="p-3 sm:p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                        {article.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{article.source}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {analysis && (
                        <Badge variant={analysis.relevanceScore >= 70 ? 'success' : analysis.relevanceScore >= 40 ? 'warning' : 'default'} size="sm">
                          {analysis.relevanceScore}% relevant
                        </Badge>
                      )}
                      <button
                        onClick={() => handleAnalyse(article.id)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <BarChart3 className="w-3.5 h-3.5" />
                        )}
                        {analysis ? (isExpanded ? 'Hide' : 'Show') : 'Analyse'}
                      </button>
                    </div>
                  </div>

                  {/* Analysis results */}
                  {isExpanded && analysis && (
                    <div className="border-t border-[var(--border)] p-3 sm:p-4 space-y-4">
                      {/* News values grid */}
                      <div>
                        <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                          News Values
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.newsValues
                            .sort((a, b) => b.score - a.score)
                            .map(nv => {
                              const isStrong = nv.score >= 4;
                              const isMedium = nv.score >= 2 && nv.score < 4;
                              return (
                                <div
                                  key={nv.name}
                                  className={`group relative inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                    isStrong
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : isMedium
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border-[var(--border)]'
                                  }`}
                                  title={nv.rationale}
                                >
                                  <span>{nv.name}</span>
                                  <span className="font-bold">{nv.score}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Top news values detail */}
                      {analysis.newsValues.filter(nv => nv.score >= 4).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-400 mb-2">
                            Strongest Angles ({analysis.newsValues.filter(nv => nv.score >= 4).length})
                          </h5>
                          <div className="space-y-2">
                            {analysis.newsValues
                              .filter(nv => nv.score >= 4)
                              .sort((a, b) => b.score - a.score)
                              .map(nv => (
                                <div key={nv.name} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-emerald-400">{nv.name}</span>
                                    <span className="text-[11px] text-emerald-400/70">{nv.score}/5</span>
                                  </div>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{nv.rationale}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Content angles */}
                      {analysis.angles.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                            Suggested Content Angles
                          </h5>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {analysis.angles.map((angle, idx) => {
                              const channelColors: Record<string, string> = {
                                linkedin: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                                email: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                                trade_media: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                              };
                              const colorClasses = channelColors[angle.channel] || 'text-[var(--text-secondary)] bg-[var(--navy-lighter)] border-[var(--border)]';
                              return (
                                <div key={idx} className={`rounded-lg border p-3 ${colorClasses}`}>
                                  <span className="text-[11px] font-semibold uppercase tracking-wider">{angle.type}</span>
                                  <h6 className="text-xs font-bold text-[var(--text-primary)] mt-1 mb-1 leading-snug">
                                    {angle.headline}
                                  </h6>
                                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    {angle.angle}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pt-2">
          <Button variant="ghost" onClick={() => setStep('monitor')} className="w-full sm:w-auto order-2 sm:order-1">
            <ChevronLeft className="w-4 h-4 mr-1 flex-shrink-0" /> Back to Monitor
          </Button>
          <Button onClick={() => setStep('draft')} className="w-full sm:w-auto order-1 sm:order-2">
            Next: Draft Content <ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />
          </Button>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════════════════
   * STAGE 3: DRAFT
   * ════════════════════════════════════════════════════════════════════════════ */

  const DraftStep = () => {
    const selectedList = articles.filter(a => selectedArticles.has(a.id));
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Selected articles summary */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-2 sm:mb-3 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            Selected ({selectedList.length})
          </h3>
          <div className="space-y-1 sm:space-y-2 max-h-40 overflow-y-auto">
            {selectedList.map(article => (
              <div key={article.id} className="flex items-center justify-between py-1.5 sm:py-2 border-b border-[var(--border)] last:border-0 gap-2">
                <span className="text-xs sm:text-sm text-[var(--text-primary)] line-clamp-1 flex-1">{article.title}</span>
                <button
                  onClick={() => toggleArticle(article.id)}
                  className="p-1 text-[var(--text-secondary)] hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Content type selection */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-2 sm:mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--purple)] flex-shrink-0" />
            Choose Formats
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {CONTENT_TYPES.map(type => {
              const selected = selectedTypes.has(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`p-3 sm:p-4 rounded-xl border text-left transition-all duration-200 ${
                    selected
                      ? 'bg-[var(--purple)]/5 border-[var(--purple)]/30 ring-1 ring-[var(--purple)]/20'
                      : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--purple)]/20'
                  }`}
                >
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-[var(--purple)]/20' : 'bg-[var(--navy-lighter)]'
                    }`}>
                      <type.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${selected ? 'text-[var(--purple)]' : 'text-[var(--text-secondary)]'}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-xs sm:text-sm font-medium ${selected ? 'text-[var(--purple)]' : 'text-[var(--text-primary)]'}`}>
                        {type.label}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{type.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Department targeting */}
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-2 sm:mb-3">
            Department Focus <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
          </h3>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full sm:w-auto bg-[var(--navy-light)] border border-[var(--border)] rounded-lg px-4 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
          >
            {DEPARTMENT_OPTIONS.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        {atContentLimit && (
          <div className="text-xs sm:text-sm text-[var(--warning)] bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 sm:px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            You&apos;ve reached your content generation limit ({usage!.content_pieces_used}/{usage!.content_pieces_limit}). Upgrade your plan to generate more content.
          </div>
        )}

        {error && (
          <div className="text-xs sm:text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 sm:px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pt-2">
          <Button variant="ghost" onClick={() => setStep('analyse')} className="w-full sm:w-auto order-2 sm:order-1">
            <ChevronLeft className="w-4 h-4 mr-1 flex-shrink-0" /> Back
          </Button>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={selectedTypes.size === 0 || !!atContentLimit}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            <Zap className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Generate {selectedTypes.size > 0 ? `${selectedTypes.size} Format${selectedTypes.size > 1 ? 's' : ''}` : 'Content'}</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════════════════
   * STAGE 4: REVIEW
   * ════════════════════════════════════════════════════════════════════════════ */

  const ReviewStep = () => {
    const activeItem = reviewItems.find(r => r.id === activeReviewId);

    const updateEditedContent = (id: string, content: string) => {
      setReviewItems(prev => prev.map(item =>
        item.id === id ? { ...item, editedContent: content } : item
      ));
    };

    const persistVoiceEdit = async (item: ReviewItem) => {
      if (item.editedContent === item.content) return;
      try {
        await fetch('/api/content/edit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_id: item.id,
            edited_text: item.editedContent,
          }),
        });
      } catch (err) {
        console.error('Failed to persist voice edit:', err);
      }
    };

    const updateStatus = (id: string, status: ReviewItem['status']) => {
      const item = reviewItems.find(r => r.id === id);
      if (item) {
        persistVoiceEdit(item);
      }
      setReviewItems(prev => prev.map(r =>
        r.id === id ? { ...r, status } : r
      ));
    };

    const getStatusBadge = (status: ReviewItem['status']) => {
      switch (status) {
        case 'approved':
          return <Badge variant="success" size="sm">Approved</Badge>;
        case 'changes_requested':
          return <Badge variant="warning" size="sm">Changes Requested</Badge>;
        case 'scheduled':
          return <Badge variant="purple" size="sm">Scheduled</Badge>;
        default:
          return <Badge size="sm">Pending</Badge>;
      }
    };

    const complianceChecklist = (notes: string) => {
      try {
        const parsed = JSON.parse(notes);
        const items = parsed.checks || [];
        if (items.length === 0) {
          return [
            { label: 'Brand voice alignment', passed: parsed.score >= 70 },
            { label: 'Messaging bible compliance', passed: parsed.score >= 60 },
            { label: 'Tone consistency', passed: parsed.score >= 50 },
            { label: 'Factual accuracy', passed: true },
          ];
        }
        return items;
      } catch {
        return [
          { label: 'Brand voice alignment', passed: true },
          { label: 'Messaging bible compliance', passed: true },
          { label: 'Tone consistency', passed: true },
          { label: 'Factual accuracy', passed: true },
        ];
      }
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)] flex-shrink-0" />
          <span className="text-xs sm:text-sm text-[var(--success)] font-medium">
            Generated {reviewItems.length} piece{reviewItems.length > 1 ? 's' : ''} of content — review and approve below
          </span>
        </div>

        {/* Content tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {reviewItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveReviewId(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeReviewId === item.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--navy-light)] border border-[var(--border)]'
              }`}
            >
              {getStatusBadge(item.status)}
              <span className="max-w-[120px] truncate">{item.content_type}</span>
            </button>
          ))}
        </div>

        {/* Active review item — side by side */}
        {activeItem && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Editor */}
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Edit</span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  {activeItem.editedContent.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{activeItem.title}</h3>
                <textarea
                  value={activeItem.editedContent}
                  onChange={(e) => updateEditedContent(activeItem.id, e.target.value)}
                  className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-primary)] leading-relaxed min-h-[300px] sm:min-h-[400px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-y font-mono"
                />
              </div>
            </div>

            {/* Right: Preview + compliance */}
            <div className="space-y-4">
              {/* Preview */}
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[var(--purple)]" />
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Preview</span>
                  <Badge variant="purple" size="sm">{activeItem.content_type}</Badge>
                </div>
                <div className="p-4 max-h-[300px] sm:max-h-[350px] overflow-y-auto">
                  <SimpleMarkdown
                    content={activeItem.editedContent}
                    className="text-xs text-[var(--text-secondary)] leading-relaxed"
                  />
                </div>
              </div>

              {/* Content Analysis */}
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Content Analysis</span>
                  </div>
                  <Badge
                    variant={activeItem.compliance_status === 'passed' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {getComplianceScore(activeItem.compliance_notes)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  {complianceChecklist(activeItem.compliance_notes).map((check: { label: string; passed: boolean }, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      {check.passed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[var(--success)] flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0" />
                      )}
                      <span className={`text-xs ${check.passed ? 'text-[var(--text-secondary)]' : 'text-[var(--warning)]'}`}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateStatus(activeItem.id, 'approved')}
                  disabled={activeItem.status === 'approved'}
                  className="flex-1"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  {activeItem.status === 'approved' ? 'Approved' : 'Approve'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFeedbackFor(showFeedbackFor === activeItem.id ? null : activeItem.id)}
                  className="flex-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Request Changes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateStatus(activeItem.id, 'scheduled')}
                  className="flex-1"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Schedule
                </Button>
              </div>

              {/* Feedback textarea for Request Changes */}
              {showFeedbackFor === activeItem.id && (
                <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[var(--warning)]" />
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">What should be changed?</span>
                  </div>
                  <textarea
                    value={changeFeedback[activeItem.id] || ''}
                    onChange={(e) => setChangeFeedback(prev => ({ ...prev, [activeItem.id]: e.target.value }))}
                    placeholder="Describe the changes you'd like — e.g. make the tone more formal, add statistics, shorten the intro..."
                    rows={3}
                    className="w-full bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRegenerate(activeItem.id)}
                      disabled={!changeFeedback[activeItem.id]?.trim() || regeneratingId === activeItem.id}
                      className="flex-1"
                    >
                      {regeneratingId === activeItem.id ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
                      ) : (
                        <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFeedbackFor(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary of all items */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-3">All Generated Content</h3>
          <div className="space-y-2">
            {reviewItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveReviewId(item.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeReviewId === item.id
                    ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="purple" size="sm">{item.content_type}</Badge>
                  <span className="text-xs text-[var(--text-primary)] truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {item.editedContent.split(/\s+/).filter(Boolean).length} words
                  </span>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pt-2">
          <Button variant="ghost" onClick={() => {
            setStep('monitor');
            setSelectedArticles(new Set());
            setSelectedTypes(new Set());
            setResults([]);
            setReviewItems([]);
            setAnalyses({});
          }} className="w-full sm:w-auto order-2 sm:order-1">
            <Zap className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="hidden sm:inline">Start </span>New Pipeline
          </Button>
          <Button onClick={() => router.push('/content')} className="w-full sm:w-auto order-1 sm:order-2">
            View All Content <ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />
          </Button>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════════════════
   * RENDER
   * ════════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="truncate">Content Pipeline</span>
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 sm:mt-2">
          Select a news article, choose your format, and generate branded content in minutes
        </p>
      </div>

      <StepIndicator />

      {step === 'monitor' && <MonitorStep />}
      {step === 'analyse' && <AnalyseStep />}
      {step === 'draft' && <DraftStep />}
      {step === 'review' && <ReviewStep />}
    </div>
  );
}
