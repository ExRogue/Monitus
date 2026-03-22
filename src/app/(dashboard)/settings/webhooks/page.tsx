'use client';
import { useEffect, useState, useCallback } from 'react';
import { Webhook, Plus, Trash2, Loader2, CheckCircle, AlertTriangle, RefreshCw, Power, Eye, EyeOff, Copy, Globe } from 'lucide-react';
import Button from '@/components/ui/Button';

interface UserWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  last_fired_at: string | null;
  last_status: number | null;
  created_at: string;
}

const ALL_EVENTS = [
  { id: 'content.generated', label: 'Content Generated' },
  { id: 'content.approved', label: 'Content Approved' },
  { id: 'content.published', label: 'Content Published' },
  { id: 'signal.created', label: 'Signal Created' },
  { id: 'opportunity.created', label: 'Opportunity Created' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<UserWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(ALL_EVENTS.map(e => e.id));
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: 'success' | 'error'; message: string; secret?: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks/user');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0) return;
    setCreating(true);
    setCreateStatus(null);
    try {
      const res = await fetch('/api/webhooks/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), events: selectedEvents }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateStatus({ type: 'success', message: 'Webhook created. Save the signing secret below — it will not be shown again.', secret: data.secret });
        setUrl('');
        loadWebhooks();
      } else {
        setCreateStatus({ type: 'error', message: data.error || 'Failed to create webhook' });
      }
    } catch {
      setCreateStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    setTogglingId(id);
    try {
      await fetch('/api/webhooks/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      });
      loadWebhooks();
    } catch {}
    finally { setTogglingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? Events will no longer be delivered to it.')) return;
    setDeletingId(id);
    try {
      await fetch('/api/webhooks/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadWebhooks();
    } catch {}
    finally { setDeletingId(null); }
  };

  const handleCopySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Webhook className="w-6 h-6 text-[var(--accent)]" /> Webhooks
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Receive real-time HTTP callbacks when events occur in your Monitus account
          </p>
        </div>
        <Button variant="ghost" onClick={loadWebhooks} className="flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Create webhook form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent)]" /> Add Webhook Endpoint
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Endpoint URL (HTTPS required)</label>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-app.com/api/monitus-webhook"
                required
                className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Events to subscribe to</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map(event => (
                <label
                  key={event.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedEvents.includes(event.id)
                      ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5 text-[var(--text-primary)]'
                      : 'border-[var(--border)] bg-[var(--navy)] text-[var(--text-secondary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                    selectedEvents.includes(event.id) ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
                  }`}>
                    {selectedEvents.includes(event.id) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {event.label}
                </label>
              ))}
            </div>
          </div>

          {createStatus && (
            <div className={`rounded-lg border p-4 space-y-3 ${createStatus.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="flex items-center gap-2">
                {createStatus.type === 'success'
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <p className={`text-sm font-medium ${createStatus.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {createStatus.message}
                </p>
              </div>
              {createStatus.secret && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
                    {showSecret ? createStatus.secret : '•'.repeat(Math.min(createStatus.secret.length, 40))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySecret(createStatus.secret!)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
                  >
                    {copiedSecret ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" loading={creating} className="flex items-center gap-1.5">
            <Webhook className="w-4 h-4" /> Create Webhook
          </Button>
        </form>
      </div>

      {/* Webhook list */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Registered Endpoints ({webhooks.length})
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
            No webhooks yet. Add an endpoint above to start receiving events.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {webhooks.map(hook => (
              <div key={hook.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hook.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate font-mono">{hook.url}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Array.isArray(hook.events) ? hook.events : JSON.parse(hook.events as unknown as string)).map((evt: string) => (
                        <span key={evt} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--navy)] text-[var(--text-secondary)]">
                          {evt}
                        </span>
                      ))}
                    </div>
                    {hook.last_fired_at && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Last fired {new Date(hook.last_fired_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                        {hook.last_status && (
                          <span className={`ml-2 ${hook.last_status >= 200 && hook.last_status < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                            HTTP {hook.last_status}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(hook.id, hook.active)}
                      disabled={togglingId === hook.id}
                      className={`p-1.5 rounded-lg transition-colors ${hook.active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-slate-500 hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'}`}
                      title={hook.active ? 'Disable' : 'Enable'}
                    >
                      {togglingId === hook.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(hook.id)}
                      disabled={deletingId === hook.id}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete webhook"
                    >
                      {deletingId === hook.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification docs */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--navy-light)] px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">Verifying webhook signatures</p>
        <p>Each request includes an <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">X-Monitus-Signature</code> header.</p>
        <p>Compute <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">HMAC-SHA256(raw_body, signing_secret)</code> and compare to <code className="bg-[var(--navy)] px-1 py-0.5 rounded text-[var(--text-primary)]">sha256=&lt;hex&gt;</code>.</p>
      </div>
    </div>
  );
}
