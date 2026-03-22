'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Radar, Target, FileText, Building2 } from 'lucide-react';

interface MissedData {
  newSignals: number;
  highUrgency: number;
  draftsReady: number;
  competitorMentions: { name: string; count: number } | null;
}

const LAST_LOGIN_KEY = 'monitus_last_login';
const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

export default function WhatYouMissed() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<MissedData | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    const now = Date.now();

    // Always update last login for next time
    localStorage.setItem(LAST_LOGIN_KEY, String(now));

    // Only show if 48+ hours since last visit
    if (!lastLogin || now - Number(lastLogin) < TWO_DAYS_MS) {
      return;
    }

    // Fetch counts since last login
    const since = new Date(Number(lastLogin)).toISOString();

    Promise.allSettled([
      fetch(`/api/news?limit=200`).then(r => r.json()),
      fetch('/api/opportunities').then(r => r.json()),
      fetch('/api/generate?limit=200').then(r => r.json()),
    ]).then(([newsRes, oppsRes, contentRes]) => {
      const lastLoginDate = new Date(Number(lastLogin));
      let newSignals = 0;
      let highUrgency = 0;
      let draftsReady = 0;
      let competitorMentions: MissedData['competitorMentions'] = null;

      if (newsRes.status === 'fulfilled') {
        const articles = Array.isArray(newsRes.value.articles) ? newsRes.value.articles : [];
        newSignals = articles.filter((a: any) => new Date(a.created_at || a.published_at) > lastLoginDate).length;
      }

      if (oppsRes.status === 'fulfilled') {
        const opps = Array.isArray(oppsRes.value.opportunities) ? oppsRes.value.opportunities : [];
        const newOpps = opps.filter((o: any) => new Date(o.created_at) > lastLoginDate);
        highUrgency = newOpps.filter((o: any) => (o.opportunity_score ?? o.score ?? 0) >= 70).length;
      }

      if (contentRes.status === 'fulfilled') {
        const content = Array.isArray(contentRes.value.content) ? contentRes.value.content : [];
        draftsReady = content.filter((c: any) =>
          c.status === 'draft' && new Date(c.created_at) > lastLoginDate
        ).length;
      }

      // Only show if there's actually something new
      const hasData = newSignals > 0 || highUrgency > 0 || draftsReady > 0;
      if (!hasData) return;

      setData({ newSignals, highUrgency, draftsReady, competitorMentions });
      setVisible(true);
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    });
  }, []);

  if (!visible || !data) return null;

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: animateIn ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        backdropFilter: animateIn ? 'blur(4px)' : 'blur(0px)',
        transition: 'all 0.3s ease',
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          opacity: animateIn ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="relative w-full max-w-md bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Accent gradient bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--accent)] via-purple-500 to-cyan-400" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 pt-5">
          <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-wider mb-1">
            While you were away...
          </p>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading mb-1">
            Your AI team has been working.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5">
            Here&apos;s what happened since your last visit.
          </p>

          <div className="space-y-3">
            {data.newSignals > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy)]/60 border border-cyan-500/10">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Radar className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm text-[var(--text-primary)]">
                  <strong>{data.newSignals}</strong> new signal{data.newSignals !== 1 ? 's' : ''} matched your narrative
                </span>
              </div>
            )}

            {data.highUrgency > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy)]/60 border border-amber-500/10">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-sm text-[var(--text-primary)]">
                  <strong>{data.highUrgency}</strong> high-urgency opportunit{data.highUrgency !== 1 ? 'ies' : 'y'} flagged
                </span>
              </div>
            )}

            {data.draftsReady > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy)]/60 border border-purple-500/10">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm text-[var(--text-primary)]">
                  <strong>{data.draftsReady}</strong> draft{data.draftsReady !== 1 ? 's' : ''} ready for review
                </span>
              </div>
            )}

            {data.competitorMentions && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy)]/60 border border-rose-500/10">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-sm text-[var(--text-primary)]">
                  {data.competitorMentions.name} mentioned in <strong>{data.competitorMentions.count}</strong> article{data.competitorMentions.count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <Link
              href="/signals"
              onClick={handleDismiss}
              className="flex-1 text-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 text-white text-sm font-semibold shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 transition-all hover:scale-[1.02]"
            >
              See what&apos;s new &rarr;
            </Link>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
