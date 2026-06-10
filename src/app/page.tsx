'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  Target,
  Eye,
  Lightbulb,
  PenTool,
  FileText,
  RefreshCw,
  Users,
  TrendingUp,
  Shield,
  MessageSquare,
  BarChart3,
  Check,
  Menu,
  X,
  Radio,
  Compass,
  Layout,
  Loader2,
} from 'lucide-react';

// Cohesive brand spectrum used across the page — teal family with one
// violet anchor reserved for the strategic foundation step.
const PALETTE = {
  tealLight: '#7DC4BD',
  teal: '#4A9E96',
  green: '#3AAF7C',
  violet: '#8B5CF6',
  slate: '#6B7D92',
};

// Counts up from 0 when scrolled into view. Respects reduced motion by
// jumping straight to the target.
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to);
      return;
    }
    let raf = 0;
    let started = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const t0 = performance.now();
          const dur = 1200;
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

// Illustrative signal feed for the hero product scene. Display copy only —
// not real data; the caption below the scene says so.
const SCENE_SIGNALS = [
  { source: 'Regulator', headline: 'Consultation opens on new delegated authority reporting rules', score: 92, color: '#3AAF7C' },
  { source: 'Trade press', headline: 'Carrier group signals retreat from cat-exposed property lines', score: 81, color: '#7DC4BD' },
  { source: 'Newswire', headline: 'Competitor raises Series B to expand into the London Market', score: 76, color: '#7DC4BD' },
  { source: 'Analyst', headline: 'Rising demand flagged for parametric covers in specialty lines', score: 64, color: '#6B7D92' },
];

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Inline signup state — surfaces the register flow directly on the hero so
  // visitors don't have to bounce through a separate /register page first.
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupConsent, setSignupConsent] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleHeroSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupLoading) return;
    if (!signupConsent) {
      setSignupError('Please accept the terms and privacy policy to continue.');
      return;
    }
    setSignupError(null);
    setSignupLoading(true);
    try {
      // Step 1: register user
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim().toLowerCase(),
          password: signupPassword,
          gdpr_consent: signupConsent,
          gdpr_consent_at: new Date().toISOString(),
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setSignupError(regData?.error || 'Registration failed. Please try again.');
        setSignupLoading(false);
        return;
      }

      // Step 2: create the company. companyType defaults to 'insurtech' —
      // matches the hero's stated audience; users can refine on /company-profile.
      await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupCompany.trim(),
          type: 'insurtech',
          brand_voice: 'professional',
          niche: 'insurance technology',
        }),
      }).catch(() => {
        // Non-fatal — onboarding will let them set company details
      });

      // Route into the onboarding flow
      router.push(regData.requiresVerification ? '/verify-email' : '/onboarding');
    } catch {
      setSignupError('Network error. Please try again.');
      setSignupLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-section').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const inputClass =
    'w-full bg-[#111927]/80 border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[#8494A7]/40 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[#4A9E96]/40 transition-colors';

  return (
    <div className="min-h-screen bg-[var(--navy)]">
      {/* Nav */}
      <nav className="border-b border-[#25334A]/70 bg-[#111927]/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#3AAF7C] flex items-center justify-center shadow-[0_0_18px_-4px_rgba(74,158,150,0.6)]">
              <Zap className="text-white" size={17} />
            </div>
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-heading">Monitus</span>
          </div>
          <div className="hidden sm:flex items-center gap-7 text-sm text-[var(--text-secondary)]">
            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">How it works</a>
            <Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">About</Link>
            <Link href="/blog" className="hover:text-[var(--text-primary)] transition-colors">Blog</Link>
            <Link href="/contact" className="hover:text-[var(--text-primary)] transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-block text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_20px_-6px_rgba(74,158,150,0.7)]"
            >
              Define your Narrative
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[var(--border)] bg-[var(--navy)] px-6 py-4 space-y-3">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1">How it works</a>
            <Link href="/pricing" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1">Pricing</Link>
            <Link href="/about" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1">About</Link>
            <Link href="/blog" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1">Blog</Link>
            <Link href="/contact" className="block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1">Contact</Link>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <Link href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1">Sign in</Link>
              <Link href="/register" className="text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-center transition-colors">Define your Narrative</Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO — split layout: copy left, signup card right */}
      <section className="relative overflow-hidden">
        <div className="hero-radial absolute inset-0 pointer-events-none" />
        <div className="hero-grid-fade absolute inset-0 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 relative z-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-14 items-center">
            {/* Left: narrative */}
            <div className="text-center lg:text-left">
              <div className="hero-rise shimmer inline-flex items-center gap-2 bg-[#172032]/80 border border-[#4A9E96]/25 rounded-full px-4 py-1.5 mb-7">
                <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse" />
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Built for insurtechs selling into insurance
                </span>
              </div>

              <h1 className="hero-rise text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-[var(--text-primary)] leading-[1.08] mb-6" style={{ animationDelay: '0.08s' }}>
                The AI Growth Manager{' '}
                <span className="bg-gradient-to-r from-[#7DC4BD] via-[var(--accent)] to-[#3AAF7C] bg-clip-text text-transparent">
                  for Insurtechs
                </span>
              </h1>

              <p className="hero-rise text-lg sm:text-xl text-[var(--text-primary)] font-semibold mb-4" style={{ animationDelay: '0.16s' }}>
                Turn insurance market signals into credibility and pipeline.
              </p>

              <p className="hero-rise text-base text-[var(--text-secondary)] mb-3 leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ animationDelay: '0.24s' }}>
                Monitus helps insurtechs selling into insurance define their positioning, understand what matters in the market, and act on it with credible, buyer-relevant output.
              </p>

              <p className="hero-rise text-sm text-[#8494A7]/80 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ animationDelay: '0.3s' }}>
                It does the market reading, filtering, prioritising, and draft preparation in the background so your team can focus on decisions, not manual work.
              </p>

              {/* 3 product pillars */}
              <div className="hero-rise space-y-3 max-w-md mx-auto lg:mx-0 mb-8" style={{ animationDelay: '0.38s' }}>
                {[
                  { icon: Eye, label: 'Market View maps every conversation happening in your market', color: PALETTE.tealLight },
                  { icon: Lightbulb, label: 'Market Brief surfaces what to act on this week', color: PALETTE.teal },
                  { icon: PenTool, label: 'Content prepares drafts in your voice, ready to publish', color: PALETTE.green },
                ].map((pill) => {
                  const Icon = pill.icon;
                  return (
                    <div key={pill.label} className="flex items-start gap-3 text-left">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${pill.color}14`, boxShadow: `inset 0 0 0 1px ${pill.color}30` }}
                      >
                        <Icon size={14} style={{ color: pill.color }} />
                      </div>
                      <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{pill.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Secondary CTA — read-only demo for visitors who want to see the
                  product before creating an account. Middleware lets
                  /market-brief?companyId=demo through anonymously. */}
              <Link
                href="/market-brief?companyId=demo"
                className="hero-rise inline-flex items-center gap-1.5 text-sm font-medium text-[#7DC4BD] hover:text-[var(--text-primary)] transition-colors"
                style={{ animationDelay: '0.46s' }}
              >
                Or explore a sample Market Brief first
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Right: inline signup — visitors register directly from the hero.
                companyType defaults to 'insurtech' (matches the hero target);
                users refine other details inside Company Profile during onboarding. */}
            <form
              onSubmit={handleHeroSignup}
              className="hero-rise signup-card text-left border border-[var(--border)] rounded-2xl p-6 sm:p-7 relative overflow-hidden"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#7DC4BD] via-[var(--accent)] to-transparent" />
              <div className="eyebrow mb-5">
                Get started — free narrative, no card
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Your name</label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Jane Smith"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="signup-company" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Company name</label>
                  <input
                    id="signup-company"
                    type="text"
                    required
                    autoComplete="organization"
                    value={signupCompany}
                    onChange={(e) => setSignupCompany(e.target.value)}
                    placeholder="Your insurtech"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="signup-email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Work email</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="jane@your-company.com"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="signup-password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupConsent}
                  onChange={(e) => setSignupConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
                />
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#7DC4BD] hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#7DC4BD] hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              {signupError && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {signupError}
                </div>
              )}

              <button
                type="submit"
                disabled={signupLoading}
                className="cta-glow w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-7 py-3 rounded-xl transition-all text-sm"
              >
                {signupLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Setting up your workspace...
                  </>
                ) : (
                  <>
                    Define your Narrative — free <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-xs text-[#8494A7]/70 text-center mt-3">
                Already have an account? <Link href="/login" className="text-[#7DC4BD] hover:underline">Sign in</Link>
              </p>
            </form>
          </div>

          {/* Stat strip — numbers drawn from claims already made on this page
              (60+ sources, five surfaces, 7-day lookback). */}
          <div className="hero-rise mt-16 pt-8 border-t border-[#25334A]/60 grid grid-cols-1 sm:grid-cols-3 gap-8" style={{ animationDelay: '0.55s' }}>
            {[
              { n: 60, suffix: '+', label: 'insurance-specific sources monitored continuously' },
              { n: 5, suffix: '', label: 'connected product surfaces working off one intelligence' },
              { n: 7, suffix: '-day', label: 'market lookback the moment you define your Narrative' },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-3xl font-bold font-heading text-[var(--text-primary)] mb-1.5">
                  <CountUp to={stat.n} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[220px] mx-auto sm:mx-0">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SCENE — a Market Brief assembling itself. Pure mockup,
          labelled illustrative below the window. */}
      <section className="fade-section pb-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7),0_0_80px_-40px_rgba(74,158,150,0.35)]">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-[#25334A]/70 bg-[#111927]/60">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D05050]/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4943A]/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3AAF7C]/50" />
              <span className="ml-3 font-mono text-[11px] text-[#8494A7]/80 tracking-wide">monitus — market brief · this week</span>
            </div>

            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              {/* Left: incoming signals being scored */}
              <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#25334A]/70">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse" />
                  <span className="eyebrow">Incoming signals</span>
                </div>
                <div className="stagger space-y-3">
                  {SCENE_SIGNALS.map((signal, i) => (
                    <div key={signal.headline} className="flex items-center gap-4 p-3.5 bg-[#111927]/50 rounded-xl border border-[#25334A]/50">
                      <span className="hidden sm:block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--navy)] border border-[var(--border)] rounded px-2 py-1 flex-shrink-0 w-24 text-center">
                        {signal.source}
                      </span>
                      <p className="text-sm text-[#E1E7EF]/90 flex-1 leading-snug">{signal.headline}</p>
                      <div className="flex-shrink-0 w-24">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[9px] font-mono uppercase text-[#8494A7]/70">Relevance</span>
                          <span className="text-xs font-mono font-bold" style={{ color: signal.color }}>{signal.score}</span>
                        </div>
                        <div className="h-1 rounded-full bg-[var(--navy)] overflow-hidden">
                          <div
                            className="score-fill h-full rounded-full"
                            style={{ width: `${signal.score}%`, background: signal.color, animationDelay: `${0.4 + i * 0.18}s` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs font-mono text-[#8494A7]/70">4 of 31 signals cleared your relevance threshold this week</p>
              </div>

              {/* Right: the priority and the draft it produced */}
              <div className="stagger p-6 sm:p-8">
                <div className="rounded-xl border border-[#4A9E96]/30 bg-gradient-to-br from-[#4A9E96]/10 to-transparent p-5 mb-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="eyebrow">This week&apos;s priority</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4943A] bg-[#D4943A]/10 border border-[#D4943A]/30 rounded-full px-2.5 py-0.5 flex-shrink-0">Act now</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-3.5">
                    Respond to the delegated authority consultation before the window closes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-medium text-[#7DC4BD] bg-[#4A9E96]/10 border border-[#4A9E96]/25 rounded-full px-2.5 py-1">For: CUOs</span>
                    <span className="text-[10px] font-medium text-[#7DC4BD] bg-[#4A9E96]/10 border border-[#4A9E96]/25 rounded-full px-2.5 py-1">Angle: compliance burden</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[#111927]/60 p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="eyebrow">Draft ready</span>
                    <span className="text-[10px] font-mono text-[#8494A7]/70 flex-shrink-0">LinkedIn · your voice</span>
                  </div>
                  <div className="space-y-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    <p>The new reporting rules will hit delegated authority books hardest.</p>
                    <p>
                      Three things MGAs should prepare before the consultation closes
                      <span className="caret text-[#7DC4BD]">▍</span>
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-white bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] rounded-lg px-3.5 py-2">
                      Review draft <ArrowRight size={12} />
                    </span>
                    <span className="text-[11px] text-[#8494A7]/70">2 more in your queue</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-[#8494A7]/60 mt-4">
            Illustrative product view — your brief is built from your narrative and your market&apos;s signals.
          </p>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 2: THE PROBLEM — editorial split layout */}
      <section className="fade-section py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16">
            <div>
              <span className="eyebrow block mb-4">The problem</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-5 leading-snug">
                Most insurtechs do not have a growth intelligence function
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
                They have a good product. They know the market. But they do not consistently show up like a company buyers should take seriously.
              </p>
              <div className="border-l-2 border-amber-400/60 pl-5">
                <p className="text-[var(--text-primary)] font-medium leading-relaxed">
                  Insurance buyers notice this quickly. They can tell the difference between real expertise and generic insurtech marketing.
                </p>
              </div>
            </div>

            <div className="lift-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 relative overflow-hidden self-start">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-3 mb-5 relative">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/25 flex items-center justify-center">
                  <Target size={16} className="text-amber-400" />
                </div>
                <span className="text-xs font-semibold tracking-wide uppercase text-amber-400/90">Sound familiar?</span>
              </div>
              <div className="relative">
                {[
                  'The founder posts occasionally, then disappears',
                  'The company page says very little of value',
                  'Marketing output feels generic or disconnected from commercial reality',
                  'Competitors look sharper simply because they are more visible',
                  'Strong products lose ground to stronger market presence',
                ].map((item, i, arr) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-[#25334A]/60' : ''}`}
                  >
                    <span className="font-mono text-xs text-amber-400/60 font-bold mt-0.5 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 3: WHAT MONITUS DOES */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#172032]/30 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="max-w-2xl mb-12">
            <span className="eyebrow block mb-4">What it does</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-4 leading-tight">
              Know what matters, decide what to do, and act on it
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Built for insurtechs selling into complex insurance buying environments
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-1">
              {[
                'Define a sharper market position',
                'Understand what is changing in your market',
                'See who those developments matter to',
                'Decide what is worth acting on',
                'Generate credible output quickly',
                'Stay consistent without becoming a full-time content machine',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 py-3.5 border-b border-[#25334A]/50 group">
                  <span className="font-mono text-xs text-[#7DC4BD]/60 font-bold mt-1 flex-shrink-0 group-hover:text-[#7DC4BD] transition-colors">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[15px] text-[#E1E7EF]/90 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>

            <div className="lift-card bg-[var(--navy-light)] border border-[#4A9E96]/25 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-transparent" />
              <p className="text-[var(--text-primary)] font-semibold text-lg mb-6">
                When you open Monitus, the work should already be done.
              </p>
              <div className="space-y-3">
                {[
                  'Relevant developments already filtered',
                  'Themes already identified',
                  'Competitor movement already interpreted',
                  'Opportunities already prioritised',
                  'Stakeholder angles already selected',
                  'Drafts already prepared',
                  'Recommendations already made actionable',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4A9E96]/12 ring-1 ring-[#4A9E96]/30 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-[#7DC4BD]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 4: HOW IT WORKS — vertical timeline */}
      <section id="how-it-works" className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="eyebrow block mb-4">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-4 leading-tight">
              One connected system, not a stack of disconnected tools
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Five product surfaces working off the same intelligence. Each one feeds the next.
            </p>
          </div>

          <div className="relative">
            {/* Timeline rail */}
            <div className="hidden sm:block absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-[var(--border)] via-[var(--border)] to-transparent" />

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  icon: Compass,
                  name: 'Company Profile',
                  color: PALETTE.violet,
                  description: 'Define how your company should be positioned: core narrative, ICP, stakeholder map, competitor list, voice. This is the strategic foundation everything else runs against.',
                },
                {
                  num: '02',
                  icon: Eye,
                  name: 'Market View',
                  color: PALETTE.tealLight,
                  description: 'Every conversation happening in your market, mapped and scored against your profile. Regulatory shifts, competitor moves, analyst takes, customer pain points — clustered into stories you can browse.',
                },
                {
                  num: '03',
                  icon: Lightbulb,
                  name: 'Market Brief',
                  color: PALETTE.teal,
                  description: 'The weekly synthesis. What changed, what matters, and what to do about it. Recommended actions per conversation, ranked by relevance and timing.',
                },
                {
                  num: '04',
                  icon: PenTool,
                  name: 'Content',
                  color: PALETTE.green,
                  description: 'Narrative-aligned drafts in your voice, opened with full conversation context. LinkedIn posts, email commentary, trade media pitches, talking points — ready to review and publish.',
                },
                {
                  num: '05',
                  icon: Layout,
                  name: 'Library',
                  color: PALETTE.slate,
                  description: 'Themes and signals you can revisit. The underlying intelligence map for when you want the detail behind a brief, not just the synthesis.',
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.name} className="relative flex gap-5 sm:gap-7">
                    {/* Node */}
                    <div
                      className="hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center flex-shrink-0 z-10 bg-[var(--navy)]"
                      style={{ boxShadow: `inset 0 0 0 1px ${step.color}35, 0 0 24px -6px ${step.color}30` }}
                    >
                      <Icon size={22} style={{ color: step.color }} />
                    </div>
                    {/* Card */}
                    <div className="lift-card flex-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: `linear-gradient(to bottom, ${step.color}80, transparent)` }} />
                      <div className="flex items-center gap-3 mb-2.5">
                        <div
                          className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${step.color}12`, boxShadow: `inset 0 0 0 1px ${step.color}30` }}
                        >
                          <Icon size={16} style={{ color: step.color }} />
                        </div>
                        <span className="font-mono text-xs font-bold tracking-wider" style={{ color: step.color }}>
                          {step.num}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                          {step.name}
                        </h3>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 5: THE GROWTH LOOP */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#172032]/30 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <span className="eyebrow block mb-4">The system compounds</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              The Monitus{' '}
              <span className="bg-gradient-to-r from-[#7DC4BD] via-[var(--accent)] to-[#3AAF7C] bg-clip-text text-transparent">
                growth loop
              </span>
            </h2>
          </div>

          <div className="stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { step: '01', label: 'Define your profile', color: PALETTE.violet },
              { step: '02', label: 'Map the conversations', color: PALETTE.tealLight },
              { step: '03', label: 'Score what matters', color: PALETTE.teal },
              { step: '04', label: 'Brief your priorities', color: PALETTE.green },
              { step: '05', label: 'Draft the output', color: PALETTE.teal },
              { step: '06', label: 'Sharpen the next cycle', color: PALETTE.violet },
            ].map((item, i) => (
              <div
                key={item.step}
                className="lift-card loop-seq flex items-center gap-4 p-5 bg-[var(--navy-light)] rounded-xl border border-[var(--border)]"
                style={{ '--seq': i } as React.CSSProperties}
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-bold flex-shrink-0"
                  style={{ color: item.color, background: `${item.color}10`, boxShadow: `inset 0 0 0 1px ${item.color}28` }}
                >
                  {item.step}
                </span>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[#172032]/70 border border-[#25334A]/70 rounded-full px-4 py-2">
              <RefreshCw size={13} className="text-[#7DC4BD]" />
              <span>Each cycle sharpens the next</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 6: WHY DIFFERENT */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="eyebrow block mb-4">Why it&apos;s different</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-4 leading-tight">
              Built for selling into insurance, not generic B2B SaaS
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Insurance buying environments are not simple. A point that lands with a CUO may fail with a CFO.
            </p>
          </div>

          <div className="lift-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-transparent" />
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Monitus asks five questions before acting on any signal:</p>
            <div>
              {[
                'Is this relevant to our buyers?',
                'Which stakeholder will care most?',
                'Do we have a credible right to say something here?',
                'Should we act now, monitor, or ignore?',
                'What format makes the most sense?',
              ].map((item, i, arr) => (
                <div
                  key={i}
                  className={`flex items-center gap-5 py-4 ${i < arr.length - 1 ? 'border-b border-[#25334A]/60' : ''}`}
                >
                  <span className="font-mono text-lg font-bold text-[#7DC4BD]/50 flex-shrink-0 w-8">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-base sm:text-lg text-[#E1E7EF]/90 font-medium">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-7 leading-relaxed border-t border-[#25334A]/60 pt-6">
              That is what makes Monitus insurance-specific. Not a keyword filter. A genuine understanding of how insurtechs need to show up to insurance buyers.
            </p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 7: STAKEHOLDER INTELLIGENCE */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#172032]/30 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <span className="eyebrow block mb-4">Stakeholder intelligence</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              The same story does not work for every buyer
            </h2>
          </div>

          <div className="stagger grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { title: 'CUOs', focus: 'Underwriting quality and risk selection', icon: Shield, color: PALETTE.tealLight },
              { title: 'CFOs', focus: 'ROI, operating leverage, payback', icon: BarChart3, color: PALETTE.teal },
              { title: 'CTOs / CIOs', focus: 'Implementation risk, integration, data handling', icon: Layout, color: PALETTE.green },
              { title: 'CEOs', focus: 'Growth, credibility, strategic edge', icon: TrendingUp, color: PALETTE.violet },
              { title: 'Heads of Distribution', focus: 'Turnaround, ease, workflow friction', icon: Users, color: PALETTE.slate },
            ].map((stakeholder) => {
              const Icon = stakeholder.icon;
              return (
                <div
                  key={stakeholder.title}
                  className="lift-card bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(to right, ${stakeholder.color}90, transparent)` }} />
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${stakeholder.color}10`, boxShadow: `inset 0 0 0 1px ${stakeholder.color}28` }}
                  >
                    <Icon size={18} style={{ color: stakeholder.color }} />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] mb-1.5">{stakeholder.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{stakeholder.focus}</p>
                </div>
              );
            })}
          </div>

          <p className="text-[var(--text-secondary)] text-center mt-10 max-w-2xl mx-auto leading-relaxed">
            So the output is not just polished. It is relevant to the person reading it.
          </p>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 8: MISSION CONTROL — app-window mockup */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="eyebrow block mb-4">Your weekly view</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              See what matters without reading the whole market
            </h2>
          </div>

          <div className="lift-card rounded-2xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-[#25334A]/70 bg-[#111927]/60">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D05050]/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4943A]/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3AAF7C]/50" />
              <span className="ml-3 font-mono text-[11px] text-[#8494A7]/80 tracking-wide">monitus — market brief · this week</span>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">When you open your Market Brief, you see:</p>
              <div className="stagger space-y-2.5">
                {[
                  'New signals scored and prioritised against your profile',
                  'Emerging conversations with recommended response actions',
                  'Competitor movements already interpreted',
                  'Stakeholder-specific opportunities ranked by timing',
                  'Draft content ready for review or one-click publishing',
                  'A weekly priority view with clear next steps',
                  'Learning insights that sharpen future briefs',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#111927]/50 rounded-lg border border-[#25334A]/40">
                    <div className="w-5 h-5 rounded-full bg-[#4A9E96]/12 ring-1 ring-[#4A9E96]/30 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-[#7DC4BD]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[var(--text-primary)] font-semibold text-center mt-7">
                It should feel like opening the desk of a sharp operator.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 9: THE THREE SURFACES */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#172032]/30 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <span className="eyebrow block mb-4">Three surfaces</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              The three surfaces of{' '}
              <span className="bg-gradient-to-r from-[#7DC4BD] via-[var(--accent)] to-[#3AAF7C] bg-clip-text text-transparent">
                a running market
              </span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mt-4">
              Mapping what is happening, deciding what to do, and producing what to send — three views off the same intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                name: 'Market View',
                color: PALETTE.tealLight,
                role: 'Continuously monitors 60+ insurance-specific sources and clusters them into conversations. Every story scored against your profile, every competitor move interpreted, every regulatory shift surfaced. The map of what is moving in your market.',
              },
              {
                icon: Lightbulb,
                name: 'Market Brief',
                color: PALETTE.teal,
                role: 'The weekly synthesis. What changed, what matters, what to do about it. Conversations ranked by relevance and timing. Stakeholder angles already chosen. Recommended actions ready for you to approve, defer or dismiss.',
              },
              {
                icon: PenTool,
                name: 'Content',
                color: PALETTE.green,
                role: 'Narrative-aligned drafts opened with full conversation context. LinkedIn posts, email commentary, trade media pitches, founder talking points, meeting briefings, board-ready reports — in your voice, ready to review and publish.',
              },
            ].map((agent) => {
              const Icon = agent.icon;
              return (
                <div key={agent.name} className="lift-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-7 sm:p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(to right, ${agent.color}, transparent)` }} />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: `${agent.color}10`, boxShadow: `inset 0 0 0 1px ${agent.color}28, 0 0 24px -8px ${agent.color}30` }}
                  >
                    <Icon size={21} style={{ color: agent.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 tracking-tight">{agent.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{agent.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 10: SOURCE INTELLIGENCE */}
      <section className="fade-section py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="eyebrow block mb-4">Always listening</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] max-w-3xl mx-auto leading-tight">
              Monitors the sources your team would never keep up with manually
            </h2>
          </div>

          <div className="stagger grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Insurance trade press', icon: FileText, color: PALETTE.tealLight },
              { label: 'Regulatory bodies', icon: Shield, color: PALETTE.teal },
              { label: 'Industry analyst reports', icon: BarChart3, color: PALETTE.green },
              { label: 'Competitor announcements', icon: Target, color: PALETTE.violet },
              { label: 'PR wires and newswires', icon: Radio, color: PALETTE.slate },
              { label: 'Conference and event feeds', icon: Users, color: PALETTE.tealLight },
              { label: 'Insurance podcasts', icon: MessageSquare, color: PALETTE.teal },
              { label: 'Market data providers', icon: TrendingUp, color: PALETTE.green },
            ].map((source) => {
              const Icon = source.icon;
              return (
                <div key={source.label} className="lift-card flex items-center gap-3 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl px-4 py-3.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${source.color}10`, boxShadow: `inset 0 0 0 1px ${source.color}25` }}
                  >
                    <Icon size={15} style={{ color: source.color }} />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{source.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 11: FIRST VALUE */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#172032]/30 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <span className="eyebrow block mb-4">Time to value</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              The first useful output should arrive fast
            </h2>
          </div>

          <div className="rounded-2xl border border-[#4A9E96]/30 bg-gradient-to-br from-[#4A9E96]/[0.08] via-[var(--navy-light)] to-[#3AAF7C]/[0.08] p-7 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent)] rounded-full blur-[100px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#3AAF7C] rounded-full blur-[100px] opacity-10 pointer-events-none" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 relative">
              When you create your Narrative, Monitus runs a 7-day lookback across all monitored sources. Within minutes, you see:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-7 relative">
              {[
                'Signals scored against your positioning',
                'Themes already emerging in your market',
                'Competitor activity already interpreted',
                'Opportunities already ranked',
                'Draft content ready to review',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#111927]/50 rounded-lg border border-[#25334A]/40">
                  <div className="w-5 h-5 rounded-full bg-[#4A9E96]/12 ring-1 ring-[#4A9E96]/30 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-[#7DC4BD]" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 relative">
              No waiting weeks. No onboarding calls. Your Narrative powers everything from the start.
            </p>
            <div className="text-center relative">
              <Link
                href="/register?flow=narrative"
                className="cta-glow inline-flex items-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm"
              >
                Define your Narrative for free <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 12: WHAT IT IS NOT */}
      <section className="fade-section py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="eyebrow block mb-4">No category confusion</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Monitus is not
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            <div className="bg-[#172032]/60 border border-[var(--border)] rounded-2xl p-7 sm:p-8">
              <div className="space-y-1">
                {[
                  'A chatbot you prompt for content',
                  'A generic AI writing tool',
                  'A social media scheduler',
                  'A CRM or sales tool',
                  'A news aggregator',
                  'A marketing automation platform',
                ].map((item, i, arr) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-[#25334A]/50' : ''}`}
                  >
                    <X size={14} className="text-red-400/70 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lift-card bg-[var(--navy-light)] border border-[#4A9E96]/30 rounded-2xl p-7 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-transparent" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-[var(--accent)] rounded-full blur-[100px] opacity-[0.08] pointer-events-none" />
              <p className="text-lg font-bold text-[var(--text-primary)] mb-5 tracking-tight">Monitus is</p>
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-4">
                An AI growth intelligence system that defines your positioning, monitors your market, decides what matters, and prepares credible output so your team can act on it.
              </p>
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                It operates in the background. It understands insurance. And it gets sharper with every cycle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 13: FINAL CTA */}
      <section className="fade-section py-28 relative overflow-hidden border-t border-[#25334A]/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-[var(--accent)] to-[#3AAF7C] rounded-full blur-[200px] opacity-[0.07]" />
        </div>
        <div className="hero-grid-fade absolute inset-0 pointer-events-none" />

        <div className="max-w-2xl mx-auto px-6 text-center relative">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
            Become one of the most credible voices{' '}
            <span className="bg-gradient-to-r from-[#7DC4BD] via-[var(--accent)] to-[#3AAF7C] bg-clip-text text-transparent">
              in your market
            </span>
          </h2>
          <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">
            Define your Narrative. Let Monitus handle the market reading, the filtering, the prioritising, and the drafting. Show up like the company your buyers should take seriously.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="cta-glow flex items-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white font-semibold px-8 py-4 rounded-xl transition-all text-base"
            >
              Define your Narrative for free <ArrowRight size={18} />
            </Link>
            <Link
              href="/market-brief?companyId=demo"
              className="inline-flex items-center gap-2 text-[var(--text-primary)] font-medium px-6 py-4 rounded-xl border border-[var(--border)] hover:border-[#4A9E96]/40 hover:bg-[var(--navy-light)] transition-colors text-base"
            >
              Explore a sample Market Brief first
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-[1.2fr_0.8fr] gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#3AAF7C] flex items-center justify-center">
                  <Zap size={14} className="text-white" />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] font-heading">Monitus</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
                The AI Growth Manager for Insurtechs. Continuous market intelligence, weekly priorities, and ready-to-publish drafts &mdash; built around your company narrative.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-[#8494A7]/60 mb-3.5">Product</p>
                <div className="space-y-2.5">
                  <Link href="/pricing" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
                  <Link href="/blog" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Blog</Link>
                  <Link href="/login" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Sign in</Link>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-[#8494A7]/60 mb-3.5">Company</p>
                <div className="space-y-2.5">
                  <Link href="/about" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">About</Link>
                  <Link href="/contact" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact</Link>
                  <Link href="/privacy" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
                  <Link href="/terms" className="block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-[#25334A]/70">
            <p className="text-xs text-[#8494A7]/70">
              &copy; {new Date().getFullYear()} Monitus. The AI Growth Manager for Insurtechs.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
