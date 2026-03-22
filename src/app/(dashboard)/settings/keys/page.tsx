'use client';
import { useEffect, useState, useCallback } from 'react';
import { Key, Plus, Trash2, Loader2, Copy, AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw, Lock } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  scopes: string[];
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: 'success' | 'error'; message: string; key?: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [tierError, setTierError] = useState('');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setTierError('');
    try {
      const res = await fetch('/api/keys');
      if (res.status === 403) {
        const data = await res.json();
        setTierError(data.error || 'API keys require the Intelligence plan.');
      } else if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    setCreateStatus(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateStatus({ type: 'success', message: 'API key created. Copy it now — it will not be shown again.', key: data.key });
        setNewKeyName('');
        loadKeys();
      } else {
        setCreateStatus({ type: 'error', message: data.error || 'Failed to create key' });
      }
    } catch {
      setCreateStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this key? Any integrations using it will immediately stop working.')) return;
    setRevokingId(id);
    try {
      await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadKeys();
    } catch {}
    finally { setRevokingId(null); }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (tierError) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Intelligence Plan Required</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">{tierError}</p>
          <a href="/billing" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
            View Plans &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Key className="w-6 h-6 text-[var(--accent)]" /> API Keys
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Programmatic access to Monitus intelligence — Intelligence plan only
          </p>
        </div>
        <Button variant="ghost" onClick={loadKeys} className="flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Create key form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent)]" /> Create New API Key
        </h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="e.g. Production integration, CI/CD pipeline..."
            required
            maxLength={60}
            className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
          />
          <Button type="submit" variant="primary" loading={creating} className="flex items-center gap-1.5 flex-shrink-0">
            <Key className="w-4 h-4" /> Create
          </Button>
        </form>

        {/* New key reveal */}
        {createStatus && (
          <div className={`rounded-lg border p-4 space-y-3 ${createStatus.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex items-center gap-2">
              {createStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium ${createStatus.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                {createStatus.message}
              </p>
            </div>
            {createStatus.key && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
                  {showKey ? createStatus.key : '•'.repeat(Math.min(createStatus.key.length, 40))}
                </div>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
                  title={showKey ? 'Hide' : 'Show'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopyKey(createStatus.key!)}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedKey ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--text-secondary)]">
          You can create up to 5 active API keys. Keys are valid indefinitely until revoked. Include in the <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">Authorization: Bearer {'<key>'}</code> header.
        </p>
      </div>

      {/* Key list */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Active Keys ({keys.length}/5)
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
            No API keys yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {keys.map(apiKey => (
              <div key={apiKey.id} className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{apiKey.name}</p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                    {apiKey.key_prefix}{'•'.repeat(20)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Created {new Date(apiKey.created_at).toLocaleDateString('en-GB')}
                    {apiKey.last_used_at && ` · Last used ${new Date(apiKey.last_used_at).toLocaleDateString('en-GB')}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(apiKey.id)}
                  disabled={revokingId === apiKey.id}
                  className="ml-4 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg px-2.5 py-1.5 transition-colors"
                  title="Revoke key"
                >
                  {revokingId === apiKey.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Docs hint */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">Using the API</p>
        <p>Base URL: <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">https://www.monitus.ai/api/v1</code></p>
        <p>Endpoints: <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">POST /v1/generate</code> · <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">POST /v1/articles</code></p>
        <p>Full documentation in <a href="/docs/04-API-DOCUMENTATION.md" className="text-[var(--accent)] hover:underline">API Reference</a>.</p>
      </div>
    </div>
  );
}
