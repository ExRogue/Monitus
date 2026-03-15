'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Radar,
  FileText,
  Settings,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  Menu,
  X,
  BookOpen,
  Send,
  BarChart3,
  Target,
  FileStack,
  PenTool,
  Brain,
  Swords,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navSections = [
  {
    label: 'PLATFORM',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/messaging-bible', label: 'Narrative', icon: BookOpen },
      { href: '/news', label: 'Radar', icon: Radar },
      { href: '/pipeline', label: 'Draft', icon: PenTool },
      { href: '/distribute', label: 'Publish', icon: Send },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
      { href: '/create', label: 'Create', icon: Lightbulb },
      { href: '/reports', label: 'Intelligence', icon: Brain },
      { href: '/competitive', label: 'Rivals', icon: Swords },
      { href: '/briefing', label: 'Briefing', icon: FileStack },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/billing', label: 'Billing', icon: CreditCard },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const navItems = navSections.flatMap((s) => s.items);

export default function Sidebar({ open = true, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => { if (data.user?.role) setUserRole(data.user.role); })
      .catch(() => {});

    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const allSections = userRole === 'admin'
    ? navSections.map((s) =>
        s.label === 'ACCOUNT'
          ? { ...s, items: [...s.items, { href: '/admin', label: 'Admin', icon: Shield }] }
          : s
      )
    : navSections;

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile && onClose) {
      onClose();
    }
  }, [pathname, isMobile, onClose]);

  // Hide sidebar on mobile if not open
  if (isMobile && !open) {
    return null;
  }

  // Mobile overlay
  if (isMobile && open) {
    return (
      <>
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
        <aside className="fixed left-0 top-0 h-screen z-40 w-60 bg-[var(--navy-light)] border-r border-[var(--border)] flex flex-col">
          {/* Close button */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Monitus
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[var(--navy-lighter)] rounded transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
            {allSections.map((section) => (
              <div key={section.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-l-[3px] border-l-[var(--accent)] border-y border-r border-y-[var(--accent)]/20 border-r-[var(--accent)]/20'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] hover:translate-x-0.5'
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-2 border-t border-[var(--border)] space-y-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside
      className={clsx(
        'hidden md:flex h-screen bg-[var(--navy-light)] border-r border-[var(--border)] flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Monitus
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
        {allSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase">
                {section.label}
              </div>
            )}
            {collapsed && <div className="mx-2 mb-1.5 border-t border-[var(--border)]" />}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-l-[3px] border-l-[var(--accent)] border-y border-r border-y-[var(--accent)]/20 border-r-[var(--accent)]/20'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] hover:translate-x-0.5'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-[var(--border)] space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] w-full transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && 'Collapse'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </aside>
  );
}
