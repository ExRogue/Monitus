'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  Target,
  Brain,
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
  Briefcase,
  CircleDot,
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[var(--navy)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Monitus</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-[var(--text-secondary)]">
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
              className="hidden sm:inline-block text-sm font-medium bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white px-4 py-2 rounded-lg transition-all"
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
              <Link href="/register" className="text-sm font-medium bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] text-white px-4 py-2 rounded-lg text-center">Define your Narrative</Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Animated grid background */}
        <div className="hero-grid absolute inset-0 pointer-events-none" />

        {/* Floating gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="float-slow absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-gradient-to-br from-[var(--accent)] to-[#8B5CF6] rounded-full blur-[200px] opacity-[0.08]" />
          <div className="float-medium absolute top-[100px] right-[-300px] w-[600px] h-[600px] bg-gradient-to-bl from-[#7DC4BD] to-[var(--accent)] rounded-full blur-[250px] opacity-[0.06]" />
          <div className="float-fast absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] bg-gradient-to-tr from-[#8B5CF6] to-[var(--accent)] rounded-full blur-[200px] opacity-[0.05]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
          <div className="shimmer inline-flex items-center gap-2 bg-gradient-to-r from-[var(--navy-light)] to-[var(--navy-lighter)] border border-[var(--accent)]/20 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Built for insurtechs selling into insurance
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.1] max-w-4xl mx-auto mb-6">
            The AI Growth Manager{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-[#8B5CF6] bg-clip-text text-transparent">
              for Insurtechs
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-[var(--text-primary)] font-semibold max-w-2xl mx-auto mb-4">
            Turn insurance market signals into credibility and pipeline.
          </p>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-4 leading-relaxed">
            Monitus helps insurtechs selling into insurance define their positioning, understand what matters in the market, and act on it with credible, buyer-relevant output.
          </p>

          <p className="text-sm text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed opacity-80">
            It does the market reading, filtering, prioritising, and draft preparation in the background so your team can focus on decisions, not manual work.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register?flow=narrative"
              className="cta-glow flex items-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white font-semibold px-8 py-4 rounded-xl transition-all text-base"
            >
              Define your Narrative for free <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 2: THE PROBLEM */}
      <section className="fade-section py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full" />
            <div className="flex items-start gap-4 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 mt-1 ring-1 ring-amber-500/20">
                <Target size={22} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Most insurtechs do not have a growth intelligence function
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base">
                  They have a good product. They know the market. But they do not consistently show up like a company buyers should take seriously.
                </p>
              </div>
            </div>

            <div className="mt-6 mb-8">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'The founder posts occasionally, then disappears',
                  'The company page says very little of value',
                  'Marketing output feels generic or disconnected from commercial reality',
                  'Competitors look sharper simply because they are more visible',
                  'Strong products lose ground to stronger market presence',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--navy)]/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--border)]">
              <p className="text-[var(--text-primary)] font-semibold text-center text-base sm:text-lg">
                Insurance buyers notice this quickly. They can tell the difference between real expertise and generic insurtech marketing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 3: WHAT MONITUS DOES */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Know what matters, decide what to do, and act on it
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Built for insurtechs selling into complex insurance buying environments
            </p>
          </div>

          <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[var(--accent)]/5 to-transparent rounded-tr-full" />
            <div className="space-y-3 mb-8 relative">
              {[
                'Define a sharper market position',
                'Understand what is changing in your market',
                'See who those developments matter to',
                'Decide what is worth acting on',
                'Generate credible output quickly',
                'Stay consistent without becoming a full-time content machine',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0 group-hover:shadow-[0_0_8px_rgba(74,158,150,0.6)] transition-shadow" />
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-[var(--border)] relative">
              <p className="text-[var(--text-primary)] font-semibold text-lg text-center mb-6">
                When you open Monitus, the work should already be done.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'Relevant developments already filtered',
                  'Themes already identified',
                  'Competitor movement already interpreted',
                  'Opportunities already prioritised',
                  'Stakeholder angles already selected',
                  'Drafts already prepared',
                  'Recommendations already made actionable',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[var(--navy)]/50 rounded-lg border border-[var(--border)]/50">
                    <Check size={14} className="text-[var(--accent)] flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 4: HOW IT WORKS */}
      <section id="how-it-works" className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-light)]/40 via-transparent to-[var(--navy-light)]/40 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-3 block">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              An AI growth team operating in the background
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Monitus is not a collection of disconnected tools. It is a system with a clear division of labour.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                num: '01',
                icon: Compass,
                name: 'Narrative',
                color: '#8B5CF6',
                description: 'Define how your company should be positioned. Your Narrative is the strategic foundation that makes everything else company-specific rather than generic.',
              },
              {
                num: '02',
                icon: Eye,
                name: 'Market Analyst',
                color: '#7DC4BD',
                description: 'Scan the market continuously and surface what matters. Regulatory changes, competitor moves, trade press themes, and emerging trends filtered against your Narrative.',
              },
              {
                num: '03',
                icon: Lightbulb,
                name: 'Strategy Partner',
                color: '#4A9E96',
                description: 'Turn market intelligence into decisions. Which developments are worth responding to, which stakeholder will care most, and what format makes the most sense.',
              },
              {
                num: '04',
                icon: PenTool,
                name: 'Content Producer',
                color: '#3AAF7C',
                description: 'Create narrative-aligned, stakeholder-specific output. LinkedIn posts, email commentary, trade media pitches, briefings, and talking points in your voice.',
              },
              {
                num: '05',
                icon: Layout,
                name: 'Mission Control',
                color: '#6B7D92',
                description: 'See what changed, what matters, and what is ready. Your workspace brings together signals, opportunities, drafts, and recommendations in one view.',
              },
            ].map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="agent-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 relative overflow-hidden group"
                  style={{ borderLeftColor: agent.color }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${agent.color}08, transparent)` }}
                  />
                  <div className="flex items-start gap-4 relative">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className="text-2xl font-mono font-bold opacity-30"
                        style={{ color: agent.color }}
                      >
                        {agent.num}
                      </span>
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: `${agent.color}12`,
                          boxShadow: `0 0 20px ${agent.color}10, inset 0 0 0 1px ${agent.color}25`,
                        }}
                      >
                        <Icon size={22} style={{ color: agent.color }} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 5: THE GROWTH LOOP */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              The Monitus{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-[#8B5CF6] bg-clip-text text-transparent">
                growth loop
              </span>
            </h2>
          </div>

          <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[var(--accent)]/5 to-transparent rounded-bl-full" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 relative">
              {[
                { step: '01', label: 'Define narrative', color: '#8B5CF6' },
                { step: '02', label: 'Monitor the market', color: '#7DC4BD' },
                { step: '03', label: 'Interpret what matters', color: '#4A9E96' },
                { step: '04', label: 'Decide what to act on', color: '#3AAF7C' },
                { step: '05', label: 'Generate output', color: '#4A9E96' },
                { step: '06', label: 'Improve the next cycle', color: '#8B5CF6' },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-4 p-4 bg-[var(--navy)]/50 rounded-xl border border-[var(--border)]/50 group hover:border-[var(--accent)]/20 transition-colors">
                  <span className="text-2xl font-mono font-bold opacity-30" style={{ color: item.color }}>
                    {item.step}
                  </span>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <RefreshCw size={14} className="text-[var(--accent)]" />
                <span>Each cycle sharpens the next</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 6: SOURCE INTELLIGENCE */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-light)]/40 via-transparent to-[var(--navy-light)]/40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Monitors the sources your team would never keep up with manually
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Insurance trade press', icon: FileText, color: '#7DC4BD' },
              { label: 'Regulatory bodies', icon: Shield, color: '#4A9E96' },
              { label: 'Industry analyst reports', icon: BarChart3, color: '#3AAF7C' },
              { label: 'Competitor announcements', icon: Target, color: '#8B5CF6' },
              { label: 'PR wires and newswires', icon: Radio, color: '#6B7D92' },
              { label: 'Conference and event feeds', icon: Users, color: '#7DC4BD' },
              { label: 'Insurance podcasts', icon: MessageSquare, color: '#4A9E96' },
              { label: 'Market data providers', icon: TrendingUp, color: '#3AAF7C' },
            ].map((source) => {
              const Icon = source.icon;
              return (
                <div key={source.label} className="flex items-center gap-3 bg-[var(--navy)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)]/20 transition-colors">
                  <Icon size={18} style={{ color: source.color }} className="flex-shrink-0" />
                  <p className="text-sm text-[var(--text-secondary)]">{source.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 7: FIRST VALUE */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              The first useful output should arrive fast
            </h2>
          </div>

          <div className="gradient-border bg-gradient-to-br from-[var(--accent)]/10 via-[var(--navy-light)] to-[#8B5CF6]/10 rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] rounded-full blur-[80px] opacity-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#8B5CF6] rounded-full blur-[80px] opacity-10" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 relative">
              When you create your Narrative, Monitus runs a 7-day lookback across all monitored sources. Within minutes, you see:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6 relative">
              {[
                'Signals scored against your positioning',
                'Themes already emerging in your market',
                'Competitor activity already interpreted',
                'Opportunities already ranked',
                'Draft content ready to review',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-[var(--navy)]/50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed relative">
              No waiting weeks. No onboarding calls. Your Narrative powers everything from the start.
            </p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SECTION 8: FINAL CTA */}
      <section className="fade-section py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[var(--accent)] to-[#8B5CF6] rounded-full blur-[200px] opacity-[0.06]" />
        </div>

        <div className="max-w-2xl mx-auto px-6 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Become one of the most credible voices{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] to-[#7DC4BD] bg-clip-text text-transparent">
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
              See Monitus in action <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <Zap size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">Monitus</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
                The AI Growth Manager for Insurtechs. Market intelligence, positioning, commentary, and strategic guidance &mdash; running continuously in the background.
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                About
              </Link>
              <Link href="/blog" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Blog
              </Link>
              <Link href="/contact" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Contact
              </Link>
              <Link href="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Terms
              </Link>
              <Link href="/login" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Sign in
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)]">
              &copy; {new Date().getFullYear()} Monitus. The AI Growth Manager for Insurtechs.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
