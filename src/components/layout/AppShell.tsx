'use client';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TrialBanner from './TrialBanner';
import { useState } from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--navy)]">
          {children}
        </main>
      </div>
    </div>
  );
}
