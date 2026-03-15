'use client';
import { useEffect, useState } from 'react';
import {
  Send,
  Calendar,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Linkedin,
  Mail,
  Megaphone,
  TrendingUp,
  Eye,
  MousePointerClick,
  Heart,
  X,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface Distribution {
  id: string;
  content_id: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_url: string;
  engagement_clicks: number;
  engagement_views: number;
  engagement_reactions: number;
  notes: string;
  created_at: string;
  content_title: string;
  content_type: string;
  compliance_status: string;
}

interface AvailableContent {
  id: string;
  title: string;
  content_type: string;
  compliance_status: string;
  created_at: string;
}

interface Analytics {
  published_this_month: number;
  scheduled_count: number;
  total_clicks: number;
  total_views: number;
  total_reactions: number;
  channel_breakdown: { channel: string; count: number; clicks: number; views: number; reactions: number }[];
  best_performing: Distribution[];
}

const CHANNEL_META: Record<string, { label: string; icon: typeof Linkedin; color: string }> = {
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-400' },
  trade_media: { label: 'Trade Media', icon: Megaphone, color: 'text-rose-400' },
};

const TYPE_LABELS: Record<string, string> = {
  newsletter: 'Newsletter',
  linkedin: 'LinkedIn',
  podcast: 'Podcast',
  briefing: 'Briefing',
  trade_media: 'Trade Media',
};

type TabId = 'queue' | 'drafts' | 'scheduled' | 'published' | 'analytics';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DistributePage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [availableContent, setAvailableContent] = useState<AvailableContent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('queue');
  const [showDistributeModal, setShowDistributeModal] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [distributionNotes, setDistributionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/distribution');
      const data = await res.json();
      if (res.ok) {
        setDistributions(data.distributions || []);
        setAvailableContent(data.available_content || []);
        setAnalytics(data.analytics || null);
      }
    } catch {
      console.error('Failed to load distributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDistribute = async () => {
    if (!showDistributeModal || !selectedChannel) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: showDistributeModal,
          channel: selectedChannel,
          scheduled_at: scheduledDate || undefined,
          notes: distributionNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create distribution');
        return;
      }

      // Navigate to the appropriate tab based on what was created
      const createdStatus = scheduledDate ? 'scheduled' : 'drafts';

      // Reset and reload
      setShowDistributeModal(null);
      setSelectedChannel('');
      setScheduledDate('');
      setDistributionNotes('');
      await loadData();
      setActiveTab(createdStatus as TabId);
    } catch {
      setError('Failed to create distribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (distId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/distribution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: distId, status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      console.error('Failed to update distribution');
    }
  };

  const drafts = distributions.filter(d => d.status === 'draft');
  const scheduled = distributions.filter(d => d.status === 'scheduled');
  const published = distributions.filter(d => d.status === 'published');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'queue', label: 'Content Queue', count: availableContent.length },
    { id: 'drafts', label: 'Drafts', count: drafts.length },
    { id: 'scheduled', label: 'Scheduled', count: scheduled.length },
    { id: 'published', label: 'Published', count: published.length },
    { id: 'analytics', label: 'Analytics' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Distribute</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Schedule, publish, and track your content across LinkedIn, email, and trade media.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs text-[var(--text-secondary)]">Published</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">
            {analytics?.published_this_month || 0}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">this month</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[var(--text-secondary)]">Scheduled</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">
            {analytics?.scheduled_count || 0}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">upcoming</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-[var(--text-secondary)]">Views</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">
            {analytics?.total_views || 0}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">total</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-[var(--text-secondary)]">Clicks</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">
            {analytics?.total_clicks || 0}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {availableContent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">📤</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No content to distribute</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">Generate content from the Pipeline first, then come back here to distribute it across your channels.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {availableContent.map(content => (
                <div
                  key={content.id}
                  className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5 hover:border-[var(--accent)]/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="purple">{TYPE_LABELS[content.content_type] || content.content_type}</Badge>
                      <Badge
                        variant={content.compliance_status === 'passed' ? 'success' : content.compliance_status === 'flagged' ? 'warning' : 'default'}
                      >
                        {content.compliance_status === 'passed' ? 'Compliant' : content.compliance_status === 'flagged' ? 'Review' : content.compliance_status}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-2">
                    {content.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[var(--text-secondary)] mb-4">
                    <Clock className="w-3 h-3" />
                    {formatTime(content.created_at)}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setShowDistributeModal(content.id);
                      setSelectedChannel('');
                      setScheduledDate('');
                      setDistributionNotes('');
                      setError('');
                    }}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Distribute
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'drafts' && (
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No drafts yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">Create a distribution without a schedule date to save it as a draft. Drafts let you review content before publishing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map(dist => {
                const channelMeta = CHANNEL_META[dist.channel] || CHANNEL_META.linkedin;
                const ChannelIcon = channelMeta.icon;
                return (
                  <div
                    key={dist.id}
                    className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[var(--navy-lighter)] flex items-center justify-center flex-shrink-0">
                        <ChannelIcon className={`w-5 h-5 ${channelMeta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
                          {dist.content_title || 'Untitled'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="default">{channelMeta.label}</Badge>
                          <Badge variant="warning">Draft</Badge>
                          <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(dist.created_at)}
                          </span>
                        </div>
                        {dist.notes && (
                          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">{dist.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleUpdateStatus(dist.id, 'published')}
                        className="flex-1 sm:flex-none"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateStatus(dist.id, 'scheduled')}
                        className="flex-1 sm:flex-none"
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateStatus(dist.id, 'cancelled')}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          {scheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">🗓️</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Nothing scheduled</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">Schedule content from the Content Queue tab to see it here. Scheduled items will be published at the set date and time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduled.map(dist => {
                const channelMeta = CHANNEL_META[dist.channel] || CHANNEL_META.linkedin;
                const ChannelIcon = channelMeta.icon;
                return (
                  <div
                    key={dist.id}
                    className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[var(--navy-lighter)] flex items-center justify-center flex-shrink-0">
                        <ChannelIcon className={`w-5 h-5 ${channelMeta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
                          {dist.content_title || 'Untitled'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="default">{channelMeta.label}</Badge>
                          {dist.scheduled_at && (
                            <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(dist.scheduled_at)}
                            </span>
                          )}
                        </div>
                        {dist.notes && (
                          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">{dist.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleUpdateStatus(dist.id, 'published')}
                        className="flex-1 sm:flex-none"
                      >
                        Publish Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateStatus(dist.id, 'cancelled')}
                        className="flex-1 sm:flex-none"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'published' && (
        <div className="space-y-4">
          {published.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No published content yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">Content you distribute will appear here with engagement metrics. Start by sending content from the queue or scheduling it for later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {published.map(dist => {
                const channelMeta = CHANNEL_META[dist.channel] || CHANNEL_META.linkedin;
                const ChannelIcon = channelMeta.icon;
                const totalEngagement = dist.engagement_clicks + dist.engagement_views + dist.engagement_reactions;
                return (
                  <div
                    key={dist.id}
                    className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--navy-lighter)] flex items-center justify-center flex-shrink-0">
                          <ChannelIcon className={`w-5 h-5 ${channelMeta.color}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
                            {dist.content_title || 'Untitled'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="default">{channelMeta.label}</Badge>
                            <Badge variant="success">Published</Badge>
                            {dist.published_at && (
                              <span className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                                {formatDate(dist.published_at)}
                              </span>
                            )}
                          </div>
                          {dist.external_url && (
                            <a
                              href={dist.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] sm:text-xs text-[var(--accent)] hover:underline mt-1 inline-block"
                            >
                              View original
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Engagement metrics */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                            {dist.engagement_views}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MousePointerClick className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                            {dist.engagement_clicks}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                            {dist.engagement_reactions}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Channel breakdown */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Channel Breakdown</h3>
            </div>
            {analytics?.channel_breakdown && analytics.channel_breakdown.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {analytics.channel_breakdown.map(ch => {
                  const meta = CHANNEL_META[ch.channel] || CHANNEL_META.linkedin;
                  const Icon = meta.icon;
                  return (
                    <div key={ch.channel} className="bg-[var(--navy)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                        <span className="text-sm font-medium text-[var(--text-primary)]">{meta.label}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Published</span>
                          <span className="text-[var(--text-primary)] font-medium">{ch.count}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Views</span>
                          <span className="text-[var(--text-primary)] font-medium">{ch.views}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Clicks</span>
                          <span className="text-[var(--text-primary)] font-medium">{ch.clicks}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Reactions</span>
                          <span className="text-[var(--text-primary)] font-medium">{ch.reactions}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Publish content to see channel analytics
                </p>
              </div>
            )}
          </div>

          {/* Best performing */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Best Performing Content</h3>
            </div>
            {analytics?.best_performing && analytics.best_performing.length > 0 ? (
              <div className="space-y-3">
                {analytics.best_performing.map((dist, index) => {
                  const total = dist.engagement_clicks + dist.engagement_views + dist.engagement_reactions;
                  const channelMeta = CHANNEL_META[dist.channel] || CHANNEL_META.linkedin;
                  return (
                    <div
                      key={dist.id}
                      className="flex items-center gap-3 sm:gap-4 p-3 bg-[var(--navy)] rounded-lg"
                    >
                      <span className="text-sm sm:text-base font-bold text-[var(--text-secondary)] w-6 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                          {dist.content_title || 'Untitled'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default">{channelMeta.label}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Publish content and add engagement data to see your top performers
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distribute Modal */}
      {showDistributeModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowDistributeModal(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Distribute Content</h2>
                <button
                  onClick={() => setShowDistributeModal(null)}
                  className="p-1 hover:bg-[var(--navy-lighter)] rounded transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {error && (
                <div className="text-xs text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {/* Channel selector */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mb-2 block">
                  Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CHANNEL_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedChannel(key)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          selectedChannel === key
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selectedChannel === key ? 'text-[var(--accent)]' : meta.color}`} />
                        <span className={`text-[11px] sm:text-xs font-medium ${
                          selectedChannel === key ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                        }`}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule date */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mb-2 block">
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Leave empty to create as a draft
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-[var(--text-primary)] mb-2 block">
                  Notes (optional)
                </label>
                <textarea
                  value={distributionNotes}
                  onChange={(e) => setDistributionNotes(e.target.value)}
                  placeholder="Add any notes about this distribution..."
                  rows={2}
                  className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDistributeModal(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDistribute}
                  disabled={!selectedChannel || submitting}
                  loading={submitting}
                  className="flex-1"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {scheduledDate ? 'Schedule' : 'Create Draft'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
