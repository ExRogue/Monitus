'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, RotateCcw, CheckCircle, AlertCircle, Type, FileText } from 'lucide-react';
import Link from 'next/link';

interface ContentEntry {
  key: string;
  value: string;
  default_value: string;
  section: string;
  label: string;
  field_type: string;
  is_custom: boolean;
}

const SECTION_META: Record<string, { label: string; icon: typeof Type }> = {
  hero: { label: 'Hero Section', icon: Type },
  sources: { label: 'Source Bar', icon: FileText },
  features: { label: 'Features', icon: FileText },
  steps: { label: 'How It Works', icon: FileText },
  audience: { label: 'Who It\'s For', icon: FileText },
  pricing: { label: 'Pricing', icon: FileText },
  cta: { label: 'CTA / Waitlist', icon: FileText },
  footer: { label: 'Footer', icon: FileText },
};

const SECTION_ORDER = ['hero', 'sources', 'features', 'steps', 'audience', 'pricing', 'cta', 'footer'];

export default function AdminContentPage() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchContent = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) { setIsAdmin(false); setLoading(false); return; }
      const authData = await authRes.json();
      if (authData.user?.role !== 'admin') { setIsAdmin(false); setLoading(false); return; }
      setIsAdmin(true);

      const res = await fetch('/api/admin/content');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEntries(data.content || []);
    } catch {
      showMessage('Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const changedEntries = Object.entries(editedValues).map(([key, value]) => ({ key, value }));
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: changedEntries }),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Update local state
      setEntries(prev => prev.map(e => {
        if (e.key in editedValues) {
          return { ...e, value: editedValues[e.key], is_custom: true };
        }
        return e;
      }));
      setEditedValues({});
      showMessage('Content saved successfully', 'success');
    } catch {
      showMessage('Failed to save content', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    if (!confirm('Reset this field to its default value?')) return;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error('Failed to reset');

      const entry = entries.find(e => e.key === key);
      if (entry) {
        setEntries(prev => prev.map(e =>
          e.key === key ? { ...e, value: e.default_value, is_custom: false } : e
        ));
        // Remove from edited if present
        setEditedValues(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      showMessage('Reset to default', 'success');
    } catch {
      showMessage('Failed to reset', 'error');
    }
  };

  const getCurrentValue = (entry: ContentEntry) => {
    return editedValues[entry.key] ?? entry.value;
  };

  const sectionEntries = entries.filter(e => e.section === activeSection);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)] mb-2">Site Content</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-[var(--border)] rounded w-32 mb-3" />
              <div className="h-10 bg-[var(--border)] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-[var(--error)]" />
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Access Denied</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">You do not have permission to manage site content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border flex items-center gap-2 shadow-lg text-sm ${
          message.type === 'success'
            ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
            : 'bg-[var(--error)]/10 border-[var(--error)] text-[var(--error)]'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">Site Content</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] ml-8">Edit the copy displayed on the landing page and across the site</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            hasChanges
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
              : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] cursor-not-allowed'
          }`}
        >
          <Save size={16} />
          {saving ? 'Saving...' : hasChanges ? `Save ${Object.keys(editedValues).length} change${Object.keys(editedValues).length !== 1 ? 's' : ''}` : 'No changes'}
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTION_ORDER.map(section => {
          const meta = SECTION_META[section];
          const count = entries.filter(e => e.section === section).length;
          const editedCount = Object.keys(editedValues).filter(k => entries.find(e => e.key === k)?.section === section).length;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activeSection === section
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
              }`}
            >
              {meta?.label || section}
              <span className="text-[11px] opacity-60">({count})</span>
              {editedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content fields */}
      <div className="space-y-4">
        {sectionEntries.map(entry => {
          const currentValue = getCurrentValue(entry);
          const isEdited = entry.key in editedValues;
          const isDifferentFromDefault = currentValue !== entry.default_value;

          return (
            <div
              key={entry.key}
              className={`bg-[var(--navy-light)] border rounded-xl p-4 sm:p-5 transition-colors ${
                isEdited ? 'border-[var(--warning)]/40' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    {entry.label}
                  </label>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-mono">{entry.key}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEdited && (
                    <span className="text-[11px] font-medium text-[var(--warning)] bg-[var(--warning)]/10 px-2 py-0.5 rounded">
                      Unsaved
                    </span>
                  )}
                  {entry.is_custom && !isEdited && (
                    <span className="text-[11px] font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">
                      Customised
                    </span>
                  )}
                  {isDifferentFromDefault && (
                    <button
                      onClick={() => handleReset(entry.key)}
                      title="Reset to default"
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--warning)] hover:bg-[var(--warning)]/10 transition-colors"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>

              {entry.field_type === 'textarea' ? (
                <textarea
                  value={currentValue}
                  onChange={(e) => handleChange(entry.key, e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-y"
                />
              ) : (
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => handleChange(entry.key, e.target.value)}
                  className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              )}

              {isDifferentFromDefault && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                  <span className="opacity-60">Default:</span> {entry.default_value.length > 100 ? entry.default_value.slice(0, 100) + '...' : entry.default_value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--navy-light)] border-t border-[var(--border)] p-4 flex items-center justify-between z-40">
          <p className="text-sm text-[var(--text-secondary)]">
            {Object.keys(editedValues).length} unsaved change{Object.keys(editedValues).length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditedValues({})}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
