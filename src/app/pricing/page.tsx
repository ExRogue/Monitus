'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Check, ArrowRight } from 'lucide-react';

// GBP to USD conversion factor (approximate)
const GBP_TO_USD = 1.27;

const PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    period: 'forever',
    desc: 'Your Narrative — the foundation',
    features: [
      'Full onboarding interview',
      'Complete Narrative document',
      'Departmental messaging matrix',
      'One live signal demonstration',
      'Branded PDF export',
    ],
    accent: 'var(--text-secondary)',
    popular: false,
    cta: 'Start now',
  },
  {
    name: 'Starter',
    monthlyPrice: 500,
    yearlyPrice: 4800,
    period: '/month',
    desc: 'For founders managing their own LinkedIn',
    features: [
      'Narrative',
      'Weekly monitoring (50 articles/mo)',
      '3 LinkedIn drafts per week',
      'Up to 20 content pieces/month',
      'Basic engagement tracking',
      'Email support',
    ],
    accent: 'var(--accent)',
    popular: false,
    cta: 'Start 14-day trial',
  },
  {
    name: 'Growth',
    monthlyPrice: 1200,
    yearlyPrice: 11520,
    period: '/month',
    desc: 'For founder + junior marketing hire',
    features: [
      'Everything in Starter',
      'Daily monitoring (200 articles/mo)',
      'Up to 100 content pieces/month',
      'All 3 content formats',
      'LinkedIn posting via API',
      'Email export',
      'Trade media pitches',
      'Monthly intelligence report',
      'Weekly Priority View',
      'Up to 3 users',
    ],
    accent: 'var(--accent)',
    popular: true,
    cta: 'Start 14-day trial',
  },
  {
    name: 'Intelligence',
    monthlyPrice: 2000,
    yearlyPrice: 19200,
    period: '/month',
    desc: 'For the full commercial team',
    features: [
      'Everything in Growth',
      'Competitor tracking & positioning',
      'Quarterly positioning review',
      'Briefing builder',
      'Departmental matrix updates',
      'Unlimited users',
    ],
    accent: 'var(--success)',
    popular: false,
    cta: 'Start 14-day trial',
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [currency, setCurrency] = useState<'GBP' | 'USD'>('GBP');

  // Auto-detect locale from browser on mount
  useEffect(() => {
    try {
      const browserLocale = navigator.language || '';
      if (browserLocale.startsWith('en-US') || browserLocale === 'en') {
        // 'en' without region — check timezone as a fallback signal
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (browserLocale === 'en-US' || tz.startsWith('America/')) {
          setCurrency('USD');
        }
      }
    } catch {
      // Default to GBP
    }
  }, []);

  const currencySymbol = currency === 'USD' ? '$' : '\u00a3';
  const convertPrice = (gbpPrice: number) => {
    if (currency === 'USD') return Math.round(gbpPrice * GBP_TO_USD);
    return gbpPrice;
  };

  return (
    <div className="min-h-screen bg-[var(--navy)]">
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Monitus</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm text-[var(--text-secondary)]">
            <a href="/#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">How it works</a>
            <Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">About</Link>
            <Link href="/blog" className="hover:text-[var(--text-primary)] transition-colors">Blog</Link>
            <Link href="/contact" className="hover:text-[var(--text-primary)] transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start with your free Narrative
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Start with your free Narrative. The paid tiers unlock continuous monitoring, content generation, and intelligence.
          </p>

          {/* Annual toggle + Currency toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!annual ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                Monthly
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  annual ? 'bg-[var(--accent)]' : 'bg-[var(--navy-lighter)]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    annual ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className={`text-sm ${annual ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                Annual
              </span>
              {annual && (
                <span className="text-xs font-medium text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-full px-2 py-0.5">
                  Save 20%
                </span>
              )}
            </div>

            {/* Currency toggle */}
            <div className="flex items-center gap-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setCurrency('GBP')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currency === 'GBP'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                £ GBP
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currency === 'USD'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Founding customer banner */}
        <div className="bg-gradient-to-r from-[var(--accent)]/10 to-[var(--purple)]/10 border border-[var(--accent)]/20 rounded-xl p-4 mb-8 text-center">
          <p className="text-sm text-[var(--text-primary)] font-medium">
            Founding customer pricing available &mdash; 50% off for 3 months in exchange for a case study and reference.
          </p>
          <Link href="/contact" className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block">
            Talk to us &rarr;
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const basePrice = annual && plan.yearlyPrice > 0
              ? Math.round(plan.yearlyPrice / 12)
              : plan.monthlyPrice;
            const displayPrice = convertPrice(basePrice);
            const displayYearlyPrice = convertPrice(plan.yearlyPrice);

            return (
              <div
                key={plan.name}
                className={`relative bg-[var(--navy-light)] border rounded-xl p-6 flex flex-col ${
                  plan.popular
                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                    : 'border-[var(--border)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--accent)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    {plan.desc}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {displayPrice === 0 ? (
                      <span className="text-3xl font-extrabold text-[var(--text-primary)]">{currencySymbol}0</span>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                          {currencySymbol}{displayPrice.toLocaleString()}
                        </span>
                        <span className="text-[var(--text-secondary)] text-sm">/month</span>
                      </>
                    )}
                  </div>
                  {displayPrice === 0 && (
                    <p className="text-xs text-[var(--success)] mt-1 font-medium">{plan.period}</p>
                  )}
                  {annual && plan.yearlyPrice > 0 && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {currencySymbol}{displayYearlyPrice.toLocaleString()} billed yearly
                    </p>
                  )}
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        size={14}
                        className="mt-0.5 shrink-0"
                        style={{ color: plan.accent }}
                      />
                      <span className="text-xs text-[var(--text-secondary)]">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`text-center font-medium px-5 py-2.5 rounded-lg transition-colors text-sm ${
                    plan.popular
                      ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
                      : 'bg-[var(--navy-lighter)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--navy-light)]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">
            Common questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'How is Monitus different from a content tool?',
                a: 'Content tools help you write. Monitus is a growth intelligence system. It defines your positioning via a Narrative, monitors 60+ insurance-specific sources, decides what matters through a Strategy Partner agent, and then generates stakeholder-specific output via a Content Producer agent. The content is the output, not the product.',
              },
              {
                q: 'What sources does Monitus monitor?',
                a: 'Insurance trade press, regulatory bodies (FCA, PRA, NAIC, State DOIs), industry analyst reports, competitor announcements, PR wires, conference and event feeds, insurance podcasts, and market data providers. Over 60 sources, all insurance-specific.',
              },
              {
                q: 'How does the stakeholder intelligence work?',
                a: 'Monitus maps every signal and opportunity to the stakeholder most likely to care. A CUO cares about underwriting quality. A CFO cares about ROI and payback. A CTO cares about integration risk. The same market development gets positioned differently depending on who is reading it.',
              },
              {
                q: 'Do I need a marketing team to use Monitus?',
                a: 'No. Monitus is built so a founder or small team can produce consistent, credible output without hiring. The Market Analyst, Strategy Partner, and Content Producer agents handle the work that would normally require a market analyst, a strategist, and a content writer.',
              },
              {
                q: 'How quickly will I see results?',
                a: 'When you define your Narrative, Monitus runs a 7-day lookback across all sources. Within minutes you see scored signals, emerging themes, ranked opportunities, and draft content. No onboarding calls or waiting period.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel before your next billing cycle and pay nothing further. Your Narrative and content history are preserved if you return later.',
              },
              {
                q: 'What is the Narrative?',
                a: 'Your Narrative is the strategic foundation of Monitus. It defines how your company should be positioned, who your buyers are, what resonates with each stakeholder, your brand voice, competitive positioning, and what to avoid saying. It powers every agent and every piece of output. The Narrative is free to create and yours to keep.',
              },
              {
                q: 'How does pricing work?',
                a: 'Start with a free Narrative. Paid tiers unlock continuous market monitoring, the Strategy Partner agent, the Content Producer agent, and your Mission Control workspace. Annual billing saves 20%. All tiers include a 14-day trial.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{q}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Monitus. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">About</Link>
            <Link href="/contact" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact</Link>
            <Link href="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
