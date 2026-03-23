'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  ArrowRight,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  Trash2,
  Check,
  Megaphone,
  Tag,
  Rocket,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ContentPreviewModal from '@/components/ContentPreviewModal';
import ExportPdfButton from '@/components/ExportPdfButton';
import CalibrationBadge from '@/components/CalibrationBadge';
import { MessagingBibleNudge } from '@/components/OnboardingChecklist';

interface ContentItem {
  id: string;
  content_type: string;
  title: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
  pillar_tags: string;
  status: string;
  created_at: string;
  narrative_id?: string;
}

interface NarrativeInfo {
  id: string;
  name: string;
  is_default: boolean;
}

const PILLAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

function getPillarColor(pillar: string, allPillars: string[]): string {
  const idx = allPillars.indexOf(pillar);
  return PILLAR_COLORS[idx >= 0 ? idx % PILLAR_COLORS.length : 0];
}

function parsePillarTags(raw: string | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

const TYPE_META: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  newsletter: { label: 'Newsletter', icon: Mail, color: 'text-blue-400' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400' },
  podcast: { label: 'Podcast', icon: Mic, color: 'text-amber-400' },
  briefing: { label: 'Briefing', icon: Users, color: 'text-emerald-400' },
  trade_media: { label: 'Trade Media', icon: Megaphone, color: 'text-rose-400' },
};

const TYPE_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'trade_media', label: 'Trade Media' },
];

const SORT_OPTIONS = [
  { id: 'date-desc', label: 'Newest First' },
  { id: 'date-asc', label: 'Oldest First' },
  { id: 'score-desc', label: 'Highest Compliance' },
  { id: 'score-asc', label: 'Lowest Compliance' },
  { id: 'type', label: 'By Type' },
];

const ITEMS_PER_PAGE = 12;

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
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    }>
      <ContentPageInner />
    </Suspense>
  );
}

function ContentPageInner() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get('id');

  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [modalItem, setModalItem] = useState<ContentItem | null>(null);
  const [error, setError] = useState('');
  const [activePillarFilter, setActivePillarFilter] = useState<string | null>(null);
  const [narratives, setNarratives] = useState<NarrativeInfo[]>([]);
  const [activeNarrativeFilter, setActiveNarrativeFilter] = useState<string>('all');
  const [postingToLinkedIn, setPostingToLinkedIn] = useState(false);
  const [linkedInStatus, setLinkedInStatus] = useState<string | null>(null);
  const [showLinkedInPreview, setShowLinkedInPreview] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<Record<string, 'approved' | 'rejected' | 'pending'>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cardPostingId, setCardPostingId] = useState<string | null>(null);
  const [cardPostSuccess, setCardPostSuccess] = useState<string | null>(null);
  const [linkedInConnected, setLinkedInConnected] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    setError('');
    // Load content and narratives in parallel
    Promise.all([
      fetch('/api/generate').then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          if (r.status === 403) {
            setError('You\u2019ve reached your content generation limit. Upgrade your plan to access your content library.');
          } else {
            setError(d.error || 'Failed to load content');
          }
          return [];
        }
        return d.content || [];
      }).catch(() => { setError('Failed to load content'); return []; }),
      fetch('/api/narratives').then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          return (d.narratives || []).map((n: any) => ({ id: n.id, name: n.name, is_default: n.is_default }));
        }
        return [];
      }).catch(() => []),
    ]).then(([items, narrs]) => {
      setAllContent(items);
      setNarratives(narrs);
      if (viewId) {
        const match = items.find((c: ContentItem) => c.id === viewId);
        if (match) setSelectedItem(match);
      }
    }).finally(() => setLoading(false));

    // Check LinkedIn connection status
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setLinkedInConnected(!!(d.linkedin_connected || d.linkedinConnected));
    }).catch(() => setLinkedInConnected(false));
  }, [viewId]);

  // Collect all unique pillars across content
  const allPillars = Array.from(new Set(
    allContent.flatMap((item) => parsePillarTags(item.pillar_tags))
  )).sort();

  // Pillar coverage stats
  const pillarCoverage: Record<string, number> = {};
  for (const pillar of allPillars) {
    pillarCoverage[pillar] = allContent.filter((item) =>
      parsePillarTags(item.pillar_tags).includes(pillar)
    ).length;
  }

  // Calibration draft IDs — first 3 pieces of content by creation date
  const calibrationIds = new Set(
    [...allContent]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 3)
      .map((item) => item.id)
  );

  // Apply filter
  const filtered = allContent.filter((item) => {
    if (activeFilter !== 'all' && item.content_type !== activeFilter) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activePillarFilter) {
      const tags = parsePillarTags(item.pillar_tags);
      if (!tags.includes(activePillarFilter)) return false;
    }
    if (activeNarrativeFilter !== 'all') {
      if (activeNarrativeFilter === 'none') {
        if (item.narrative_id) return false;
      } else if (item.narrative_id !== activeNarrativeFilter) {
        return false;
      }
    }
    return true;
  });

  // Apply sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'score-desc':
        return getComplianceScore(b.compliance_notes) - getComplianceScore(a.compliance_notes);
      case 'score-asc':
        return getComplianceScore(a.compliance_notes) - getComplianceScore(b.compliance_notes);
      case 'type':
        return a.content_type.localeCompare(b.content_type);
      default:
        return 0;
    }
  });

  // Apply pagination
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginatedContent = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, activePillarFilter, activeNarrativeFilter]);

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

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedContent.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedContent.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`Delete ${selectedIds.size} item(s)? This cannot be undone.`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch('/api/content/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          contentIds: Array.from(selectedIds),
        }),
      });

      if (response.ok) {
        setAllContent(allContent.filter(c => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete content');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast('Failed to delete content');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    try {
      const response = await fetch('/api/content/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          contentIds: Array.from(selectedIds),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `content-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to export content');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      showToast('Failed to export content');
    } finally {
      setBulkLoading(false);
    }
  };

  const handlePostToLinkedIn = async () => {
    setPostingToLinkedIn(true);
    setLinkedInStatus(null);
    setShowLinkedInPreview(false);
    try {
      const res = await fetch('/api/distribution/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: selectedItem?.id }),
      });
      if (res.ok) {
        setLinkedInStatus('Posted to LinkedIn successfully!');
      } else {
        const d = await res.json().catch(() => ({}));
        setLinkedInStatus(d.error || 'Failed to post to LinkedIn');
      }
    } catch {
      setLinkedInStatus('Network error. Please try again.');
    } finally {
      setPostingToLinkedIn(false);
      setTimeout(() => setLinkedInStatus(null), 5000);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedItem) return;
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const recipients = emailRecipients.split(',').map(e => e.trim()).filter(Boolean);
      const res = await fetch('/api/distribution/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: selectedItem.id, recipients }),
      });
      if (res.ok) {
        setEmailStatus('Email sent successfully!');
        setShowEmailModal(false);
        setEmailRecipients('');
      } else {
        const d = await res.json().catch(() => ({}));
        setEmailStatus(d.error || 'Failed to send email');
      }
    } catch {
      setEmailStatus('Network error. Please try again.');
    } finally {
      setEmailSending(false);
      setTimeout(() => setEmailStatus(null), 5000);
    }
  };

  const handleApprove = async (id: string, decision: 'approved' | 'rejected') => {
    setApprovingId(id);
    try {
      await fetch('/api/content/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: decision === 'approved' ? 'approved' : 'rejected' }),
      });
      setApprovalStatus(prev => ({ ...prev, [id]: decision }));
    } catch {}
    finally { setApprovingId(null); }
  };

  const handleCardPostToLinkedIn = async (contentId: string) => {
    setCardPostingId(contentId);
    setCardPostSuccess(null);
    try {
      const res = await fetch('/api/distribution/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId }),
      });
      if (res.ok) {
        setCardPostSuccess(contentId);
        setTimeout(() => setCardPostSuccess(null), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to post to LinkedIn');
      }
    } catch {
      showToast('Network error. Please try again.');
    } finally {
      setCardPostingId(null);
    }
  };

  // --- Detail view ---
  if (selectedItem) {
    const meta = TYPE_META[selectedItem.content_type] || TYPE_META.newsletter;
    const Icon = meta.icon;
    const compliance = getComplianceDetails(selectedItem.compliance_notes);
    const wordCount = selectedItem.content.split(/\s+/).length;

    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-0">
        {/* Back button */}
        <button
          onClick={() => setSelectedItem(null)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all content
        </button>

        {/* Header */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-[var(--navy-lighter)] flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] break-words">{selectedItem.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="purple" size="md">{meta.label}</Badge>
                  <Badge
                    variant={selectedItem.compliance_status === 'passed' ? 'success' : 'warning'}
                    size="md"
                  >
                    {compliance.score}%
                  </Badge>
                  <span className="text-xs sm:text-sm text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(selectedItem.created_at)}
                  </span>
                  <span className="text-xs sm:text-sm text-[var(--text-secondary)]">{wordCount}w</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="secondary" size="sm" onClick={() => handleCopy(selectedItem.content)} className="flex-1 sm:flex-none">
                <Copy className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                <span className="sm:hidden">{copied ? '\u2713' : 'Copy'}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleDownload(selectedItem)} className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">\u2B07</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={postingToLinkedIn}
                onClick={() => setShowLinkedInPreview(true)}
                className="flex-1 sm:flex-none"
              >
                <Linkedin className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{postingToLinkedIn ? 'Posting...' : 'Post to LinkedIn'}</span>
                <span className="sm:hidden">{postingToLinkedIn ? '...' : 'LinkedIn'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                className="flex-1 sm:flex-none"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Send by Email</span>
                <span className="sm:hidden">Email</span>
              </Button>
              <ExportPdfButton
                title={selectedItem.title}
                subtitle={meta.label}
                content={selectedItem.content}
                companyName="Monitus"
                filename={selectedItem.title}
                className="flex-1 sm:flex-none"
              />
            </div>
          </div>
          {linkedInStatus && (
            <div className={`mt-3 text-xs sm:text-sm rounded-lg px-3 py-2 ${linkedInStatus.includes('success') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
              {linkedInStatus}
            </div>
          )}
          {emailStatus && (
            <div className={`mt-3 text-xs sm:text-sm rounded-lg px-3 py-2 ${emailStatus.includes('success') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
              {emailStatus}
            </div>
          )}
        </div>

        {/* LinkedIn preview modal */}
        {showLinkedInPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-sky-400" /> Preview LinkedIn Post
                </h3>
                <button onClick={() => setShowLinkedInPreview(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--navy)] p-4 max-h-64 overflow-y-auto">
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{selectedItem.content}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${selectedItem.content.length > 3000 ? 'text-red-400' : selectedItem.content.length > 2500 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedItem.content.length.toLocaleString()} / 3,000 characters
                </span>
                {selectedItem.content.length > 3000 && (
                  <span className="text-red-400">Post will be truncated by LinkedIn</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowLinkedInPreview(false)} className="flex-1">Cancel</Button>
                <Button variant="primary" size="sm" loading={postingToLinkedIn} onClick={handlePostToLinkedIn} className="flex-1">
                  <Rocket className="w-4 h-4 mr-1.5" /> Confirm &amp; Post
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Email distribution modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" /> Send by Email
                </h3>
                <button onClick={() => setShowEmailModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Enter recipient email addresses, separated by commas. Leave blank to send to your account email.</p>
              <textarea
                value={emailRecipients}
                onChange={e => setEmailRecipients(e.target.value)}
                placeholder="jane@example.com, team@example.com"
                rows={3}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
              />
              {emailStatus && (
                <p className={`text-xs ${emailStatus.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>{emailStatus}</p>
              )}
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowEmailModal(false)} className="flex-1">Cancel</Button>
                <Button variant="primary" size="sm" loading={emailSending} onClick={handleSendEmail} className="flex-1">
                  <Mail className="w-4 h-4 mr-1.5" /> Send
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content approval workflow */}
        {(() => {
          const currentApproval = approvalStatus[selectedItem.id] || (selectedItem.status as 'approved' | 'rejected' | 'pending' | undefined) || 'pending';
          if (currentApproval === 'approved') return (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-300 font-medium">Approved for distribution</span>
            </div>
          );
          if (currentApproval === 'rejected') return (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300 font-medium">Rejected — requires revision before distribution</span>
            </div>
          );
          return (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-300">Compliance Sign-off Required</p>
              </div>
              <p className="text-xs text-amber-300/70">This piece has not yet been approved for external distribution. Review the compliance report above, then approve or reject.</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={approvingId === selectedItem.id}
                  onClick={() => handleApprove(selectedItem.id, 'approved')}
                  className="flex items-center gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={approvingId === selectedItem.id}
                  onClick={() => handleApprove(selectedItem.id, 'rejected')}
                  className="flex items-center gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Compliance panel */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
          <button
            onClick={() => setComplianceOpen(!complianceOpen)}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-3"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Shield className={`w-5 h-5 flex-shrink-0 ${compliance.passed ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">Compliance Report</span>
              <Badge variant={compliance.passed ? 'success' : 'warning'} size="md">
                {compliance.passed ? 'Passed' : 'Needs Review'}
              </Badge>
            </div>
            {complianceOpen ? (
              <ChevronUp className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
            )}
          </button>
          {complianceOpen && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[var(--border)] pt-4">
              {/* Score bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
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
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-0">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-lg border border-red-400/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {toastMessage}
          <button onClick={() => setToastMessage(null)} className="ml-2 p-0.5 hover:bg-white/20 rounded">
            <span className="sr-only">Dismiss</span>&times;
          </button>
        </div>
      )}
      <MessagingBibleNudge />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Content Writer</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Drafting and managing your published content
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)]">
          <FileText className="w-4 h-4" />
          {allContent.length} piece{allContent.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-[var(--navy-light)] border border-[var(--accent)]/20 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.size === paginatedContent.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkExport}
              disabled={bulkLoading}
              className="flex items-center justify-center gap-1 flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export as CSV</span>
              <span className="sm:hidden text-xs">Export</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="flex items-center justify-center gap-1 flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden text-xs">Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Usage limit error banner */}
      {error && (
        <div className="text-xs sm:text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 sm:px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Pillar Coverage Summary */}
      {allPillars.length > 0 && (
        <div style={{
          background: 'var(--navy-light)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Tag style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Pillar Coverage</span>
            {activePillarFilter && (
              <button
                onClick={() => setActivePillarFilter(null)}
                style={{
                  fontSize: '11px',
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Clear filter
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allPillars.map((pillar) => {
              const count = pillarCoverage[pillar] || 0;
              const color = getPillarColor(pillar, allPillars);
              const isActive = activePillarFilter === pillar;
              const maxCount = Math.max(...Object.values(pillarCoverage), 1);
              const barWidth = Math.max((count / maxCount) * 100, 8);
              return (
                <button
                  key={pillar}
                  onClick={() => setActivePillarFilter(isActive ? null : pillar)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: isActive ? `1px solid ${color}` : '1px solid var(--border)',
                    background: isActive ? `${color}15` : 'var(--navy)',
                    cursor: 'pointer',
                    minWidth: '120px',
                    flex: '1 1 120px',
                    maxWidth: '200px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: isActive ? color : 'var(--text-secondary)',
                    lineHeight: '1.3',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {pillar}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                  }}>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      background: 'var(--navy-light)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '16px' }}>
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--navy-light)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Narrative filter */}
          {narratives.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] whitespace-nowrap">Narrative:</span>
              <select
                value={activeNarrativeFilter}
                onChange={(e) => setActiveNarrativeFilter(e.target.value)}
                className="flex-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[11px] sm:text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent cursor-pointer"
              >
                <option value="all">All Narratives</option>
                {narratives.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}{n.is_default ? ' (default)' : ''}
                  </option>
                ))}
                <option value="none">No narrative</option>
              </select>
            </div>
          )}

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[11px] sm:text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {allContent.length === 0 ? (
            <>
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Your content library is empty</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-5">
                This is where your newsletters, LinkedIn posts, briefings, and more will live once you generate them. Go to Opportunities to find a signal or topic and generate your first piece.
              </p>
              <Link href="/opportunities">
                <Button>
                  Go to Opportunities <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No matching content</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mb-5">
                None of your {allContent.length} piece{allContent.length !== 1 ? 's' : ''} match the current filters. Try broadening your search or clearing the active filter.
              </p>
              <Button variant="secondary" onClick={() => { setSearchQuery(''); setActiveFilter('all'); setActivePillarFilter(null); }}>
                Clear all filters
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {paginatedContent.map((item) => {
              const meta = TYPE_META[item.content_type] || TYPE_META.newsletter;
              const Icon = meta.icon;
              const score = getComplianceScore(item.compliance_notes);
              const wordCount = item.content.split(/\s+/).length;
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`relative bg-[var(--navy-light)] border rounded-xl p-4 sm:p-5 transition-all ${
                    isSelected ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="absolute top-3 left-3 w-4 h-4 rounded cursor-pointer"
                  />

                  <button
                    onClick={() => setModalItem(item)}
                    className="w-full text-left group pl-7"
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className={`w-10 h-10 rounded-lg bg-[var(--navy-lighter)] flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <Badge
                        variant={item.compliance_status === 'passed' ? 'success' : item.compliance_status === 'warning' || item.compliance_status === 'flagged' ? 'warning' : 'error'}
                      >
                        {score}%
                      </Badge>
                    </div>

                    <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-2 group-hover:text-[var(--accent)] transition-colors">
                      {item.title}
                    </h3>

                    {calibrationIds.has(item.id) && (
                      <div className="mb-2">
                        <CalibrationBadge />
                      </div>
                    )}

                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] line-clamp-3 mb-3">
                      {item.content.substring(0, 150)}...
                    </p>

                    {/* Pillar tags */}
                    {(() => {
                      const tags = parsePillarTags(item.pillar_tags);
                      if (tags.length === 0) return null;
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {tags.map((tag) => {
                            const color = getPillarColor(tag, allPillars);
                            return (
                              <span
                                key={tag}
                                style={{
                                  display: 'inline-block',
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: `${color}20`,
                                  color: color,
                                  border: `1px solid ${color}30`,
                                  lineHeight: '1.4',
                                }}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap items-center gap-1.5 mt-auto text-[11px] sm:text-xs">
                      <Badge variant="purple">{meta.label}</Badge>
                      {item.narrative_id && (() => {
                        const narr = narratives.find(n => n.id === item.narrative_id);
                        return narr ? (
                          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {narr.name}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-[var(--text-secondary)]">{wordCount}w</span>
                      <span className="text-[var(--text-secondary)] ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                  </button>

                  {/* One-click LinkedIn publish for LinkedIn content */}
                  {item.content_type === 'linkedin' && (
                    <div className="mt-3 pl-7">
                      {linkedInConnected ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCardPostToLinkedIn(item.id); }}
                          disabled={cardPostingId === item.id}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                            cardPostSuccess === item.id
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/30'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {cardPostSuccess === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Posted to LinkedIn
                            </>
                          ) : cardPostingId === item.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Linkedin className="w-3.5 h-3.5" />
                              Post to LinkedIn
                            </>
                          )}
                        </button>
                      ) : linkedInConnected === false ? (
                        <Link
                          href="/settings"
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--navy)]/60 text-[var(--text-secondary)] border border-[var(--border)] hover:text-sky-400 hover:border-sky-500/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          Connect LinkedIn
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sorted.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Content Preview Modal */}
      {modalItem && (
        <ContentPreviewModal
          content={modalItem}
          onClose={() => setModalItem(null)}
          onSave={(updated) => {
            setAllContent((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            );
            setModalItem(null);
          }}
        />
      )}
    </div>
  );
}
