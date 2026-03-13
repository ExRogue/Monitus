'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Users, CreditCard, FileText, Newspaper, AlertCircle, Shield, ShieldOff, Ban, CheckCircle, Search, X } from 'lucide-react';
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
  user_name: string;
  email: string;
  plan_name: string;
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
}

const ITEMS_PER_PAGE = 10;

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      <div className="p-8 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Admin Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Manage users, subscriptions, and content</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-[var(--border)] rounded w-24"></div>
                <div className="h-5 bg-[var(--border)] rounded w-5"></div>
              </div>
              <div className="h-8 bg-[var(--border)] rounded w-16 mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={24} className="text-[var(--error)]" />
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Access Denied</h1>
          </div>
          <p className="text-[var(--text-secondary)]">You do not have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Action Message Toast */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border flex items-center gap-2 shadow-lg transition-all ${
          actionMessage.type === 'success'
            ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
            : 'bg-[var(--error)]/10 border-[var(--error)] text-[var(--error)]'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Admin Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Manage users, subscriptions, and content</p>
      </div>

      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-[var(--error)]" />
          <p className="text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Users</span>
            <Users size={18} className="text-[var(--accent)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.total_users ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Active Subscriptions</span>
            <CreditCard size={18} className="text-[var(--success)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.active_subscriptions ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Content</span>
            <FileText size={18} className="text-[var(--warning)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.total_content ?? '—'}</p>
        </div>
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Articles</span>
            <Newspaper size={18} className="text-[var(--purple)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.total_articles ?? '—'}</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Users Table */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Users</h3>
            <span className="text-sm text-[var(--text-secondary)]">({filteredUsers.length})</span>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
              className="pl-9 pr-8 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] w-64"
            />
            {userSearch && (
              <button onClick={() => { setUserSearch(''); setUsersPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {paginatedUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-[var(--text-secondary)]">
              {userSearch ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Joined</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--navy)] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-[var(--purple)]/10 text-[var(--purple)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.disabled ? 'bg-[var(--error)]/10 text-[var(--error)]' : 'bg-[var(--success)]/10 text-[var(--success)]'
                      }`}>{u.disabled ? 'Disabled' : 'Active'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {u.created_at ? format(new Date(u.created_at), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {u.id !== currentUserId && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--purple)] hover:bg-[var(--purple)]/10 transition-colors"
                          >
                            {u.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                          </button>
                          <button
                            onClick={() => handleToggleDisabled(u.id, !!u.disabled)}
                            title={u.disabled ? 'Enable user' : 'Disable user'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.disabled
                                ? 'text-[var(--text-secondary)] hover:text-[var(--success)] hover:bg-[var(--success)]/10'
                                : 'text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10'
                            }`}
                          >
                            {u.disabled ? <CheckCircle size={16} /> : <Ban size={16} />}
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
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Subscriptions</h3>
            <span className="text-sm text-[var(--text-secondary)]">({filteredSubs.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {['all', 'active', 'cancelled', 'paused'].map((f) => (
              <button
                key={f}
                onClick={() => { setSubsFilter(f); setSubsPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
            <div className="px-6 py-8 text-center text-[var(--text-secondary)]">No subscriptions found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">User</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubs.map((sub) => (
                  <tr key={sub.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--navy)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{sub.user_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{sub.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{sub.plan_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'active' ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : sub.status === 'cancelled' ? 'bg-[var(--error)]/10 text-[var(--error)]'
                        : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                      }`}>{sub.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {sub.created_at ? format(new Date(sub.created_at), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {sub.status === 'active' ? (
                          <button
                            onClick={() => handleCancelSubscription(sub.id)}
                            className="px-3 py-1.5 text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        ) : sub.status === 'cancelled' ? (
                          <button
                            onClick={() => handleReactivateSubscription(sub.id)}
                            className="px-3 py-1.5 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/10 rounded-lg transition-colors"
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
