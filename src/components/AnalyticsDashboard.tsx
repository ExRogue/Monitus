'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Activity, Users, DollarSign } from 'lucide-react';

interface AnalyticsData {
  data: any[];
  contentTypes?: string[];
  eventTypes?: string[];
}

interface RevenueData {
  mrr: number;
  payingUsers: number;
  conversionRate: number;
  churnRate: number;
  cancelledThisMonth: number;
  arpu: number;
  planBreakdown: { plan_name: string; plan_slug: string; price_monthly: number; user_count: number; revenue: number }[];
  mrrTrend: { month: string; mrr: number }[];
  funnel: { totalSignups: number; completedOnboarding: number; generatedContent: number; upgraded: number };
}

type DateRange = '7d' | '30d' | '90d';

export default function AnalyticsDashboard() {
  const [metric, setMetric] = useState('user-growth');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/analytics?metric=${metric}&range=${dateRange}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        if (metric === 'revenue') {
          setRevenueData(data);
        } else {
          setAnalyticsData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [metric, dateRange]);

  const formatLabel = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const getSliceCount = () => {
    if (dateRange === '7d') return 7;
    if (dateRange === '30d') return 30;
    return 90;
  };

  const renderUserGrowthChart = () => {
    if (!analyticsData?.data) return null;
    const sliced = analyticsData.data.slice(-getSliceCount());
    const maxValue = Math.max(...sliced.map((d: any) => d.cumulative || 0), 1);
    const first = sliced[0]?.cumulative || 0;
    const last = sliced[sliced.length - 1]?.cumulative || 0;
    const change = first > 0 ? (((last - first) / first) * 100).toFixed(1) : '0';
    const isPositive = last >= first;

    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--text-primary)]">{last} users</span>
            <span className={`text-xs font-medium ${isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {isPositive ? '+' : ''}{change}% vs prev period
            </span>
          </div>
        </div>
        <div className="flex items-end gap-[2px] h-[120px]">
          {sliced.map((item: any, idx: number) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full bg-[var(--accent)] rounded-t transition-all hover:bg-[var(--accent-hover)]"
                style={{
                  height: `${Math.max(((item.cumulative || 0) / maxValue) * 110, 2)}px`,
                }}
                title={`${item.date}: ${item.cumulative || 0} users`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
          <span>{sliced[0]?.date ? new Date(sliced[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{sliced[sliced.length - 1]?.date ? new Date(sliced[sliced.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </div>
    );
  };

  const renderContentGeneratedChart = () => {
    if (!analyticsData?.data) return null;
    const contentTypes = analyticsData.contentTypes || [];
    const sliced = analyticsData.data.slice(-getSliceCount());
    const maxValue = Math.max(
      ...sliced.flatMap((d: any) => contentTypes.map((ct) => d[ct] || 0)),
      1
    );

    return (
      <div className="space-y-4">
        {contentTypes.map((type) => {
          const total = sliced.reduce((sum: number, d: any) => sum + (d[type] || 0), 0);
          return (
            <div key={type}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-[var(--text-primary)]">{formatLabel(type)}</span>
                <span className="text-xs text-[var(--text-secondary)]">{total} total</span>
              </div>
              <div className="flex items-end gap-[1px] h-[48px]">
                {sliced.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#5A8A9A] rounded-t-sm transition-all hover:bg-[#6BA0B0]"
                    style={{
                      height: `${Math.max(((item[type] || 0) / maxValue) * 48, (item[type] || 0) > 0 ? 3 : 0)}px`,
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
      <div className="space-y-2.5">
        {analyticsData.data.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs font-medium w-32 truncate text-[var(--text-primary)]" title={item.content_type}>
              {formatLabel(item.content_type)}
            </span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-5 overflow-hidden">
              <div
                className="bg-[var(--success)] h-full transition-all flex items-center justify-end pr-2 min-w-[1.5rem]"
                style={{ width: `${((item.count || 0) / maxCount) * 100}%` }}
              >
                <span className="text-[10px] font-bold text-white">{item.count}</span>
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
    const sliced = analyticsData.data.slice(-getSliceCount());
    const maxValue = Math.max(
      ...sliced.flatMap((d: any) => eventTypes.map((et) => d[et] || 0)),
      1
    );

    return (
      <div className="space-y-4">
        {eventTypes.map((type) => {
          const total = sliced.reduce((sum: number, d: any) => sum + (d[type] || 0), 0);
          return (
            <div key={type}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-[var(--text-primary)]">{formatLabel(type)}</span>
                <span className="text-xs text-[var(--text-secondary)]">{total} total</span>
              </div>
              <div className="flex items-end gap-[1px] h-[48px]">
                {sliced.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#6B7D92] rounded-t-sm transition-all hover:bg-[#7D90A5]"
                    style={{
                      height: `${Math.max(((item[type] || 0) / maxValue) * 48, (item[type] || 0) > 0 ? 3 : 0)}px`,
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
      <div className="space-y-2.5">
        {analyticsData.data.map((item: any, idx: number) => {
          const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs font-medium w-28 text-[var(--text-primary)]">{item.plan_name}</span>
              <div className="flex-1 bg-[var(--border)] rounded-full h-5 overflow-hidden">
                <div
                  className="bg-[var(--accent)] h-full transition-all flex items-center justify-end pr-2 min-w-[2.5rem]"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-[10px] font-bold text-white">
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

  const renderRevenue = () => {
    if (!revenueData) return null;

    const maxMrr = Math.max(...(revenueData.mrrTrend.length > 0 ? revenueData.mrrTrend.map((d) => d.mrr) : [0]), 1);
    const maxRevenue = Math.max(...revenueData.planBreakdown.map((p) => p.revenue), 1);
    const funnel = revenueData.funnel;
    const maxFunnel = Math.max(funnel.totalSignups, 1);

    const funnelSteps = [
      { label: 'Total Signups', value: funnel.totalSignups },
      { label: 'Completed Onboarding', value: funnel.completedOnboarding },
      { label: 'Generated Content', value: funnel.generatedContent },
      { label: 'Upgraded to Paid', value: funnel.upgraded },
    ];

    return (
      <div className="space-y-6">
        {/* MRR Trend */}
        <div>
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">MRR Trend (Last 6 Months)</h4>
          {revenueData.mrrTrend.length > 0 ? (
            <div className="flex items-end gap-2 h-[140px]">
              {revenueData.mrrTrend.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[10px] font-medium text-[var(--text-primary)]">{'\u00A3'}{item.mrr.toLocaleString()}</span>
                  <div
                    className="w-full bg-emerald-500 rounded-t-lg transition-all"
                    style={{ height: `${(item.mrr / maxMrr) * 110}px` }}
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] italic py-4">
              {revenueData.mrr > 0
                ? `Current MRR: ${'\u00A3'}${revenueData.mrr.toLocaleString()}. Historical data will populate over time.`
                : 'No paid subscriptions yet.'}
            </p>
          )}
        </div>

        {/* Plan Breakdown */}
        <div>
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Revenue by Plan</h4>
          {revenueData.planBreakdown.length > 0 ? (
            <div className="space-y-2">
              {revenueData.planBreakdown.map((plan, idx) => {
                const pct = maxRevenue > 0 ? (plan.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 text-[var(--text-primary)]">{plan.plan_name}</span>
                    <div className="flex-1 bg-[var(--border)] rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all flex items-center justify-end pr-2 min-w-[3rem]"
                        style={{ width: `${Math.max(pct, 15)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">
                          {plan.user_count} {'\u00D7'} {'\u00A3'}{plan.price_monthly} = {'\u00A3'}{plan.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] italic">No paid plans active.</p>
          )}
        </div>

        {/* Trial Funnel */}
        <div>
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Trial Funnel</h4>
          <div className="space-y-1.5">
            {funnelSteps.map((step, idx) => {
              const pct = maxFunnel > 0 ? (step.value / maxFunnel) * 100 : 0;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-40 text-[var(--text-primary)]">{step.label}</span>
                  <div className="flex-1 bg-[var(--border)] rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all flex items-center justify-end pr-2 min-w-[2rem]"
                      style={{ width: `${Math.max(pct, 8)}%`, opacity: 1 - idx * 0.15 }}
                    >
                      <span className="text-[10px] font-bold text-white">
                        {step.value} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { key: 'user-growth', label: 'Growth', icon: Users },
    { key: 'content-generated', label: 'Content', icon: Activity },
    { key: 'popular-content-types', label: 'Types', icon: TrendingUp },
    { key: 'api-usage', label: 'API', icon: BarChart3 },
    { key: 'subscription-breakdown', label: 'Plans', icon: BarChart3 },
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
  ];

  const dateRangeOptions: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
  ];

  return (
    <div className="space-y-3">
      {/* Header row: metric tabs + date range */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = metric === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMetric(tab.key)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-medium ${
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center bg-[var(--navy)] border border-[var(--border)] rounded-lg p-0.5">
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                dateRange === opt.key
                  ? 'bg-[var(--navy-lighter)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
        {loading && <div className="text-center py-6 text-[var(--text-secondary)] text-sm">Loading analytics...</div>}
        {error && <div className="text-center py-6 text-[var(--error)] text-sm">Error: {error}</div>}
        {!loading && !error && analyticsData && metric !== 'revenue' && (
          <>
            {metric === 'user-growth' && renderUserGrowthChart()}
            {metric === 'content-generated' && renderContentGeneratedChart()}
            {metric === 'popular-content-types' && renderPopularContentTypes()}
            {metric === 'api-usage' && renderAPIUsage()}
            {metric === 'subscription-breakdown' && renderSubscriptionBreakdown()}
          </>
        )}
        {!loading && !error && metric === 'revenue' && renderRevenue()}
      </div>
    </div>
  );
}
