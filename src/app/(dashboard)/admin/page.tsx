'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Users, CreditCard, FileText, Newspaper, AlertCircle, Shield, ShieldOff, Ban, CheckCircle, Search, X, Type, Mail, Trash2, ArrowUpCircle, DollarSign, Clock } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

interface Stats {
  total_users: number;
  active_subscriptions: number;
  total_content: number;
  total_articles: number;
}

interface Subscription {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  plan_name: string;
  plan_slug: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'paused';
  created_at: string;
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
  sub_id?: string;
}

const ITEMS_PER_PAGE = 10;

const PLAN_OPTIONS = [
  { slug: 'trial', name: 'Free Trial', price: 0 },
  { slug: 'starter', name: 'Starter', price: 500 },
  { slug: 'professional', name: 'Growth', price: 1200 },
  { slug: 'enterprise', name: 'Intelligence', price: 2000 },
] as const;

const PLAN_BADGE_COLORS: Record<string, string> = {
  trial: 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]',
  starter: 'bg-[var(--accent)]/10 text-[var(--accent)]',
  professional: 'bg-[var(--success)]/10 text-[var(--success)]',
  enterprise: 'bg-[var(--purple)]/10 text-[var(--purple)]',
};

function getPlanBadgeColor(slug?: string): string {
  return PLAN_BADGE_COLORS[slug || ''] || 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]';
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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

  // Pagination
  const [usersPage, setUsersPage] = useState(1);
  const [subsPage, setSubsPage] = useState(1);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [subsFilter, setSubsFilter] = useState<string>('all');

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

      const [statsRes, subsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/users'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (subsRes.ok) setSubscriptions(await subsRes.json());
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

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as 'admin' | 'user' } : u));
      showMessage(`User role changed to ${newRole}`, 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to update role', 'error'); }
  };

  const handleToggleDisabled = async (userId: string, currentDisabled: boolean) => {
    const action = currentDisabled ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !currentDisabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, disabled: !currentDisabled } : u));
      showMessage(`User ${action}d successfully`, 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : `Failed to ${action} user`, 'error'); }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Permanently delete ${userName} and all their data? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete user');
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSubscriptions(prev => prev.filter(s => s.user_id !== userId));
      showMessage('User deleted successfully', 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to delete user', 'error'); }
  };

  const handleChangePlan = async (userId: string, planSlug: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const planOption = PLAN_OPTIONS.find(p => p.slug === planSlug);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_slug: planSlug, plan_name: planOption?.name || planSlug } : u));
      showMessage(`Plan changed to ${planOption?.name || planSlug}`, 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to change plan', 'error'); }
  };

  const handleChangeSubPlan = async (subId: string, planSlug: string) => {
    const planOption = PLAN_OPTIONS.find(p => p.slug === planSlug);
    const planId = `plan-${planSlug === 'trial' ? 'trial' : planSlug}`;
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, plan_slug: planSlug, plan_name: planOption?.name || planSlug, plan_id: planId } : s));
      showMessage(`Subscription plan changed to ${planOption?.name || planSlug}`, 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to change plan', 'error'); }
  };

  const handleCancelSubscription = async (subId: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: 'cancelled' } : s));
      showMessage('Subscription cancelled', 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to cancel', 'error'); }
  };

  const handleReactivateSubscription = async (subId: string) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: 'active' } : s));
      showMessage('Subscription reactivated', 'success');
    } catch (err) { showMessage(err instanceof Error ? err.message : 'Failed to reactivate', 'error'); }
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

  // Compute revenue and trial count
  const computeMRR = () => {
    let mrr = 0;
    subscriptions.forEach(s => {
      if (s.status === 'active') {
        const plan = PLAN_OPTIONS.find(p => p.slug === s.plan_slug || p.name === s.plan_name);
        if (plan) mrr += plan.price;
      }
    });
    return mrr;
  };

  const trialUserCount = subscriptions.filter(s => s.status === 'active' && (s.plan_slug === 'trial' || s.plan_name === 'Free Trial')).length;

  // Filter & paginate users
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const totalUserPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE);

  // Filter & paginate subscriptions
  const filteredSubs = subsFilter === 'all' ? subscriptions : subscriptions.filter(s => s.status === subsFilter);
  const totalSubPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE);
  const paginatedSubs = filteredSubs.slice((subsPage - 1) * ITEMS_PER_PAGE, subsPage * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="mb-6">
          <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Manage users, subscriptions, and content</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 sm:h-4 bg-[var(--border)] rounded w-20 sm:w-24"></div>
                <div className="h-4 sm:h-5 bg-[var(--border)] rounded w-4 sm:w-5"></div>
              </div>
              <div className="h-6 sm:h-8 bg-[var(--border)] rounded w-12 sm:w-16 mt-2"></div>
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

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Action Message Toast */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border flex items-center gap-2 shadow-lg transition-all text-xs sm:text-sm ${
          actionMessage.type === 'success'
            ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
            : 'bg-[var(--error)]/10 border-[var(--error)] text-[var(--error)]'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-[var(--accent)]" />
                <h3 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)]">Invite User</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                    className="w-full px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">Plan</label>
                  <select
                    value={invitePlan}
                    onChange={(e) => setInvitePlan(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
      <div className="mb-6">
        <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">Admin Dashboard</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Manage users, subscriptions, and content</p>
      </div>

      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)] rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <AlertCircle size={18} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--error)] flex-shrink-0" />
          <p className="text-xs sm:text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Total Users</span>
            <Users size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)]" />
          </div>
          <p className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">{stats?.total_users ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Subscriptions</span>
            <CreditCard size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)]" />
          </div>
          <p className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">{stats?.active_subscriptions ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Content</span>
            <FileText size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--warning)]" />
          </div>
          <p className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">{stats?.total_content ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Articles</span>
            <Newspaper size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--purple)]" />
          </div>
          <p className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">{stats?.total_articles ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Revenue (MRR)</span>
            <DollarSign size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)]" />
          </div>
          <p className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">{`£${computeMRR().toLocaleString()}`}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Trial Users</span>
            <Clock size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--warning)]" />
          </div>
          <p className="text-lg sm:text-3xl font-bold text-[var(--text-primary)]">{trialUserCount}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
        <h3 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)] mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/content"
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors text-sm font-medium"
          >
            <Type size={16} />
            Edit Site Content
          </Link>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Users Table */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)]" />
            <h3 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)]">Users</h3>
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">({filteredUsers.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                className="w-full pl-9 pr-8 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              />
              {userSearch && (
                <button onClick={() => { setUserSearch(''); setUsersPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors whitespace-nowrap"
            >
              <Mail size={14} />
              <span className="hidden sm:inline">Invite User</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {paginatedUsers.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center text-xs sm:text-sm text-[var(--text-secondary)]">
              {userSearch ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Name</th>
                  <th className="hidden sm:table-cell text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Email</th>
                  <th className="text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Role</th>
                  <th className="text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Plan</th>
                  <th className="hidden sm:table-cell text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Status</th>
                  <th className="hidden md:table-cell text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Joined</th>
                  <th className="text-right text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--navy)] transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-[var(--text-primary)]">{u.name}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium w-fit ${
                        u.role === 'admin' ? 'bg-[var(--purple)]/10 text-[var(--purple)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <select
                        value={u.plan_slug || 'trial'}
                        onChange={(e) => handleChangePlan(u.id, e.target.value)}
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${getPlanBadgeColor(u.plan_slug)}`}
                        style={{ WebkitAppearance: 'none', backgroundImage: 'none', paddingRight: '8px' }}
                      >
                        {PLAN_OPTIONS.map(p => (
                          <option key={p.slug} value={p.slug}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium ${
                        u.disabled ? 'bg-[var(--error)]/10 text-[var(--error)]' : 'bg-[var(--success)]/10 text-[var(--success)]'
                      }`}>{u.disabled ? 'Disabled' : 'Active'}</span>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-[var(--text-secondary)]">
                      {u.created_at ? format(new Date(u.created_at), 'MMM dd') : '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {u.id !== currentUserId && (
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--purple)] hover:bg-[var(--purple)]/10 transition-colors"
                          >
                            {u.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                          </button>
                          <button
                            onClick={() => handleToggleDisabled(u.id, !!u.disabled)}
                            title={u.disabled ? 'Enable user' : 'Disable user'}
                            className={`p-1 rounded-lg transition-colors ${
                              u.disabled
                                ? 'text-[var(--text-secondary)] hover:text-[var(--success)] hover:bg-[var(--success)]/10'
                                : 'text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10'
                            }`}
                          >
                            {u.disabled ? <CheckCircle size={14} /> : <Ban size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete user"
                            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          currentPage={usersPage}
          totalPages={totalUserPages}
          totalItems={filteredUsers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setUsersPage}
        />
      </div>

      {/* Subscriptions Table */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)]" />
            <h3 className="text-sm sm:text-lg font-semibold text-[var(--text-primary)]">Subscriptions</h3>
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">({filteredSubs.length})</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {['all', 'active', 'cancelled', 'paused'].map((f) => (
              <button
                key={f}
                onClick={() => { setSubsFilter(f); setSubsPage(1); }}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
                  subsFilter === f
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy)]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {paginatedSubs.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center text-xs sm:text-sm text-[var(--text-secondary)]">No subscriptions found</div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">User</th>
                  <th className="text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Plan</th>
                  <th className="hidden sm:table-cell text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Status</th>
                  <th className="hidden md:table-cell text-left text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Date</th>
                  <th className="text-right text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubs.map((sub) => (
                  <tr key={sub.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--navy)] transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{sub.user_name}</p>
                        <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">{sub.email}</p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={sub.plan_slug || 'trial'}
                          onChange={(e) => handleChangeSubPlan(sub.id, e.target.value)}
                          className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${getPlanBadgeColor(sub.plan_slug)}`}
                          style={{ WebkitAppearance: 'none', backgroundImage: 'none', paddingRight: '8px' }}
                        >
                          {PLAN_OPTIONS.map(p => (
                            <option key={p.slug} value={p.slug}>{p.name} {p.price > 0 ? `(£${p.price.toLocaleString()})` : ''}</option>
                          ))}
                        </select>
                        <ArrowUpCircle size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium w-fit ${
                        sub.status === 'active' ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : sub.status === 'cancelled' ? 'bg-[var(--error)]/10 text-[var(--error)]'
                        : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                      }`}>{sub.status}</span>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-[var(--text-secondary)]">
                      {sub.created_at ? format(new Date(sub.created_at), 'MMM dd') : '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        {sub.status === 'active' ? (
                          <button
                            onClick={() => handleCancelSubscription(sub.id)}
                            className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        ) : sub.status === 'cancelled' ? (
                          <button
                            onClick={() => handleReactivateSubscription(sub.id)}
                            className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/10 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Reactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          currentPage={subsPage}
          totalPages={totalSubPages}
          totalItems={filteredSubs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setSubsPage}
        />
      </div>
    </div>
  );
}
