'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Newspaper,
  FileText,
  ShieldCheck,
  Linkedin,
  Mic,
  Users,
  Mail,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Check,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Newspaper,
    title: 'Live News Ingestion',
    desc: 'Aggregates from 6 insurance trade press sources in real-time — Insurance Journal, Reinsurance News, Artemis, Insurance Times, The Insurer, and Commercial Risk.',
    color: 'var(--accent)',
  },
  {
    icon: Zap,
    title: 'AI Content Generation',
    desc: 'One click transforms raw articles into polished newsletters, LinkedIn posts, podcast scripts, and client briefings in your brand voice.',
    color: '#7DC4BD',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Engine',
    desc: 'Every piece of content is scanned against FCA, State DOI, GDPR, and FTC frameworks before it reaches your audience.',
    color: 'var(--success)',
  },
  {
    icon: FileText,
    title: 'Multi-Format Output',
    desc: 'Publish across every channel your clients use — from formal briefings to conversational social posts, all from the same source material.',
    color: 'var(--secondary)',
  },
];

const CONTENT_TYPES = [
  { icon: Mail, label: 'Newsletters', color: 'var(--accent)' },
  { icon: Linkedin, label: 'LinkedIn Posts', color: '#0A66C2' },
  { icon: Mic, label: 'Podcast Scripts', color: '#7DC4BD' },
  { icon: Users, label: 'Client Briefings', color: 'var(--secondary)' },
];

const LOGOS = [
  'Insurance Journal',
  'Reinsurance News',
  'Artemis',
  'Insurance Times',
  'The Insurer',
  'Commercial Risk',
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--navy)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Telum</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--accent)] rounded-full blur-[200px] opacity-[0.06]" />
          <div className="absolute top-[-100px] right-[-200px] w-[600px] h-[600px] bg-[var(--accent)] rounded-full blur-[250px] opacity-[0.04]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[var(--navy-light)] border border-[var(--border)] rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Built for insurance distribution companies
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] leading-tight max-w-4xl mx-auto mb-6">
            Turn insurance news into{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] to-[#7DC4BD] bg-clip-text text-transparent">
              client-ready content
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Telum ingests live trade press, generates branded content across four formats,
            and checks every word for regulatory compliance — so your team publishes in
            minutes, not days.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-7 py-3 rounded-lg transition-colors text-base"
            >
              Start free <ArrowRight size={18} />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 bg-[var(--navy-lighter)] border border-[var(--border)] text-[var(--text-primary)] font-medium px-7 py-3 rounded-lg hover:bg-[var(--navy-light)] transition-colors text-base"
            >
              See how it works
            </Link>
          </div>

          {/* Content type pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {CONTENT_TYPES.map((ct) => (
              <div
                key={ct.label}
                className="flex items-center gap-2 bg-[var(--navy-light)] border border-[var(--border)] rounded-full px-4 py-2"
              >
                <ct.icon size={16} style={{ color: ct.color }} />
                <span className="text-sm text-[var(--text-secondary)]">{ct.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Source bar */}
      <section className="border-y border-[var(--border)] bg-[var(--navy-light)]/50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-6">
            Aggregating from leading trade press
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {LOGOS.map((name) => (
              <span key={name} className="text-sm text-[var(--text-secondary)]/60 font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Everything you need to publish with confidence
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              From news aggregation to compliance-checked delivery — Telum handles
              the full content pipeline for insurance distribution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8 hover:border-[color:var(--accent)]/30 transition-colors group"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
                  style={{ background: `color-mix(in srgb, ${f.color} 15%, transparent)` }}
                >
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                  {f.title}
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-[var(--navy-light)]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Three steps to compliant content
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              No more copy-pasting from trade press. No more compliance back-and-forth.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Select Articles',
                desc: 'Browse your live news feed from 6 insurance trade press sources. Pick the stories that matter to your clients.',
                accent: 'var(--accent)',
              },
              {
                step: '02',
                title: 'Choose Formats',
                desc: 'Select which content types to generate — newsletters, LinkedIn posts, podcast scripts, or client briefings.',
                accent: '#7DC4BD',
              },
              {
                step: '03',
                title: 'Publish with Confidence',
                desc: 'Every output is compliance-checked against FCA, State DOI, GDPR, and FTC rules before you hit send.',
                accent: 'var(--success)',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className="text-5xl font-extrabold mb-4 opacity-20"
                  style={{ color: s.accent }}
                >
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                  {s.title}
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Built for insurance distribution
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'MGAs',
                desc: 'Generate thought leadership that positions your binding authority. Stay ahead of market trends with automated content from the specialist press.',
                badge: 'Managing General Agents',
              },
              {
                title: 'Insurtechs',
                desc: 'Keep your digital-first audience engaged with rapid-fire content. Turn market developments into social proof and product narratives.',
                badge: 'Insurance Technology',
              },
              {
                title: 'Brokers',
                desc: 'Deliver commercial intelligence your clients value. Transform complex industry news into clear, actionable briefings.',
                badge: 'Insurance Brokers',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8"
              >
                <span className="inline-block text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full px-3 py-1 mb-4">
                  {c.badge}
                </span>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                  {c.title}
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-[var(--navy-light)]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Start free, upgrade when you&apos;re ready. Every plan includes compliance checking and multi-format output.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: 49,
                yearly: 470,
                desc: 'For solo brokers and small teams getting started with automated content.',
                features: [
                  '50 articles per month',
                  '10 content pieces per month',
                  '1 user seat',
                  'All 4 content formats',
                  'Basic compliance checks',
                  'Email support',
                ],
                accent: 'var(--accent)',
                popular: false,
              },
              {
                name: 'Professional',
                price: 149,
                yearly: 1430,
                desc: 'For growing teams that need more volume and advanced features.',
                features: [
                  '200 articles per month',
                  '50 content pieces per month',
                  '5 user seats',
                  'All 4 content formats',
                  'Full compliance suite',
                  'Custom brand voice',
                  'Priority support',
                  'Analytics dashboard',
                ],
                accent: 'var(--accent)',
                popular: true,
              },
              {
                name: 'Enterprise',
                price: 399,
                yearly: 3830,
                desc: 'For large organisations with unlimited needs and dedicated support.',
                features: [
                  'Unlimited articles',
                  'Unlimited content pieces',
                  'Unlimited user seats',
                  'All 4 content formats',
                  'Full compliance suite',
                  'Custom brand voice',
                  'Dedicated account manager',
                  'API access',
                  'SSO & audit logs',
                ],
                accent: 'var(--success)',
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-[var(--navy-light)] border rounded-xl p-8 flex flex-col ${
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
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[var(--text-primary)]">
                      £{plan.price}
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm">/month</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    or £{plan.yearly}/year (save {Math.round((1 - plan.yearly / (plan.price * 12)) * 100)}%)
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0"
                        style={{ color: plan.accent }}
                      />
                      <span className="text-sm text-[var(--text-secondary)]">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`text-center font-medium px-6 py-3 rounded-lg transition-colors text-sm ${
                    plan.popular
                      ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
                      : 'bg-[var(--navy-lighter)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--navy-light)]'
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early access / waitlist */}
      <section className="py-24 bg-[var(--navy-light)]/40">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Get early access
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join the waitlist and be the first to automate your insurance content pipeline.
          </p>

          {submitted ? (
            <div className="flex items-center justify-center gap-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl px-6 py-4">
              <CheckCircle2 size={20} className="text-[var(--success)]" />
              <span className="text-[var(--success)] font-medium">
                You&apos;re on the list! We&apos;ll be in touch soon.
              </span>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="you@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Join waitlist
              </button>
            </form>
          )}
          {error && (
            <p className="text-sm text-[var(--error)] mt-3">{error}</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Telum</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Telum. AI-powered content for insurance distribution.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Terms
            </Link>
            <Link href="/login" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
