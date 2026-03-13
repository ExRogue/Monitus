'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, CreditCard, FileText, Newspaper, AlertCircle, Loader } from 'lucide-react';

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
  created_at: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const authData = await authResponse.json();
        if (authData.role !== 'admin') {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // Fetch stats
        try {
          const statsResponse = await fetch('/api/admin/stats');
          if (!statsResponse.ok) throw new Error('Failed to fetch stats');
          const statsData = await statsResponse.json();
          setStats(statsData);
        } catch (err) {
          setError(prev => prev || (err instanceof Error ? err.message : 'Failed to load stats'));
        }

        // Fetch subscriptions
        try {
          const subscriptionsResponse = await fetch('/api/admin/subscriptions');
          if (!subscriptionsResponse.ok) throw new Error('Failed to fetch subscriptions');
          const subscriptionsData = await subscriptionsResponse.json();
          setSubscriptions(subscriptionsData);
        } catch (err) {
          setError(prev => prev || (err instanceof Error ? err.message : 'Failed to load subscriptions'));
        }

        // Fetch users
        try {
          const usersResponse = await fetch('/api/admin/users');
          if (!usersResponse.ok) throw new Error('Failed to fetch users');
          const usersData = await usersResponse.json();
          setUsers(usersData);
        } catch (err) {
          setError(prev => prev || (err instanceof Error ? err.message : 'Failed to load users'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Admin Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Manage users, subscriptions, and content</p>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-[var(--border)] rounded w-24"></div>
                <div className="h-5 bg-[var(--border)] rounded w-5"></div>
              </div>
              <div className="h-8 bg-[var(--border)] rounded w-16"></div>
            </div>
          ))}
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <div className="h-5 bg-[var(--border)] rounded w-32"></div>
              </div>
              <div className="space-y-0">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="px-6 py-4 border-b border-[var(--border)] last:border-0 space-y-2">
                    <div className="h-4 bg-[var(--border)] rounded w-full"></div>
                    <div className="h-3 bg-[var(--border)] rounded w-3/4"></div>
                  </div>
                ))}
              </div>
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Admin Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Manage users, subscriptions, and content</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-[var(--error)]" />
          <p className="text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users Card */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Users</span>
            <Users size={18} className="text-[var(--accent)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {stats ? stats.total_users : 'Loading...'}
          </p>
        </div>

        {/* Active Subscriptions Card */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Active Subscriptions</span>
            <CreditCard size={18} className="text-[var(--success)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {stats ? stats.active_subscriptions : 'Loading...'}
          </p>
        </div>

        {/* Total Content Card */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Content</span>
            <FileText size={18} className="text-[var(--warning)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {stats ? stats.total_content : 'Loading...'}
          </p>
        </div>

        {/* Total Articles Card */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Articles</span>
            <Newspaper size={18} className="text-[var(--purple)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {stats ? stats.total_articles : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Subscriptions Table */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Subscriptions</h3>
          </div>
          <div className="overflow-x-auto">
            {subscriptions.length === 0 ? (
              <div className="px-6 py-8 text-center text-[var(--text-secondary)]">
                No subscriptions found
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">User</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Plan</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.slice(0, 10).map((subscription) => (
                    <tr key={subscription.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--navy)] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{subscription.user_name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{subscription.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{subscription.plan_name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subscription.status === 'active'
                            ? 'bg-[var(--success)]/10 text-[var(--success)]'
                            : subscription.status === 'cancelled'
                            ? 'bg-[var(--error)]/10 text-[var(--error)]'
                            : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                        }`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {subscription.created_at ? format(new Date(subscription.created_at), 'MMM dd, yyyy') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Users size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Users</h3>
          </div>
          <div className="overflow-x-auto">
            {users.length === 0 ? (
              <div className="px-6 py-8 text-center text-[var(--text-secondary)]">
                No users found
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((user) => (
                    <tr key={user.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--navy)] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-[var(--purple)]/10 text-[var(--purple)]'
                            : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
