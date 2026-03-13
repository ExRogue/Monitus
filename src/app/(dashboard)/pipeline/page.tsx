'use client';
import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  tags: string;
  published_at: string;
}

interface GeneratedResult {
  id: string;
  title: string;
  content_type: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
}

const CONTENT_TYPES = [
  { id: 'newsletter', label: 'Newsletter', icon: Mail, desc: 'Weekly market intelligence email' },
  { id: 'linkedin', label: 'LinkedIn Posts', icon: Linkedin, desc: 'Thought leadership social content' },
  { id: 'podcast', label: 'Podcast Script', icon: Mic, desc: 'Structured audio episode script' },
  { id: 'briefing', label: 'Client Briefing', icon: Users, desc: 'Professional client market update' },
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

type Step = 'select' | 'configure' | 'results';

export default function PipelinePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchArticles();
  }, [category]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);
      params.set('limit', '30');
      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setError('Failed to load news articles');
    } finally {
      setLoading(false);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return;
      }
      setResults(data.content || []);
      setStep('results');
    } catch {
      setError('Network error during generation');
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getComplianceIcon = (status: string) => {
    if (status === 'passed') return <CheckCircle className="w-4 h-4 text-[var(--success)]" />;
    return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
  };

  const getComplianceScore = (notes: string) => {
    try {
      const parsed = JSON.parse(notes);
      return parsed.score || 0;
    } catch { return 0; }
  };

  // ── STEP INDICATOR ──
  const isStepAccessible = (key: string) => {
    if (key === 'select') return true;
    if (key === 'configure') return selectedArticles.size > 0;
    if (key === 'results') return results.length > 0;
    return false;
  };

  const getStepStatus = (key: string) => {
    if (step === key) return 'active';
    if (key === 'select' && (step === 'configure' || step === 'results')) return 'completed';
    if (key === 'configure' && step === 'results') return 'completed';
    if (!isStepAccessible(key)) return 'disabled';
    return 'available';
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-3 mb-6">
      {[
        { key: 'select', num: 1, label: 'Select Articles' },
        { key: 'configure', num: 2, label: 'Choose Formats' },
        { key: 'results', num: 3, label: 'Results' },
      ].map((s, i) => {
        const status = getStepStatus(s.key);
        const accessible = isStepAccessible(s.key);
        return (
          <div key={s.key} className="flex items-center gap-3">
            {i > 0 && <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />}
            <button
              onClick={() => {
                if (accessible) setStep(s.key as 'select' | 'configure' | 'results');
              }}
              disabled={!accessible}
              title={!accessible ? (s.key === 'configure' ? 'Select at least one article first' : 'Generate content first') : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === 'active'
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : status === 'completed'
                  ? 'text-[var(--success)] hover:text-[var(--success)]'
                  : status === 'disabled'
                  ? 'text-[var(--text-secondary)]/40 cursor-not-allowed opacity-50'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                status === 'active' ? 'bg-[var(--accent)] text-white'
                  : status === 'completed' ? 'bg-[var(--success)] text-white'
                  : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
              }`}>
                {status === 'completed' ? '✓' : s.num}
              </span>
              {s.label}
            </button>
          </div>
        );
      })}
    </div>
  );

  // ── STEP 1: SELECT ARTICLES ──
  const SelectStep = () => (
    <div className="space-y-4">
      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news articles..."
            className="w-full bg-[var(--navy-light)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          />
        </form>
        <Button variant="secondary" onClick={refreshFeeds} loading={refreshing}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Feeds
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              category === cat.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Selection bar */}
      {selectedArticles.size > 0 && (
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[var(--accent)] font-medium">
            {selectedArticles.size} article{selectedArticles.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedArticles(new Set())}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
            <Button size="sm" onClick={() => setStep('configure')}>
              Next: Choose Formats <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Article list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <Newspaper className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
          <p className="text-[var(--text-secondary)]">No articles found. Try refreshing the feeds.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {articles.map(article => {
            const selected = selectedArticles.has(article.id);
            const tags = JSON.parse(article.tags || '[]');
            return (
              <button
                key={article.id}
                onClick={() => toggleArticle(article.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selected
                    ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/20'
                    : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--accent)]/20'
                }`}
              >
                <div className="flex items-start gap-3">
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
                    <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-[var(--text-secondary)]">{article.source}</span>
                      <span className="text-xs text-[var(--text-secondary)]">·</span>
                      <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{formatTime(article.published_at)}</span>
                      {tags.slice(0, 3).map((tag: string) => (
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

  // ── STEP 2: CONFIGURE ──
  const ConfigureStep = () => {
    const selectedList = articles.filter(a => selectedArticles.has(a.id));
    return (
      <div className="space-y-6">
        {/* Selected articles summary */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[var(--accent)]" />
            Selected Articles ({selectedList.length})
          </h3>
          <div className="space-y-2">
            {selectedList.map(article => (
              <div key={article.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--text-primary)] line-clamp-1 flex-1">{article.title}</span>
                <button
                  onClick={() => toggleArticle(article.id)}
                  className="ml-2 p-1 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Content type selection */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--purple)]" />
            Choose Content Formats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {CONTENT_TYPES.map(type => {
              const selected = selectedTypes.has(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    selected
                      ? 'bg-[var(--purple)]/5 border-[var(--purple)]/30 ring-1 ring-[var(--purple)]/20'
                      : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--purple)]/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-[var(--purple)]/20' : 'bg-[var(--navy-lighter)]'
                    }`}>
                      <type.icon className={`w-5 h-5 ${selected ? 'text-[var(--purple)]' : 'text-[var(--text-secondary)]'}`} />
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${selected ? 'text-[var(--purple)]' : 'text-[var(--text-primary)]'}`}>
                        {type.label}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{type.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={() => setStep('select')}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={selectedTypes.size === 0}
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate {selectedTypes.size > 0 ? `${selectedTypes.size} Format${selectedTypes.size > 1 ? 's' : ''}` : 'Content'}
          </Button>
        </div>
      </div>
    );
  };

  // ── STEP 3: RESULTS ──
  const ResultsStep = () => (
    <div className="space-y-4">
      <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-4 py-3 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-[var(--success)]" />
        <span className="text-sm text-[var(--success)] font-medium">
          Successfully generated {results.length} piece{results.length > 1 ? 's' : ''} of content
        </span>
      </div>

      <div className="grid gap-4">
        {results.map(result => {
          const score = getComplianceScore(result.compliance_notes);
          return (
            <div key={result.id} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="purple" size="sm">{result.content_type}</Badge>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-2">{result.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getComplianceIcon(result.compliance_status)}
                    <Badge variant={result.compliance_status === 'passed' ? 'success' : 'warning'}>
                      {score}% compliant
                    </Badge>
                  </div>
                </div>

                {/* Content preview */}
                <div className="bg-[var(--navy)] rounded-lg p-4 max-h-48 overflow-y-auto">
                  <SimpleMarkdown
                    content={result.content.substring(0, 600) + (result.content.length > 600 ? '...' : '')}
                    className="text-xs text-[var(--text-secondary)] leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {result.content.split(/\s+/).length} words
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/content?id=${result.id}`)}
                  >
                    View Full Content <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={() => {
          setStep('select');
          setSelectedArticles(new Set());
          setSelectedTypes(new Set());
          setResults([]);
        }}>
          <Zap className="w-4 h-4 mr-1" /> Start New Pipeline
        </Button>
        <Button onClick={() => router.push('/content')}>
          View All Content <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          Content Pipeline
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 ml-[52px]">
          Transform news into branded, compliance-checked content
        </p>
      </div>

      <StepIndicator />

      {step === 'select' && <SelectStep />}
      {step === 'configure' && <ConfigureStep />}
      {step === 'results' && <ResultsStep />}
    </div>
  );
}
