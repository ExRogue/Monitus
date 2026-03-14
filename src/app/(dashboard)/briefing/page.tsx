'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Copy,
  Download,
  CheckCircle,
  RefreshCw,
  Clock,
  Filter,
  X,
  MessageSquare,
  Users,
  Shield,
  Briefcase,
  AlertCircle,
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

interface SavedBriefing {
  id: string;
  title: string;
  content: string;
  metadata: string;
  created_at: string;
}

type Step = 'select' | 'notes' | 'configure' | 'generate' | 'review';
type BriefingFormat = 'client_briefing' | 'board_pack' | 'team_update' | 'regulatory_alert';

const STEPS: { key: Step; label: string; number: number }[] = [
  { key: 'select', label: 'Select Articles', number: 1 },
  { key: 'notes', label: 'Add Context', number: 2 },
  { key: 'configure', label: 'Configure', number: 3 },
  { key: 'generate', label: 'Generate', number: 4 },
  { key: 'review', label: 'Review', number: 5 },
];

const FORMATS: { key: BriefingFormat; label: string; description: string; icon: any }[] = [
  { key: 'client_briefing', label: 'Client Briefing', description: 'External-facing, polished and authoritative', icon: Briefcase },
  { key: 'board_pack', label: 'Board Pack Summary', description: 'Internal, strategic focus for leadership', icon: Users },
  { key: 'team_update', label: 'Team Update', description: 'Internal, operational focus for staff', icon: MessageSquare },
  { key: 'regulatory_alert', label: 'Regulatory Alert', description: 'Compliance-focused alert format', icon: Shield },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'reinsurance', label: 'Reinsurance' },
  { id: 'ils', label: 'ILS' },
  { id: 'uk_market', label: 'UK Market' },
  { id: 'specialty', label: 'Specialty' },
  { id: 'general', label: 'General' },
];

export default function BriefingPage() {
  const [step, setStep] = useState<Step>('select');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<BriefingFormat>('client_briefing');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [savedBriefings, setSavedBriefings] = useState<SavedBriefing[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [viewingSaved, setViewingSaved] = useState<SavedBriefing | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch('/api/news?limit=100');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setError('Failed to load articles');
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  const fetchSavedBriefings = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing');
      const data = await res.json();
      setSavedBriefings(data.briefings || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchSavedBriefings();
  }, [fetchArticles, fetchSavedBriefings]);

  const filteredArticles = articles.filter((a) => {
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleArticle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedArticles = articles.filter((a) => selectedIds.has(a.id));

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const goPrev = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setStep('generate');
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: Array.from(selectedIds),
          format,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate briefing');
        setStep('configure');
        return;
      }
      setGeneratedContent(data.briefing.content);
      setGeneratedTitle(data.briefing.title);
      setStep('review');
      fetchSavedBriefings();
    } catch {
      setError('Failed to generate briefing');
      setStep('configure');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBuilder = () => {
    setStep('select');
    setSelectedIds(new Set());
    setNotes({});
    setFormat('client_briefing');
    setGeneratedContent('');
    setGeneratedTitle('');
    setError('');
    setViewingSaved(null);
  };

  // Viewing a saved briefing
  if (viewingSaved) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewingSaved(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{viewingSaved.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(viewingSaved.content)}>
            {copied ? <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadMarkdown(viewingSaved.title, viewingSaved.content)}>
            <Download className="w-4 h-4 mr-1.5" />
            Download
          </Button>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
          <SimpleMarkdown content={viewingSaved.content} className="text-sm text-[var(--text-secondary)] leading-relaxed" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Briefing Builder</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Build formatted briefings from recent news articles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedBriefings.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowSaved(!showSaved)}>
              <Clock className="w-4 h-4 mr-1.5" />
              Saved ({savedBriefings.length})
            </Button>
          )}
          {step !== 'select' && (
            <Button variant="ghost" size="sm" onClick={resetBuilder}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Saved briefings drawer */}
      {showSaved && savedBriefings.length > 0 && (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Saved Briefings</h3>
            <button onClick={() => setShowSaved(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {savedBriefings.map((b) => {
              const meta = (() => { try { return JSON.parse(b.metadata || '{}'); } catch { return {}; } })();
              return (
                <button
                  key={b.id}
                  onClick={() => { setViewingSaved(b); setShowSaved(false); }}
                  className="w-full text-left p-3 rounded-lg bg-[var(--navy)] hover:bg-[var(--navy-lighter)] border border-[var(--border)] transition-colors"
                >
                  <div className="text-sm font-medium text-[var(--text-primary)]">{b.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                    <span>{new Date(b.created_at).toLocaleDateString('en-GB')}</span>
                    {meta.format_label && <Badge>{meta.format_label}</Badge>}
                    <span>{meta.article_count || 0} articles</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const currentIdx = STEPS.findIndex((st) => st.key === step);
          const isActive = s.key === step;
          const isCompleted = i < currentIdx;
          return (
            <div key={s.key} className="flex items-center gap-2 flex-shrink-0">
              {i > 0 && <div className={`w-4 sm:w-6 h-px ${isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-[var(--accent)] text-white' :
                  isCompleted ? 'bg-[var(--accent)]/20 text-[var(--accent)]' :
                  'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.number}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Select Articles */}
      {step === 'select' && (
        <div className="space-y-4">
          {/* Search & filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              <Filter className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 mr-1" />
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--navy-light)] border border-[var(--border)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected count */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg">
              <span className="text-sm text-[var(--accent)] font-medium">
                {selectedIds.size} article{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button size="sm" onClick={goNext}>
                Next: Add Context
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Article list */}
          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="ml-2 text-[var(--text-secondary)] text-sm">Loading articles...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredArticles.map((article) => {
                const isSelected = selectedIds.has(article.id);
                const tags = (() => { try { return JSON.parse(article.tags || '[]'); } catch { return []; } })();
                return (
                  <button
                    key={article.id}
                    onClick={() => toggleArticle(article.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30'
                        : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--accent)]/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)]'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{article.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{article.summary}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] text-[var(--text-secondary)]">{article.source}</span>
                          <Badge>{article.category}</Badge>
                          {tags.slice(0, 2).map((t: string) => (
                            <Badge key={t} variant="default">{t}</Badge>
                          ))}
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            {new Date(article.published_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredArticles.length === 0 && (
                <p className="text-center text-sm text-[var(--text-secondary)] py-8">No articles match your filters.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Add Context / Notes */}
      {step === 'notes' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Optionally add notes or impact assessments for each selected article. These will guide the AI&apos;s analysis.
          </p>
          <div className="space-y-3">
            {selectedArticles.map((article) => (
              <div key={article.id} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{article.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-3">{article.source} &middot; {new Date(article.published_at).toLocaleDateString('en-GB')}</p>
                <textarea
                  placeholder="Add notes, impact assessment, or context for this article..."
                  value={notes[article.id] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [article.id]: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={goNext}>
              Next: Configure Format
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Configure Format */}
      {step === 'configure' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Choose the briefing format. This determines the tone, structure, and audience of the output.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMATS.map((f) => {
              const isSelected = format === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30'
                      : 'bg-[var(--navy-light)] border-[var(--border)] hover:border-[var(--accent)]/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[var(--accent)]/10' : 'bg-[var(--navy-lighter)]'
                    }`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                        {f.label}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{f.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Briefing Summary</h3>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <p><strong className="text-[var(--text-primary)]">{selectedIds.size}</strong> articles selected</p>
              <p><strong className="text-[var(--text-primary)]">{Object.values(notes).filter(Boolean).length}</strong> articles with notes</p>
              <p>Format: <strong className="text-[var(--text-primary)]">{FORMATS.find((f) => f.key === format)?.label}</strong></p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button onClick={handleGenerate} loading={generating}>
              Generate Briefing
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Generating */}
      {step === 'generate' && generating && (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Generating Your Briefing</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Analysing {selectedIds.size} articles and preparing your {FORMATS.find((f) => f.key === format)?.label}...
          </p>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 'review' && generatedContent && (
        <div className="space-y-4">
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{generatedTitle}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {selectedIds.size} articles &middot; {FORMATS.find((f) => f.key === format)?.label}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent)}>
                  {copied ? <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadMarkdown(generatedTitle, generatedContent)}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
                <Button variant="secondary" size="sm" onClick={resetBuilder}>
                  <FileText className="w-4 h-4 mr-1.5" />
                  New Briefing
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
            <SimpleMarkdown content={generatedContent} className="text-sm text-[var(--text-secondary)] leading-relaxed" />
          </div>
        </div>
      )}
    </div>
  );
}
