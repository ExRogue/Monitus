'use client';
import AppShell from '@/components/layout/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) {
          router.push('/login');
        } else {
          setChecked(true);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (!checked) {
    return (
      <div className="h-screen bg-[var(--navy)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] animate-pulse" />
          <span className="text-[var(--text-secondary)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
