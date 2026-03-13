'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Mail,
  Linkedin,
  Mic,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  ArrowLeft,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleMarkdown from '@/components/SimpleMarkdown';

interface ContentItem {
  id: string;
  content_type: string;
  title: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
  status: string;
  created_at: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  newsletter: { label: 'Newsletter', icon: Mail, color: 'text-blue-400' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400' },
  podcast: { label: 'Podcast', icon: Mic, color: 'text-amber-400' },
  briefing: { label: 'Briefing', icon: Users, color: 'text-emerald-400' },
};

const TYPE_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'briefing', label: 'Briefing' },
];

function getComplianceScore(notes: string): number {
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed.score === 'number' ? parsed.score : 85;
  } catch {
    return 85;
  }
}

function getComplianceDetails(notes: string): { score: number; passed: boolean; violations: { rule: string; severity: string; message: string }[] } {
  try {
    const parsed = JSON.parse(notes);
    return {
      score: parsed.score ?? 85,
      passed: parsed.passed ?? true,
      violations: parsed.violations ?? [],
    };
  } catch {
    return { score: 85, passed: true, violations: [] };
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContentPage() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get('id');

  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);

  useEffect(() => {
    fetch('/api/generate')
      .then((r) => r.json())
      .then((d) => {
        const items = d.content || [];
        setAllContent(items);
        if (viewId) {
          const match = items.find((c: ContentItem) => c.id === viewId);
          if (match) setSelectedItem(match);
        }
      })
      .finally(() => setLoading(false));
  }, [viewId]);

  const filtered = allContent.filter((item) => {
    if (activeFilter !== 'all' && item.content_type !== activeFilter) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (item: ContentItem) => {
    const blob = new Blob([item.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Detail view ---
  if (selectedItem) {
    const meta = TYPE_META[selectedItem.content_type] || TYPE_META.newsletter;
    const Icon = meta.icon;
    const compliance = getComplianceDetails(selectedItem.compliance_notes);
    const wordCount = selectedItem.content.split(/\s+/).length;

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedItem(null)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all content
        </button>

        {/* Header */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-[var(--navy-lighter)] flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{selectedItem.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="purple" size="md">{meta.label}</Badge>
                  <Badge
                    variant={selectedItem.compliance_status === 'passed' ? 'success' : 'warning'}
                    size="md"
                  >
                    {compliance.score}% Compliance
                  </Badge>
                  <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(selectedItem.created_at)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">{wordCount} words</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleCopy(selectedItem.content)}>
                <Copy className="w-4 h-4 mr-1.5" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleDownload(selectedItem)}>
                <Download className="w-4 h-4 mr-1.5" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Compliance panel */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
          <button
            onClick={() => setComplianceOpen(!complianceOpen)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${compliance.passed ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="font-semibold text-[var(--text-primary)]">Compliance Report</span>
              <Badge variant={compliance.passed ? 'success' : 'warning'} size="md">
                {compliance.passed ? 'Passed' : 'Needs Review'}
              </Badge>
            </div>
            {complianceOpen ? (
              <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
            )}
          </button>
          {complianceOpen && (
            <div className="px-5 pb-5 border-t border-[var(--border)] pt-4">
              {/* Score bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-[var(--text-secondary)]">Overall Score</span>
                  <span className="font-semibold text-[var(--text-primary)]">{compliance.score}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--navy)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      compliance.score >= 90 ? 'bg-emerald-500' : compliance.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${compliance.score}%` }}
                  />
                </div>
              </div>

              {compliance.violations.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  No compliance issues detected
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">{compliance.violations.length} issue(s) found:</p>
                  {compliance.violations.map((v, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        v.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                      }`}
                    >
                      {v.severity === 'high' ? (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{v.rule}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{v.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <SimpleMarkdown
            content={selectedItem.content}
            className="text-[var(--text-secondary)] text-sm leading-relaxed"
          />
        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Content Library</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            All your generated content in one place
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <FileText className="w-4 h-4" />
          {allContent.length} piece{allContent.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--navy-light)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          />
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-[var(--text-secondary)] mr-1" />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === f.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No content yet</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            {allContent.length === 0
              ? 'Head to the Pipeline to generate your first piece of content from industry news.'
              : 'No content matches your current filters. Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const meta = TYPE_META[item.content_type] || TYPE_META.newsletter;
            const Icon = meta.icon;
            const score = getComplianceScore(item.compliance_notes);
            const wordCount = item.content.split(/\s+/).length;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 text-left hover:border-[var(--accent)]/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-[var(--navy-lighter)] flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <Badge
                    variant={item.compliance_status === 'passed' ? 'success' : item.compliance_status === 'warning' || item.compliance_status === 'flagged' ? 'warning' : 'error'}
                  >
                    {score}%
                  </Badge>
                </div>

                <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-2 group-hover:text-[var(--accent)] transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-3">
                  {item.content.substring(0, 150)}...
                </p>

                <div className="flex items-center gap-2 mt-auto">
                  <Badge variant="purple">{meta.label}</Badge>
                  <span className="text-[10px] text-[var(--text-secondary)]">{wordCount} words</span>
                  <span className="text-[10px] text-[var(--text-secondary)] ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.created_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
