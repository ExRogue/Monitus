'use client';
import { useEffect, useState, useCallback } from 'react';
import { Users, UserPlus, Trash2, Loader2, Mail, Crown, Shield, Eye, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_owner: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

const ROLE_META: Record<string, { label: string; icon: typeof Eye; color: string; description: string }> = {
  admin: { label: 'Admin', icon: Crown, color: 'text-amber-400', description: 'Full access, can manage team and billing' },
  editor: { label: 'Editor', icon: Shield, color: 'text-blue-400', description: 'Can generate and publish content' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-slate-400', description: 'Read-only access to all content' },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvites(data.invites || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteStatus(null);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteStatus({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
        setInviteEmail('');
        loadTeam();
      } else {
        setInviteStatus({ type: 'error', message: data.error || 'Failed to send invitation' });
      }
    } catch {
      setInviteStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member? They will lose access immediately.')) return;
    setRemovingId(id);
    try {
      await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadTeam();
    } catch {}
    finally { setRemovingId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--accent)]" /> Team Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Invite colleagues and manage their access to Monitus
          </p>
        </div>
        <Button variant="ghost" onClick={loadTeam} className="flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Invite form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[var(--accent)]" /> Invite Team Member
        </h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          {/* Role descriptions */}
          <div className="grid grid-cols-2 gap-3">
            {(['editor', 'viewer'] as const).map(role => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <div key={role} className={`rounded-lg border p-3 text-xs ${inviteRole === role ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--navy)]'}`}>
                  <div className={`flex items-center gap-1.5 font-semibold mb-1 ${meta.color}`}>
                    <Icon className="w-3.5 h-3.5" /> {meta.label}
                  </div>
                  <p className="text-[var(--text-secondary)]">{meta.description}</p>
                </div>
              );
            })}
          </div>

          {inviteStatus && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${inviteStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
              {inviteStatus.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {inviteStatus.message}
            </div>
          )}

          <Button type="submit" variant="primary" loading={inviting} className="flex items-center gap-1.5">
            <Mail className="w-4 h-4" /> Send Invitation
          </Button>
        </form>
      </div>

      {/* Current members */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Team Members ({members.length})
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading team...
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
            No team members yet. Invite someone above.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {members.map(member => {
              const roleMeta = ROLE_META[member.role] || ROLE_META.viewer;
              const RoleIcon = roleMeta.icon;
              return (
                <div key={member.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[var(--accent)]">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.name}</p>
                        {member.is_owner && (
                          <span className="text-xs px-1.5 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20">Owner</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${roleMeta.color}`}>
                      <RoleIcon className="w-3.5 h-3.5" /> {roleMeta.label}
                    </span>
                    {!member.is_owner && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={removingId === member.id}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Remove member"
                      >
                        {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Pending Invitations ({invites.length})
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{invite.email}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {ROLE_META[invite.role]?.label || invite.role} · Expires {new Date(invite.expires_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(invite.id)}
                  disabled={removingId === invite.id}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Cancel invitation"
                >
                  {removingId === invite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
