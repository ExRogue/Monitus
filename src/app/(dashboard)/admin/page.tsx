'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Users, AlertCircle, Search, X, Type, Mail,
  Trash2, DollarSign, Clock, MoreHorizontal, ChevronDown, CheckCircle,
  UserPlus, Shield, Ban, ArrowUpCircle,
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

function getTrialDaysLeft(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
    const suffix = daysLeft !== null ? ` · ${daysLeft}d left` : '';
    return { label: `Trial${suffix}`, className: 'bg-amber-500/10 text-amber-500' };
  }

  if (slug === 'starter') {
    return { label: 'Starter', className: 'bg-blue-500/10 text-blue-500' };
  }

  if (slug === 'professional') {
    return { label: 'Growth', className: 'bg-purple-500/10 text-purple-500' };
  }

  if (slug === 'enterprise') {
    return { label: 'Intelligence', className: 'bg-emerald-500/10 text-emerald-500' };
  }

  return { label: 'No plan', className: 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]' };
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
          {/* Change Plan */}
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
                    {p.name}{p.price > 0 ? ` (£${p.price.toLocaleString()})` : ''}
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

          {/* Toggle Role */}
          <button
            onClick={() => { onToggleRole(user.id, user.role); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
          >
            <Shield size={14} className="text-[var(--text-secondary)]" />
            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
          </button>

          {/* Toggle Disabled */}
          <button
            onClick={() => { onToggleDisabled(user.id, !!user.disabled); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
          >
            <Ban size={14} className="text-[var(--text-secondary)]" />
            {user.disabled ? 'Enable Account' : 'Disable Account'}
          </button>

          <div className="border-t border-[var(--border)] my-1" />

          {/* Delete */}
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
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              variant === 'danger'
                ? 'bg-[var(--error)] hover:bg-[var(--error)]/90'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [invitePlan, setInvitePlan] = useState('trial');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');

  // Bulk selection
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
      title: 'Change Role',
      message: `Change this user's role to ${newRole}?`,
      confirmLabel: `Make ${newRole}`,
      variant: 'warning',
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
      confirmLabel: 'Delete',
      variant: 'danger',
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
        confirmLabel: 'Cancel Plan',
        variant: 'danger',
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
    if (!inviteEmail || !inviteName) {
      showMessage('Email and name are required', 'error');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole, plan: invitePlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite user');
      if (data.user) {
        setUsers(prev => [data.user, ...prev]);
      }
      showMessage(`Invite sent to ${inviteEmail}`, 'success');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('user');
      setInvitePlan('trial');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to send invite', 'error'); }
    finally { setInviteLoading(false); }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    setConfirmDialog({
      title: `Delete ${count} User${count > 1 ? 's' : ''}`,
      message: `Permanently delete ${count} user${count > 1 ? 's' : ''} and all their data? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        let deleted = 0;
        for (const uid of selectedIds) {
          try {
            const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
            if (res.ok) deleted++;
          } catch { /* skip */ }
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
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planSlug }),
        });
        if (res.ok) changed++;
      } catch { /* skip */ }
    }
    setUsers(prev => prev.map(u =>
      selectedIds.has(u.id) ? { ...u, plan_slug: planSlug, plan_name: planOption?.name || planSlug } : u
    ));
    setSelectedIds(new Set());
    showMessage(`${changed} user${changed !== 1 ? 's' : ''} moved to ${planOption?.name}`, 'success');
  };

  // ── Computed values ──────────────────────────────────────────────────────

  const filteredUsers = users.filter(u => {
    // Search filter
    const search = userSearch.toLowerCase();
    if (search && !u.name?.toLowerCase().includes(search) && !u.email?.toLowerCase().includes(search)) {
      return false;
    }
    // Plan filter
    if (planFilter === 'all') return true;
    if (planFilter === 'cancelled') return u.status === 'cancelled';
    if (planFilter === 'trial') return !u.plan_slug || u.plan_slug === 'trial';
    return u.plan_slug === planFilter;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const activeCount = users.filter(u => !u.disabled).length;
  const trialCount = users.filter(u => !u.plan_slug || u.plan_slug === 'trial').length;
  const payingCount = users.filter(u => u.plan_slug && u.plan_slug !== 'trial' && u.status !== 'cancelled').length;

  const allVisibleSelected = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedUsers.forEach(u => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedUsers.forEach(u => next.add(u.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="mb-6">
          <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Manage users and subscriptions</p>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="h-3 bg-[var(--border)] rounded w-20 mb-3"></div>
              <div className="h-7 bg-[var(--border)] rounded w-14"></div>
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--border)]">
            <div className="h-9 bg-[var(--border)] rounded w-64 animate-pulse"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 sm:px-6 py-4 border-b border-[var(--border)] flex items-center gap-4 animate-pulse">
              <div className="h-4 w-4 bg-[var(--border)] rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--border)] rounded w-40"></div>
                <div className="h-3 bg-[var(--border)] rounded w-56"></div>
              </div>
              <div className="h-5 bg-[var(--border)] rounded w-16"></div>
              <div className="h-5 bg-[var(--border)] rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Access denied ────────────────────────────────────────────────────────

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

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Toast notification */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border flex items-center gap-2 shadow-lg transition-all text-sm ${
          actionMessage.type === 'success'
            ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
            : 'bg-[var(--error)]/10 border-[var(--error)] text-[var(--error)]'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-[var(--accent)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Invite User</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                    className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Plan</label>
                  <select
                    value={invitePlan}
                    onChange={(e) => setInvitePlan(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    {PLAN_OPTIONS.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleInviteUser}
                disabled={inviteLoading}
                className="w-full mt-2 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {inviteLoading ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Mail size={14} />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Manage users and subscriptions</p>
        </div>
        <Link
          href="/admin/content"
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors text-sm font-medium"
        >
          <Type size={16} />
          <span className="hidden sm:inline">Edit Site Content</span>
        </Link>
      </div>

      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-[var(--error)] flex-shrink-0" />
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium">Total Users</span>
            <Users size={15} className="text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{users.length}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium">Active</span>
            <CheckCircle size={15} className="text-[var(--success)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{activeCount}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium">Trial</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{trialCount}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium">Paying</span>
            <DollarSign size={15} className="text-[var(--success)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{payingCount}</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Users table card */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] space-y-3">
          {/* Top row: plan pills + search + invite */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1 flex-wrap">
              {PLAN_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setPlanFilter(f.id); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    planFilter === f.id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-8 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                {userSearch && (
                  <button onClick={() => { setUserSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors whitespace-nowrap"
              >
                <UserPlus size={14} />
                <span className="hidden sm:inline">Invite User</span>
              </button>
            </div>
          </div>
          {/* User count */}
          <p className="text-xs text-[var(--text-secondary)]">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            {planFilter !== 'all' || userSearch ? ' matching filters' : ' total'}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {paginatedUsers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users size={32} className="mx-auto text-[var(--text-secondary)] opacity-40 mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                {userSearch || planFilter !== 'all' ? 'No users match your filters' : 'No users found'}
              </p>
              {(userSearch || planFilter !== 'all') && (
                <button
                  onClick={() => { setUserSearch(''); setPlanFilter('all'); setPage(1); }}
                  className="mt-2 text-xs text-[var(--accent)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="w-10 px-3 sm:px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-3 hidden sm:table-cell">Role</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-3 hidden md:table-cell">Joined</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-4 py-3 w-14">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => {
                  const planDisplay = getPlanDisplay(u);
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-[var(--border)] last:border-0 transition-colors ${
                        selectedIds.has(u.id) ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--navy)]/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3 sm:px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* User (name + email) */}
                      <td className="px-3 sm:px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">{u.name}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">{u.email}</p>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        <button
                          onClick={() => u.id !== currentUserId && handleToggleRole(u.id, u.role)}
                          disabled={u.id === currentUserId}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            u.role === 'admin'
                              ? 'bg-[var(--purple)]/10 text-[var(--purple)]'
                              : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                          } ${u.id !== currentUserId ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {u.role === 'admin' && <Shield size={10} />}
                          {u.role}
                        </button>
                      </td>

                      {/* Plan */}
                      <td className="px-3 sm:px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${planDisplay.className}`}>
                          {planDisplay.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.disabled ? 'bg-[var(--error)]' : 'bg-[var(--success)]'}`} />
                          <span className={u.disabled ? 'text-[var(--error)]' : 'text-[var(--success)]'}>
                            {u.disabled ? 'Disabled' : 'Active'}
                          </span>
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-xs text-[var(--text-secondary)]">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d') : '--'}
                      </td>

                      {/* Actions */}
                      <td className="px-3 sm:px-4 py-3 text-right">
                        <ActionsDropdown
                          user={u}
                          currentUserId={currentUserId}
                          onChangePlan={handleChangePlan}
                          onToggleRole={handleToggleRole}
                          onToggleDisabled={handleToggleDisabled}
                          onDelete={handleDeleteUser}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredUsers.length > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-5 bg-[var(--border)]" />
          <BulkPlanDropdown onSelect={handleBulkChangePlan} />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Deselect All
          </button>
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
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--navy)] rounded-lg transition-colors"
      >
        Change Plan
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-48 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p.slug}
              onClick={() => { onSelect(p.slug); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--navy)] transition-colors"
            >
              {p.name}{p.price > 0 ? ` (£${p.price.toLocaleString()})` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
