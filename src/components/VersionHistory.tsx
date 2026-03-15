'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DiffView from './DiffView';

interface Version {
  id: string;
  content_id: string;
  version_number: number | null;
  title: string;
  content: string;
  change_summary: string;
  created_by: string;
  created_at: string;
  is_current?: boolean;
}

interface VersionHistoryProps {
  contentId: string;
}

export default function VersionHistory({ contentId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/versions?content_id=${encodeURIComponent(contentId)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch versions');
      }
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleSelectVersion = (versionId: string) => {
    if (selectedA === versionId) {
      setSelectedA(null);
      return;
    }
    if (selectedB === versionId) {
      setSelectedB(null);
      return;
    }
    if (!selectedA) {
      setSelectedA(versionId);
    } else if (!selectedB) {
      setSelectedB(versionId);
    } else {
      // Replace the second selection
      setSelectedB(versionId);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (versionId === 'current') return;
    setRestoring(versionId);
    try {
      const res = await fetch('/api/content/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId, action: 'restore', version_id: versionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to restore version');
      }
      // Refresh versions after restore
      await fetchVersions();
      setSelectedA(null);
      setSelectedB(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const getVersion = (id: string) => versions.find(v => v.id === id);

  const versionA = selectedA ? getVersion(selectedA) : null;
  const versionB = selectedB ? getVersion(selectedB) : null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-[var(--text-secondary)]">
        Loading version history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        {error}
        <button onClick={fetchVersions} className="ml-3 text-[var(--accent)] underline text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--navy-light)] rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="text-[var(--text-primary)] font-semibold text-lg">Version History</h3>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Select two versions to compare, or restore a previous version.
        </p>
      </div>

      {/* Version list */}
      <div className="max-h-64 overflow-y-auto">
        {versions.map((version) => {
          const isSelected = selectedA === version.id || selectedB === version.id;
          const selectionLabel =
            selectedA === version.id ? 'A' : selectedB === version.id ? 'B' : null;

          return (
            <div
              key={version.id}
              className={`flex items-center justify-between px-4 py-3 border-b border-[var(--border)] cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]'
                  : 'hover:bg-white/5'
              }`}
              onClick={() => handleSelectVersion(version.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {selectionLabel && (
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center">
                    {selectionLabel}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-[var(--text-primary)] text-sm font-medium truncate">
                    {version.is_current
                      ? 'Current Version'
                      : `Version ${version.version_number}`}
                  </div>
                  <div className="text-[var(--text-secondary)] text-xs">
                    {formatDate(version.created_at)}
                    {version.change_summary && (
                      <span className="ml-2 text-[var(--text-secondary)]">
                        — {version.change_summary}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!version.is_current && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(version.id);
                  }}
                  disabled={restoring === version.id}
                  className="flex-shrink-0 px-3 py-1 text-xs font-medium rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {restoring === version.id ? 'Restoring...' : 'Restore'}
                </button>
              )}
            </div>
          );
        })}

        {versions.length === 0 && (
          <div className="px-4 py-6 text-[var(--text-secondary)] text-sm text-center">
            No version history available yet.
          </div>
        )}
      </div>

      {/* Diff comparison */}
      {versionA && versionB && (
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[var(--text-primary)] font-medium text-sm">
              Comparing{' '}
              <span className="text-[var(--accent)]">
                {versionA.is_current ? 'Current' : `v${versionA.version_number}`}
              </span>
              {' vs '}
              <span className="text-[var(--accent)]">
                {versionB.is_current ? 'Current' : `v${versionB.version_number}`}
              </span>
            </h4>
            <button
              onClick={() => {
                setSelectedA(null);
                setSelectedB(null);
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Clear selection
            </button>
          </div>
          <DiffView oldText={versionA.content} newText={versionB.content} />
        </div>
      )}
    </div>
  );
}
