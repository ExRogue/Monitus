'use client';
/**
 * Onboarding — the missing post-register landing page.
 *
 * Flow:
 *   1. User enters their company website URL
 *   2. Frontend POSTs /api/onboarding/quick-start (SSE)
 *   3. Streams the live progress: Scanning → Extracting → Building narrative
 *      → Writing → Identifying pillars → Done
 *   4. Fires /api/onboarding/bootstrap (background) which runs the full
 *      Market Analyst pipeline (enrich → score 30d → cluster → interpret →
 *      first brief). The Market Brief page picks up the bootstrap-status
 *      polling from there.
 *   5. Redirects to /market-brief.
 *
 * Previously this page didn't exist — register success went to /dashboard
 * which redirected to /market-brief which sat at "pending" forever because
 * quick-start was never called.
 */
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Globe, Check, AlertCircle, Sparkles } from 'lucide-react';

type Step = {
  key: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
};

const INITIAL_STEPS: Step[] = [
  { key: 'scanning', label: 'Scanning your website', status: 'pending' },
  { key: 'extracting', label: 'Extracting your positioning', status: 'pending' },
  { key: 'building_narrative', label: 'Building your draft narrative', status: 'pending' },
  { key: 'generating', label: 'Writing your narrative document', status: 'pending' },
  { key: 'extracting_fields', label: 'Identifying pillars and buyer profiles', status: 'pending' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{
    companyName?: string;
    icpCount?: number;
    pillarCount?: number;
    elevatorPitch?: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // If the user already has a profile, skip straight to Market Brief
  useEffect(() => {
    fetch('/api/company-profile')
      .then(r => r.json())
      .then(data => {
        if (data?.profile?.oneLineDescription && !data.preview) {
          router.replace('/market-brief');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || running) return;

    setError(null);
    setRunning(true);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' as const })));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/onboarding/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Onboarding failed (HTTP ${res.status})`);
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are 'data: {...}\n\n'
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const line = evt.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          const payload = line.slice(6);
          try {
            const data = JSON.parse(payload);
            handleEvent(data);
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Onboarding error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setRunning(false);
    }
  };

  const handleEvent = (data: any) => {
    if (data.error) {
      setError(data.error);
      setRunning(false);
      return;
    }

    if (data.done) {
      setSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })));
      setDone(true);
      setCompletionSummary({
        companyName: data.companyName,
        icpCount: data.icpCount,
        pillarCount: data.pillarCount,
        elevatorPitch: data.elevatorPitch,
      });

      // Fire bootstrap in the background — runs the Market Analyst pipeline
      // (cluster + interpret + first brief). Don't await; Market Brief
      // polls bootstrap-status for progress.
      fetch('/api/onboarding/bootstrap', { method: 'POST' }).catch(() => {});

      // Brief pause so the user sees the completion, then redirect
      setTimeout(() => router.push('/market-brief'), 1800);
      return;
    }

    if (typeof data.step === 'string') {
      const stepKey = data.step.replace(/_done$/, '');
      const isDone = data.step.endsWith('_done');

      setSteps(prev => {
        const idx = prev.findIndex(s => s.key === stepKey);
        if (idx < 0) return prev;
        const next = [...prev];
        // Mark previous as done
        for (let i = 0; i < idx; i++) {
          if (next[i].status !== 'done') next[i] = { ...next[i], status: 'done' };
        }
        next[idx] = { ...next[idx], status: isDone ? 'done' : 'active' };
        return next;
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent)]">
            ONBOARDING
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3 leading-tight">
          {done ? `Welcome, ${completionSummary?.companyName || 'team'}.` : 'Let\'s set up your Market Brief.'}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          {done
            ? "Your narrative is saved. We're now scanning the last 30 days of market coverage and building your first weekly Market Brief in the background."
            : 'Paste your company website. We\'ll scan it, extract your positioning, and build a draft narrative — typically 30-45 seconds. You can refine everything afterwards.'}
        </p>
      </header>

      {!running && !done && (
        <form onSubmit={handleStart} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
            Company website
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/50" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.your-company.com"
                required
                autoFocus
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-[var(--navy)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-md bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Start →
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)]/60 mt-3">
            We only read what's publicly accessible. Nothing is stored beyond what's needed to draft your narrative.
          </p>
        </form>
      )}

      {(running || done) && (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                {step.status === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[var(--text-secondary)]/30 flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  step.status === 'done' ? 'text-[var(--text-secondary)]' :
                  step.status === 'active' ? 'text-[var(--text-primary)] font-medium' :
                  'text-[var(--text-secondary)]/50'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {done && completionSummary && (
            <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
              {completionSummary.elevatorPitch && (
                <div>
                  <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-1">
                    Your elevator pitch
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    "{completionSummary.elevatorPitch}"
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                {completionSummary.pillarCount ? (
                  <span><strong className="text-[var(--text-primary)]">{completionSummary.pillarCount}</strong> messaging pillars</span>
                ) : null}
                {completionSummary.icpCount ? (
                  <span><strong className="text-[var(--text-primary)]">{completionSummary.icpCount}</strong> buyer profiles</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--accent)] pt-2">
                <Sparkles className="w-3.5 h-3.5" />
                Building your first Market Brief — redirecting...
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          <div className="font-medium mb-1">Something went wrong</div>
          <p className="text-red-400/80">{error}</p>
          <button
            onClick={() => { setError(null); setRunning(false); setSteps(INITIAL_STEPS); }}
            className="mt-3 text-xs font-medium text-[var(--text-primary)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
