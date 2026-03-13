'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Activity, Users } from 'lucide-react';

interface AnalyticsData {
  data: any[];
  contentTypes?: string[];
  eventTypes?: string[];
}

export default function AnalyticsDashboard() {
  const [metric, setMetric] = useState('user-growth');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/analytics?metric=${metric}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [metric]);

  const formatLabel = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const renderUserGrowthChart = () => {
    if (!analyticsData?.data) return null;
    const maxValue = Math.max(...analyticsData.data.map((d: any) => d.cumulative || 0), 1);

    return (
      <div className="space-y-4">
        <div className="flex items-end gap-1 h-[200px]">
          {analyticsData.data.slice(-7).map((item: any, idx: number) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-xs font-medium text-[var(--foreground)]">{item.cumulative || 0}</span>
              <div
                className="w-full bg-[#4A9E96] rounded-t-lg transition-all"
                style={{
                  height: `${((item.cumulative || 0) / maxValue) * 160}px`,
                }}
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
        <div className="text-sm text-[var(--muted-foreground)]">
          Total users: {analyticsData.data[analyticsData.data.length - 1]?.cumulative || 0}
        </div>
      </div>
    );
  };

  const renderContentGeneratedChart = () => {
    if (!analyticsData?.data) return null;
    const contentTypes = analyticsData.contentTypes || [];
    const maxValue = Math.max(
      ...analyticsData.data.flatMap((d: any) =>
        contentTypes.map((ct) => d[ct] || 0)
      ),
      1
    );

    return (
      <div className="space-y-6">
        {contentTypes.map((type) => {
          const total = analyticsData.data.reduce((sum: number, d: any) => sum + (d[type] || 0), 0);
          return (
            <div key={type}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--foreground)]">{formatLabel(type)}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{total} total</span>
              </div>
              <div className="flex items-end gap-0.5 h-[80px]">
                {analyticsData.data.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#5A8A9A] rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(((item[type] || 0) / maxValue) * 80, (item[type] || 0) > 0 ? 4 : 0)}px`,
                      opacity: (item[type] || 0) > 0 ? 1 : 0.15,
                    }}
                    title={`${item.date}: ${item[type] || 0}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPopularContentTypes = () => {
    if (!analyticsData?.data) return null;
    const maxCount = Math.max(...analyticsData.data.map((d: any) => d.count || 0), 1);

    return (
      <div className="space-y-3">
        {analyticsData.data.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-sm font-medium w-44 truncate text-[var(--foreground)]" title={item.content_type}>
              {formatLabel(item.content_type)}
            </span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-6 overflow-hidden">
              <div
                className="bg-[#3AAF7C] h-full transition-all flex items-center justify-end pr-2 min-w-[2rem]"
                style={{ width: `${((item.count || 0) / maxCount) * 100}%` }}
              >
                <span className="text-xs font-bold text-white">{item.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAPIUsage = () => {
    if (!analyticsData?.data) return null;
    const eventTypes = analyticsData.eventTypes || [];
    const maxValue = Math.max(
      ...analyticsData.data.flatMap((d: any) =>
        eventTypes.map((et) => d[et] || 0)
      ),
      1
    );

    return (
      <div className="space-y-6">
        {eventTypes.map((type) => {
          const total = analyticsData.data.reduce((sum: number, d: any) => sum + (d[type] || 0), 0);
          return (
            <div key={type}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--foreground)]">{formatLabel(type)}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{total} total</span>
              </div>
              <div className="flex items-end gap-0.5 h-[80px]">
                {analyticsData.data.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#6B7D92] rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(((item[type] || 0) / maxValue) * 80, (item[type] || 0) > 0 ? 4 : 0)}px`,
                      opacity: (item[type] || 0) > 0 ? 1 : 0.15,
                    }}
                    title={`${item.date}: ${item[type] || 0}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSubscriptionBreakdown = () => {
    if (!analyticsData?.data) return null;
    const total = analyticsData.data.reduce((sum: number, d: any) => sum + (d.count || 0), 0);

    return (
      <div className="space-y-3">
        {analyticsData.data.map((item: any, idx: number) => {
          const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-sm font-medium w-36 text-[var(--foreground)]">{item.plan_name}</span>
              <div className="flex-1 bg-[var(--border)] rounded-full h-6 overflow-hidden">
                <div
                  className="bg-[#4A9E96] h-full transition-all flex items-center justify-end pr-2 min-w-[3rem]"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-xs font-bold text-white">
                    {item.count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const tabs = [
    { key: 'user-growth', label: 'User Growth', icon: Users, color: 'teal' },
    { key: 'content-generated', label: 'Content Generated', icon: Activity, color: 'cyan' },
    { key: 'popular-content-types', label: 'Popular Types', icon: TrendingUp, color: 'emerald' },
    { key: 'api-usage', label: 'API Usage', icon: BarChart3, color: 'slate' },
    { key: 'subscription-breakdown', label: 'Plans', icon: BarChart3, color: 'teal' },
  ];

  const activeColors: Record<string, string> = {
    teal: 'bg-[#4A9E96] text-white',
    cyan: 'bg-[#5A8A9A] text-white',
    emerald: 'bg-[#3AAF7C] text-white',
    slate: 'bg-[#6B7D92] text-white',
  };

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = metric === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setMetric(tab.key)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isActive
                  ? activeColors[tab.color]
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Chart Container */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
        {loading && <div className="text-center py-8 text-[var(--muted-foreground)]">Loading analytics...</div>}
        {error && <div className="text-center py-8 text-red-500">Error: {error}</div>}
        {!loading && !error && analyticsData && (
          <>
            {metric === 'user-growth' && renderUserGrowthChart()}
            {metric === 'content-generated' && renderContentGeneratedChart()}
            {metric === 'popular-content-types' && renderPopularContentTypes()}
            {metric === 'api-usage' && renderAPIUsage()}
            {metric === 'subscription-breakdown' && renderSubscriptionBreakdown()}
          </>
        )}
      </div>
    </div>
  );
}
