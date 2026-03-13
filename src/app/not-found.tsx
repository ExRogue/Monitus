import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--navy)] flex flex-col">
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Telum</span>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--purple)]/20 border border-[var(--border)] flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] bg-clip-text text-transparent">
              404
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Page not found</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Back to home
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-6">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Telum. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
