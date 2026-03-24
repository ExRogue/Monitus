'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Users, AlertCircle, Search, X, Mail,
  Trash2, DollarSign, Clock, MoreHorizontal, ChevronDown, CheckCircle,
  UserPlus, Shield, Ban, ArrowUpCircle, TrendingUp, TrendingDown,
  Activity, Zap, RefreshCw, ArrowUpDown, ChevronUp,
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

interface Stats {
  total_users: number;
  active_subscriptions: number;
  total_content: number;
  total_articles: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  disabled?: boolean;
  created_at: string;
  plan_name?: string;
  plan_slug?: string;
  plan_price?: number;
  sub_id?: string;
  trial_ends_at?: string;
  status?: string;
}

const ITEMS_PER_PAGE = 10;

const PLAN_OPTIONS = [
  { slug: 'trial', name: 'Trial', price: 0 },
  { slug: 'starter', name: 'Starter', price: 500 },
  { slug: 'professional', name: 'Growth', price: 1200 },
  { slug: 'enterprise', name: 'Intelligence', price: 2000 },
] as const;

type PlanFilter = 'all' | 'trial' | 'starter' | 'professional' | 'enterprise' | 'cancelled';

const PLAN_FILTERS: { id: PlanFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'trial', label: 'Trial' },
  { id: 'starter', label: 'Starter' },
  { id: 'professional', label: 'Growth' },
  { id: 'enterprise', label: 'Intelligence' },
  { id: 'cancelled', label: 'Cancelled' },
];

type SortKey = 'name' | 'role' | 'plan' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

function getTrialDaysLeft(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysSinceCreation(createdAt?: string): number {
  if (!createdAt) return Infinity;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function getPlanDisplay(user: User): { label: string; className: string } {
  const slug = user.plan_slug;
  const isCancelled = user.status === 'cancelled';

  if (isCancelled) {
    return { label: 'Cancelled', className: 'bg-[var(--error)]/10 text-[var(--error)]' };
  }

  if (slug === 'trial' || !slug) {
    const daysLeft = getTrialDaysLeft(user.trial_ends_at);
    if (daysLeft !== null && daysLeft <= 0) {
      return { label: 'Expired', className: 'bg-[var(--error)]/10 text-[var(--error)]' };
    }
    const suffix = daysLeft !== null ? ` ${daysLeft}d` : '';
    return { label: `Trial${suffix}`, className: 'bg-amber-500/10 text-amber-500' };
  }

  if (slug === 'starter') return { label: 'Starter', className: 'bg-blue-500/10 text-blue-500' };
  if (slug === 'professional') return { label: 'Growth', className: 'bg-purple-500/10 text-purple-500' };
  if (slug === 'enterprise') return { label: 'Intelligence', className: 'bg-emerald-500/10 text-emerald-500' };

  return { label: 'No plan', className: 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]' };
}

function getUserInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-amber-500/20 text-amber-400',
    'bg-rose-500/20 text-rose-400',
    'bg-cyan-500/20 text-cyan-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Dropdown menu component ──────────────────────────────────────────────────

function ActionsDropdown({
  user,
  currentUserId,
  onChangePlan,
  onToggleRole,
  onToggleDisabled,
  onDelete,
}: {
  user: User;
  currentUserId: string;
  onChangePlan: (userId: string, slug: string) => void;
  onToggleRole: (userId: string, currentRole: string) => void;
  onToggleDisabled: (userId: string, currentDisabled: boolean) => void;
  onDelete: (userId: string, userName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [planSubmenuOpen, setPlanSubmenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPlanSubmenuOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (user.id === currentUserId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setPlanSubmenuOpen(false); }}
        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1 overflow-visible">
          <div
            className="relative"
            onMouseEnter={() => setPlanSubmenuOpen(true)}
            onMouseLeave={() => setPlanSubmenuOpen(false)}
          >
            <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors">
              <span className="flex items-center gap-2">
                <ArrowUpCircle size={14} className="text-[var(--text-secondary)]" />
                Change Plan
              </span>
              <ChevronDown size={12} className="-rotate-90 text-[var(--text-secondary)]" />
            </button>
            {planSubmenuOpen && (
              <div className="absolute right-full top-0 mr-1 w-48 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
                {PLAN_OPTIONS.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => { onChangePlan(user.id, p.slug); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--navy)] transition-colors ${
                      user.plan_slug === p.slug ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {p.name}{p.price > 0 ? ` (\u00A3${p.price.toLocaleString()})` : ''}
                  </button>
                ))}
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  onClick={() => { onChangePlan(user.id, 'cancel'); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                >
                  Cancel Plan
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => { onToggleRole(user.id, user.role); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
          >
            <Shield size={14} className="text-[var(--text-secondary)]" />
            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
          </button>

          <button
            onClick={() => { onToggleDisabled(user.id, !!user.disabled); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
          >
            <Ban size={14} className="text-[var(--text-secondary)]" />
            {user.disabled ? 'Enable Account' : 'Disable Account'}
          </button>

          <div className="border-t border-[var(--border)] my-1" />

          <button
            onClick={() => { onDelete(user.id, user.name); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
          >
            <Trash2 size={14} />
            Delete User
          </button>
        </div>
      )}
    </div>
  );
}

// ── Plan badge dropdown (clickable inline) ───────────────────────────────────

function PlanBadgeDropdown({
  user,
  currentUserId,
  onChangePlan,
}: {
  user: User;
  currentUserId: string;
  onChangePlan: (userId: string, slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const planDisplay = getPlanDisplay(user);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const isSelf = user.id === currentUserId;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !isSelf && setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${planDisplay.className} ${
          !isSelf ? 'cursor-pointer hover:ring-1 hover:ring-current/30' : 'cursor-default'
        }`}
      >
        {planDisplay.label}
        {!isSelf && <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p.slug}
              onClick={() => { onChangePlan(user.id, p.slug); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--navy)] transition-colors ${
                user.plan_slug === p.slug ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)]'
              }`}
            >
              {p.name}{p.price > 0 ? ` \u00B7 \u00A3${p.price.toLocaleString()}` : ''}
            </button>
          ))}
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={() => { onChangePlan(user.id, 'cancel'); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
          >
            Cancel Plan
          </button>
        </div>
      )}
    </div>
  );
}

// ── Confirmation dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  variant,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              variant === 'danger' ? 'bg-[var(--error)] hover:bg-[var(--error)]/90' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable table header ────────────────────────────────────────────────────

function SortableHeader({
  label, sortKey: sk, currentSort, currentDir, onSort, className,
}: {
  label: string; sortKey: SortKey; currentSort: SortKey; currentDir: SortDir;
  onSort: (key: SortKey) => void; className?: string;
}) {
  const isActive = currentSort === sk;
  return (
    <th
      className={`text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-2.5 cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors group ${className || ''}`}
      onClick={() => onSort(sk)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </span>
    </th>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [invitePlan, setInvitePlan] = useState('trial');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string; variant: 'danger' | 'warning'; onConfirm: () => void;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(userSearch);
      setPage(1);
    }, 250);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [userSearch]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const showMessage = (text: string, type: 'success' | 'error') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authResponse = await fetch('/api/auth/me');
      if (!authResponse.ok) { setIsAdmin(false); setLoading(false); return; }
      const authData = await authResponse.json();
      if (authData.user?.role !== 'admin') { setIsAdmin(false); setLoading(false); return; }
      setIsAdmin(true);
      setCurrentUserId(authData.user.id);

      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setConfirmDialog({
      title: 'Change Role', message: `Change this user's role to ${newRole}?`,
      confirmLabel: `Make ${newRole}`, variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });
          if (!res.ok) throw new Error((await res.json()).error || 'Failed');
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as 'admin' | 'user' } : u));
          showMessage(`User role changed to ${newRole}`, 'success');
        } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to update role', 'error'); }
      },
    });
  };

  const handleToggleDisabled = async (userId: string, currentDisabled: boolean) => {
    const action = currentDisabled ? 'enable' : 'disable';
    setConfirmDialog({
      title: currentDisabled ? 'Enable Account' : 'Disable Account',
      message: `Are you sure you want to ${action} this user? ${!currentDisabled ? 'They will not be able to log in.' : ''}`,
      confirmLabel: currentDisabled ? 'Enable' : 'Disable',
      variant: currentDisabled ? 'warning' : 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disabled: !currentDisabled }),
          });
          if (!res.ok) throw new Error((await res.json()).error || 'Failed');
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, disabled: !currentDisabled } : u));
          showMessage(`User ${action}d successfully`, 'success');
        } catch (err) { showMessage(err instanceof Error ? err.message : `Failed to ${action} user`, 'error'); }
      },
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setConfirmDialog({
      title: 'Delete User',
      message: `Permanently delete ${userName} and all their data? This cannot be undone.`,
      confirmLabel: 'Delete', variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete user');
          setUsers(prev => prev.filter(u => u.id !== userId));
          setSelectedIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
          showMessage('User deleted successfully', 'success');
        } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to delete user', 'error'); }
      },
    });
  };

  const handleChangePlan = async (userId: string, planSlug: string) => {
    if (planSlug === 'cancel') {
      setConfirmDialog({
        title: 'Cancel Plan',
        message: 'Cancel this user\'s plan? They will lose access to paid features.',
        confirmLabel: 'Cancel Plan', variant: 'danger',
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            const res = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planSlug: 'trial' }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_slug: 'trial', plan_name: 'Trial', status: 'cancelled' } : u));
            showMessage('Plan cancelled', 'success');
          } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to cancel plan', 'error'); }
        },
      });
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const planOption = PLAN_OPTIONS.find(p => p.slug === planSlug);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_slug: planSlug, plan_name: planOption?.name || planSlug, status: 'active' } : u));
      showMessage(`Plan changed to ${planOption?.name || planSlug}`, 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to change plan', 'error'); }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteName) { showMessage('Email and name are required', 'error'); return; }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole, plan: invitePlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite user');
      if (data.user) setUsers(prev => [data.user, ...prev]);
      showMessage(`Invite sent to ${inviteEmail}`, 'success');
      setShowInviteModal(false);
      setInviteEmail(''); setInviteName(''); setInviteRole('user'); setInvitePlan('trial');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to send invite', 'error'); }
    finally { setInviteLoading(false); }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    setConfirmDialog({
      title: `Delete ${count} User${count > 1 ? 's' : ''}`,
      message: `Permanently delete ${count} user${count > 1 ? 's' : ''} and all their data? This cannot be undone.`,
      confirmLabel: 'Delete All', variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        let deleted = 0;
        for (const uid of selectedIds) {
          try { const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' }); if (res.ok) deleted++; } catch { /* skip */ }
        }
        setUsers(prev => prev.filter(u => !selectedIds.has(u.id)));
        setSelectedIds(new Set());
        showMessage(`${deleted} user${deleted !== 1 ? 's' : ''} deleted`, 'success');
      },
    });
  };

  const handleBulkChangePlan = async (planSlug: string) => {
    const planOption = PLAN_OPTIONS.find(p => p.slug === planSlug);
    let changed = 0;
    for (const uid of selectedIds) {
      try {
        const res = await fetch(`/api/admin/users/${uid}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planSlug }),
        });
        if (res.ok) changed++;
      } catch { /* skip */ }
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, plan_slug: planSlug, plan_name: planOption?.name || planSlug } : u));
    setSelectedIds(new Set());
    showMessage(`${changed} user${changed !== 1 ? 's' : ''} moved to ${planOption?.name}`, 'success');
  };

  // ── Sorting ────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Computed values ──────────────────────────────────────────────────────

  const filteredAndSortedUsers = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    let result = users.filter(u => {
      if (search && !u.name?.toLowerCase().includes(search) && !u.email?.toLowerCase().includes(search)) return false;
      if (planFilter === 'all') return true;
      if (planFilter === 'cancelled') return u.status === 'cancelled';
      if (planFilter === 'trial') return !u.plan_slug || u.plan_slug === 'trial';
      return u.plan_slug === planFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'role': cmp = (a.role || '').localeCompare(b.role || ''); break;
        case 'plan': cmp = (a.plan_slug || 'trial').localeCompare(b.plan_slug || 'trial'); break;
        case 'status': cmp = (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0); break;
        case 'created_at': cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, debouncedSearch, planFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredAndSortedUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const activeCount = users.filter(u => !u.disabled).length;
  const trialCount = users.filter(u => !u.plan_slug || u.plan_slug === 'trial').length;
  const payingCount = users.filter(u => u.plan_slug && u.plan_slug !== 'trial' && u.status !== 'cancelled').length;

  const mrr = users.reduce((sum, u) => {
    if (u.status === 'cancelled' || u.disabled) return sum;
    const plan = PLAN_OPTIONS.find(p => p.slug === u.plan_slug);
    return sum + (plan?.price || 0);
  }, 0);

  const trialToPaidPct = users.length > 0 ? ((payingCount / Math.max(users.length, 1)) * 100).toFixed(0) : '0';
  const arpu = payingCount > 0 ? Math.round(mrr / payingCount) : 0;
  const cancelledCount = users.filter(u => u.status === 'cancelled').length;
  const churnPct = users.length > 0 ? ((cancelledCount / users.length) * 100).toFixed(1) : '0';
  const newThisWeek = users.filter(u => getDaysSinceCreation(u.created_at) <= 7).length;

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  const allVisibleSelected = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => { const next = new Set(prev); paginatedUsers.forEach(u => next.delete(u.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); paginatedUsers.forEach(u => next.add(u.id)); return next; });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <div className="mb-4">
          <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] mb-1">Command Center</h1>
          <p className="text-xs text-[var(--text-secondary)]">Loading dashboard...</p>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 animate-pulse">
              <div className="h-2.5 bg-[var(--border)] rounded w-16 mb-2" />
              <div className="h-6 bg-[var(--border)] rounded w-12" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 animate-pulse h-64" />
          <div className="lg:col-span-2 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 animate-pulse h-64" />
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-4 animate-pulse">
              <div className="h-4 w-4 bg-[var(--border)] rounded" />
              <div className="h-8 w-8 bg-[var(--border)] rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-[var(--border)] rounded w-36" />
                <div className="h-2.5 bg-[var(--border)] rounded w-48" />
              </div>
              <div className="h-5 bg-[var(--border)] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={20} className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--error)] flex-shrink-0" />
            <h1 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)]">Access Denied</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">You do not have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  // ── Stat cards ─────────────────────────────────────────────────────────

  const statCards: { label: string; value: string | number; sub?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral'; trendColor?: string }[] = [
    { label: 'Total Users', value: users.length, sub: newThisWeek > 0 ? `+${newThisWeek} this week` : undefined, icon: <Users size={14} className="text-[var(--accent)]" />, trend: newThisWeek > 0 ? 'up' : 'neutral', trendColor: 'text-[var(--success)]' },
    { label: 'Active', value: activeCount, sub: `${users.length > 0 ? ((activeCount / users.length) * 100).toFixed(0) : 0}%`, icon: <Activity size={14} className="text-[var(--success)]" />, trend: 'neutral' },
    { label: 'MRR', value: `\u00A3${mrr.toLocaleString()}`, sub: `${payingCount} paying`, icon: <DollarSign size={14} className="text-[var(--success)]" />, trend: payingCount > 0 ? 'up' : 'neutral', trendColor: 'text-[var(--success)]' },
    { label: 'Trial > Paid', value: `${trialToPaidPct}%`, sub: `${trialCount} on trial`, icon: <TrendingUp size={14} className="text-amber-500" />, trend: Number(trialToPaidPct) > 10 ? 'up' : 'neutral', trendColor: Number(trialToPaidPct) > 10 ? 'text-[var(--success)]' : 'text-amber-500' },
    { label: 'ARPU', value: `\u00A3${arpu.toLocaleString()}`, icon: <Zap size={14} className="text-purple-400" />, trend: 'neutral' },
    { label: 'Churn', value: `${churnPct}%`, sub: `${cancelledCount} cancelled`, icon: <TrendingDown size={14} className="text-[var(--error)]" />, trend: Number(churnPct) > 5 ? 'down' : 'neutral', trendColor: Number(churnPct) > 5 ? 'text-[var(--error)]' : 'text-[var(--success)]' },
  ];

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Toast */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border flex items-center gap-2 shadow-lg transition-all text-sm ${
          actionMessage.type === 'success' ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]' : 'bg-[var(--error)]/10 border-[var(--error)] text-[var(--error)]'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium">{actionMessage.text}</span>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} confirmLabel={confirmDialog.confirmLabel} variant={confirmDialog.variant} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-[var(--accent)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Invite User</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')} className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Plan</label>
                  <select value={invitePlan} onChange={(e) => setInvitePlan(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors">
                    {PLAN_OPTIONS.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleInviteUser} disabled={inviteLoading} className="w-full mt-2 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {inviteLoading ? <span>Sending...</span> : <><Mail size={14} />Send Invite</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] mb-0.5">Command Center</h1>
        <p className="text-xs text-[var(--text-secondary)]">Platform overview and user management</p>
      </div>

      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)] rounded-xl p-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-[var(--error)] flex-shrink-0" />
          <p className="text-xs text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* ── Row 1: Compact stat cards (6 across) ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, i) => (
          <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 group hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">{card.label}</span>
              {card.icon}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-[var(--text-primary)] leading-none">{card.value}</span>
              {card.trend === 'up' && <TrendingUp size={12} className={card.trendColor || 'text-[var(--success)]'} />}
              {card.trend === 'down' && <TrendingDown size={12} className={card.trendColor || 'text-[var(--error)]'} />}
            </div>
            {card.sub && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Row 2: Analytics (left ~60%) + Quick Actions (right ~40%) ──── */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <AnalyticsDashboard />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setShowInviteModal(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors text-sm font-medium">
                <UserPlus size={15} />Invite User
              </button>
              <button onClick={fetchData} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--navy-lighter)] transition-colors text-sm">
                <RefreshCw size={15} className="text-[var(--text-secondary)]" />Refresh Data
              </button>
            </div>
          </div>

          {/* Recent Signups */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Recent Signups</h3>
            {recentSignups.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentSignups.map((u) => {
                  const days = getDaysSinceCreation(u.created_at);
                  const planD = getPlanDisplay(u);
                  return (
                    <div key={u.id} className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(u.name)}`}>
                        {getUserInitials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{u.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}
                          {' '}&middot;{' '}
                          <span className={`${planD.className} px-1 py-px rounded text-[10px]`}>{planD.label}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Health */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">System Health</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Content generated</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{stats?.total_content ?? '...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Articles indexed</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{stats?.total_articles ?? '...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Active subscriptions</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{stats?.active_subscriptions ?? '...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Platform status</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Full-width user management table ───────────────────── */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1 flex-wrap">
              {PLAN_FILTERS.map((f) => (
                <button key={f.id} onClick={() => { setPlanFilter(f.id); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    planFilter === f.id ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy)]'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56 sm:flex-none">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
                {userSearch && (
                  <button onClick={() => { setUserSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={12} /></button>
                )}
              </div>
              <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent)]/90 transition-colors whitespace-nowrap">
                <UserPlus size={13} /><span className="hidden sm:inline">Invite</span>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? 's' : ''}
            {planFilter !== 'all' || debouncedSearch ? ' matching filters' : ' total'}
          </p>
        </div>

        <div className="overflow-x-auto">
          {paginatedUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users size={28} className="mx-auto text-[var(--text-secondary)] opacity-40 mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                {debouncedSearch || planFilter !== 'all' ? 'No users match your filters' : 'No users found'}
              </p>
              {(debouncedSearch || planFilter !== 'all') && (
                <button onClick={() => { setUserSearch(''); setPlanFilter('all'); setPage(1); }} className="mt-2 text-xs text-[var(--accent)] hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="w-10 px-3 sm:px-4 py-2.5">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 cursor-pointer" />
                  </th>
                  <SortableHeader label="User" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Role" sortKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                  <SortableHeader label="Plan" sortKey="plan" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                  <SortableHeader label="Joined" sortKey="created_at" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-2.5 w-14" />
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => {
                  const isNew = getDaysSinceCreation(u.created_at) <= 7;
                  return (
                    <tr key={u.id} className={`border-b border-[var(--border)] last:border-0 transition-colors ${selectedIds.has(u.id) ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--navy)]/50'}`}>
                      <td className="w-10 px-3 sm:px-4 py-2.5">
                        <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 cursor-pointer" />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(u.name)}`}>
                            {getUserInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-[var(--text-primary)] truncate text-sm">{u.name}</p>
                              {isNew && <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">New</span>}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 hidden sm:table-cell">
                        <button
                          onClick={() => u.id !== currentUserId && handleToggleRole(u.id, u.role)}
                          disabled={u.id === currentUserId}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            u.role === 'admin' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                          } ${u.id !== currentUserId ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {u.role === 'admin' && <Shield size={10} />}{u.role}
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5">
                        <PlanBadgeDropdown user={u} currentUserId={currentUserId} onChangePlan={handleChangePlan} />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.disabled ? 'bg-[var(--error)]' : 'bg-[var(--success)]'}`} />
                          <span className={u.disabled ? 'text-[var(--error)]' : 'text-[var(--success)]'}>{u.disabled ? 'Disabled' : 'Active'}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 hidden md:table-cell text-xs text-[var(--text-secondary)]">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d') : '--'}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <ActionsDropdown user={u} currentUserId={currentUserId} onChangePlan={handleChangePlan} onToggleRole={handleToggleRole} onToggleDisabled={handleToggleDisabled} onDelete={handleDeleteUser} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filteredAndSortedUsers.length > ITEMS_PER_PAGE && (
          <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredAndSortedUsers.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} />
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-[var(--border)]" />
          <BulkPlanDropdown onSelect={handleBulkChangePlan} />
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors">
            <Trash2 size={14} />Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Deselect All</button>
        </div>
      )}
    </div>
  );
}

// ── Bulk plan dropdown ─────────────────────────────────────────────────────

function BulkPlanDropdown({ onSelect }: { onSelect: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--navy)] rounded-lg transition-colors">
        Change Plan<ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-48 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
          {PLAN_OPTIONS.map((p) => (
            <button key={p.slug} onClick={() => { onSelect(p.slug); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors">
              {p.name}{p.price > 0 ? ` (\u00A3${p.price.toLocaleString()})` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
