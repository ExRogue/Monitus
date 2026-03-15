'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import SimpleMarkdown from '@/components/SimpleMarkdown';

type TabType = 'monthly' | 'quarterly';

interface Report {
  id: string;
  company_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  title: string;
  content: string;
  metadata: string;
  created_at: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('monthly');
  const [monthlyReport, setMonthlyReport] = useState<Report | null>(null);
  const [quarterlyReport, setQuarterlyReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [monthlyRes, quarterlyRes] = await Promise.all([
        fetch('/api/reports/monthly'),
        fetch('/api/reports/quarterly'),
      ]);
      const monthlyData = await monthlyRes.json();
      const quarterlyData = await quarterlyRes.json();
      setMonthlyReport(monthlyData.report || null);
      setQuarterlyReport(quarterlyData.report || null);
    } catch {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const generateReport = async (type: TabType) => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/${type}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate report');
        return;
      }
      if (type === 'monthly') setMonthlyReport(data.report);
      else setQuarterlyReport(data.report);
    } catch {
      setError('Failed to generate report');
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

  const currentReport = activeTab === 'monthly' ? monthlyReport : quarterlyReport;

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'monthly', label: 'Monthly Intelligence', icon: Calendar },
    { key: 'quarterly', label: 'Quarterly Positioning', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Generate monthly and quarterly reports to share with your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--navy-light)] rounded-lg border border-[var(--border)] w-full sm:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === tab.key
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading reports...</span>
        </div>
      ) : currentReport ? (
        <div className="space-y-4">
          {/* Report header card */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{currentReport.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Generated {new Date(currentReport.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {(() => {
                      try {
                        const meta = JSON.parse(currentReport.metadata || '{}');
                        return (
                          <>
                            <span>{meta.article_count || 0} articles analysed</span>
                            <span>{meta.content_count || 0} content pieces</span>
                          </>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(currentReport.content)}
                >
                  {copied ? <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadMarkdown(currentReport.title, currentReport.content)}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => generateReport(activeTab)}
                  loading={generating}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Regenerate
                </Button>
              </div>
            </div>
          </div>

          {/* Report content */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
            <SimpleMarkdown
              content={currentReport.content}
              className="text-sm text-[var(--text-secondary)] leading-relaxed"
            />
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No {activeTab === 'monthly' ? 'Monthly Intelligence Report' : 'Quarterly Positioning Review'} Yet
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
            {activeTab === 'monthly'
              ? 'Generate your first monthly intelligence report to get a comprehensive summary of news themes, content performance, and market insights.'
              : 'Generate your first quarterly positioning review to assess how your content aligns with your narrative and market movements.'
            }
          </p>
          <Button
            onClick={() => generateReport(activeTab)}
            loading={generating}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate {activeTab === 'monthly' ? 'Monthly Report' : 'Quarterly Review'}
          </Button>
        </div>
      )}
    </div>
  );
}
