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

  const renderUserGrowthChart = () => {
    if (!analyticsData?.data) return null;
    const maxValue = Math.max(...analyticsData.data.map((d: any) => d.cumulative || 0), 1);

    return (
      <div className="space-y-4">
        <div className="flex gap-4 mb-6">
          {analyticsData.data.slice(-7).map((item: any, idx: number) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-blue-500 rounded-t-lg transition-all"
                style={{
                  height: `${((item.cumulative || 0) / maxValue) * 200}px`,
                }}
              />
              <span className="text-xs text-gray-500">
                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600">
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
      <div className="space-y-4">
        {contentTypes.map((type) => (
          <div key={type}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{type}</span>
              <span className="text-xs text-gray-500">
                {analyticsData.data.reduce((sum: number, d: any) => sum + (d[type] || 0), 0)} total
              </span>
            </div>
            <div className="flex gap-0.5">
              {analyticsData.data.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex-1 bg-purple-500 rounded-sm transition-all"
                  style={{
                    height: `${((item[type] || 0) / maxValue) * 100}px`,
                    opacity: (item[type] || 0) > 0 ? 1 : 0.1,
                  }}
                  title={`${item.date}: ${item[type] || 0}`}
                />
              ))}
            </div>
          </div>
        ))}
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
            <span className="text-sm font-medium w-32">{item.content_type}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all flex items-center justify-end pr-2"
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
      <div className="space-y-4">
        {eventTypes.map((type) => (
          <div key={type}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{type}</span>
              <span className="text-xs text-gray-500">
                {analyticsData.data.reduce((sum: number, d: any) => sum + (d[type] || 0), 0)} total
              </span>
            </div>
            <div className="flex gap-0.5">
              {analyticsData.data.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex-1 bg-amber-500 rounded-sm transition-all"
                  style={{
                    height: `${((item[type] || 0) / maxValue) * 100}px`,
                    opacity: (item[type] || 0) > 0 ? 1 : 0.1,
                  }}
                  title={`${item.date}: ${item[type] || 0}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSubscriptionBreakdown = () => {
    if (!analyticsData?.data) return null;
    const total = analyticsData.data.reduce((sum: number, d: any) => sum + (d.count || 0), 0);

    return (
      <div className="space-y-3">
        {analyticsData.data.map((item: any, idx: number) => {
          const percentage = ((item.count || 0) / total) * 100;
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-sm font-medium w-32">{item.plan_name}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all flex items-center justify-end pr-2"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-xs font-bold text-white">
                    {item.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setMetric('user-growth')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            metric === 'user-growth'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          User Growth
        </button>
        <button
          onClick={() => setMetric('content-generated')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            metric === 'content-generated'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Content Generated
        </button>
        <button
          onClick={() => setMetric('popular-content-types')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            metric === 'popular-content-types'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Popular Types
        </button>
        <button
          onClick={() => setMetric('api-usage')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            metric === 'api-usage'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          API Usage
        </button>
        <button
          onClick={() => setMetric('subscription-breakdown')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            metric === 'subscription-breakdown'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Plans
        </button>
      </div>

      {/* Chart Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {loading && <div className="text-center py-8 text-gray-500">Loading analytics...</div>}
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
