'use client';
import AppShell from '@/components/layout/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import WhatYouMissed from '@/components/WhatYouMissed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <WhatYouMissed />
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
