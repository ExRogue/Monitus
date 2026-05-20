'use client';
import { useEffect, useState } from 'react';
import { Clock, Zap, X, Shield } from 'lucide-react';
import Link from 'next/link';

interface TrialStatus {
  isTrial: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  hasActiveSubscription: boolean;
}

export default function TrialBanner() {
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/billing/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTrial({
            isTrial: data.is_trial ?? false,
            trialExpired: data.trial_expired ?? false,
            trialDaysRemaining: data.trial_days_remaining ?? 0,
            trialEndsAt: data.trial_ends_at ?? null,
            hasActiveSubscription: (data.articles_limit ?? 0) > 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!trial || dismissed) return null;

  // Trial expired and no paid subscription — show urgent banner
  if (trial.isTrial && trial.trialExpired && !trial.hasActiveSubscription) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-300 truncate">
            <span className="font-semibold">Your free trial has ended.</span>
            <span className="hidden sm:inline"> Subscribe to regain access to all platform features.</span>
          </p>
        </div>
        <Link
          href="/billing#plans"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Zap className="w-3.5 h-3.5" />
          Subscribe
        </Link>
      </div>
    );
  }

  // Active trial — show countdown
  if (trial.isTrial && !trial.trialExpired && trial.trialDaysRemaining <= 14) {
    const urgency = trial.trialDaysRemaining <= 3;
    return (
      <div className={`${urgency ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[var(--accent)]/5 border-[var(--accent)]/10'} border-b px-4 py-2 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className={`w-4 h-4 flex-shrink-0 ${urgency ? 'text-amber-400' : 'text-[var(--accent)]'}`} />
          <p className={`text-xs sm:text-sm truncate ${urgency ? 'text-amber-300' : 'text-[var(--text-secondary)]'}`}>
            <span className="font-semibold">
              {trial.trialDaysRemaining} day{trial.trialDaysRemaining !== 1 ? 's' : ''} left
            </span>
            <span className="hidden sm:inline"> on your free trial</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/billing#plans"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Choose Plan</span>
            <span className="sm:hidden">Upgrade</span>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
