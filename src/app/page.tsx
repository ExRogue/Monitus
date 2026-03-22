'use client';
import { useEffect } from 'react';
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
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
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
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white px-4 py-2 rounded-lg transition-all"
            >
              See Monitus in action
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
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
              For specialist insurtechs selling to insurers, brokers, MGAs, reinsurers, capacity providers, and Lloyd&apos;s market participants
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.1] max-w-4xl mx-auto mb-6">
            The AI Growth Manager{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-[#8B5CF6] bg-clip-text text-transparent">
              for Insurtechs
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed">
            Turn insurance market developments into credible positioning and commentary that builds trust and pipeline &mdash; automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="cta-glow flex items-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white font-semibold px-8 py-4 rounded-xl transition-all text-base"
            >
              See Monitus in action <ArrowRight size={18} />
            </Link>
            <Link
              href="/register?flow=narrative"
              className="flex items-center gap-2 bg-[var(--navy-light)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--text-primary)] font-medium px-8 py-4 rounded-xl transition-all hover:bg-[var(--navy-lighter)] text-base"
            >
              Build your narrative
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 text-xs text-[var(--text-secondary)]/60">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              <span>Insurance-specific AI</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[var(--success)]" />
              <span>Always-on monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
              <span>Buyer-ready output</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 1: Problem */}
      <section className="fade-section py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full" />
            <div className="flex items-start gap-4 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 mt-1 ring-1 ring-amber-500/20">
                <Target size={22} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Strong products do not automatically create market credibility.
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base">
                  Most insurtechs know their product is good. What they do not have is a functioning growth intelligence capability.
                </p>
              </div>
            </div>

            <div className="mt-6 mb-8">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-4">They do not consistently know:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'What matters in their market',
                  'Which developments are worth responding to',
                  'How to turn market movement into sharp commentary',
                  'How to sound credible to the right buyers',
                  'What to ignore',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--navy)]/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--border)]">
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base mb-4">
                So they show up inconsistently. And in insurance, familiarity carries weight. It is easier to trust what you recognise. Easier to engage with what has been consistent. Easier to recommend what has stayed visible.
              </p>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base mb-4">
                If you only show up occasionally, or respond in a generic way, the market does not build a clear picture of what you understand or why your company matters.
              </p>
              <p className="text-[var(--text-primary)] font-semibold text-center text-base sm:text-lg mt-6">
                That gradually shapes perception. Who feels relevant. Who seems to understand the industry. Who gets taken seriously.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 2: Solution */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              You could do this yourself.
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              If your job was reading insurance news all day.
            </p>
          </div>

          <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[var(--accent)]/5 to-transparent rounded-tr-full" />
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed relative">Not just scanning headlines. Actually:</p>
            <div className="space-y-3 mb-8 relative">
              {[
                'Reading everything that might matter',
                'Tracking competitors and market shifts',
                'Spotting patterns early',
                'Mapping it to your narrative — or defining one',
                'Working out which themes matter to your buyers',
                'Turning it into something worth saying',
                'Doing that every day, without missing anything important',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0 group-hover:shadow-[0_0_8px_rgba(74,158,150,0.6)] transition-shadow" />
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-[var(--border)] relative">
              <p className="text-[var(--text-primary)] font-semibold text-lg text-center">
                That is a full-time job most insurtech teams do not have.
              </p>
              <p className="bg-gradient-to-r from-[var(--accent)] to-[#7DC4BD] bg-clip-text text-transparent font-bold text-xl text-center mt-3">
                Monitus does it for you &mdash; from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <div className="section-divider" />

      <section id="how-it-works" className="fade-section py-24 relative">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-light)]/40 via-transparent to-[var(--navy-light)]/40 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-3 block">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              An AI team working for you in the background.
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Monitus is not one generic assistant. It is a team of specialised AI agents, each handling a different part of the job.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                num: '01',
                icon: Eye,
                name: 'Signals',
                color: '#7DC4BD',
                description: 'The Signals Agent watches the market and surfaces what matters for your narrative, buyers, and competitors.',
              },
              {
                num: '02',
                icon: Lightbulb,
                name: 'Opportunities',
                color: '#4A9E96',
                description: 'The Opportunity Agent decides what is worth acting on, which angle is strongest, and what format makes sense.',
              },
              {
                num: '03',
                icon: PenTool,
                name: 'Content',
                color: '#3AAF7C',
                description: 'The Content Agent prepares the output in your company\'s voice, linked back to the originating signal or theme.',
              },
              {
                num: '04',
                icon: FileText,
                name: 'Briefing',
                color: '#6B7D92',
                description: 'The Briefing Agent turns all of that into clear weekly priorities, competitor takeaways, and meeting-ready guidance.',
              },
              {
                num: '05',
                icon: Brain,
                name: 'Learning',
                color: '#8B5CF6',
                description: 'The Learning Agent tracks which themes are rising, where competitors are moving, and what deserves reinforcement next.',
              },
            ].map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="agent-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 relative overflow-hidden group"
                  style={{ borderLeftColor: agent.color }}
                >
                  {/* Hover gradient */}
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
                        className="w-12 h-12 rounded-xl flex items-center justify-center ring-1"
                        style={{
                          background: `${agent.color}12`,
                          ringColor: `${agent.color}25`,
                          boxShadow: `0 0 20px ${agent.color}10`,
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

          {/* Narrative Definition */}
          <div className="mt-16 gradient-border bg-gradient-to-br from-[var(--accent)]/10 via-[var(--navy-light)] to-[#8B5CF6]/10 rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] rounded-full blur-[80px] opacity-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#8B5CF6] rounded-full blur-[80px] opacity-10" />
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 relative">Your Narrative Definition</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Beneath all of it sits your Narrative Definition. Monitus starts by defining:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {[
                'How your company should be understood',
                'Who your ICPs are',
                'What resonates with them',
                'What you should say',
                'What you should avoid',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-[var(--navy)]/50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              That strategic foundation is what makes the rest of the system company-specific rather than generic.
            </p>
            <div className="text-center">
              <Link
                href="/register?flow=narrative"
                className="cta-glow inline-flex items-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[#3AAF7C] hover:from-[var(--accent-hover)] hover:to-[#2D9A6B] text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm"
              >
                Create your Narrative Definition for free now <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 4: Value */}
      <section className="fade-section py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-3 block">The value</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Winning clients starts long before the sales call.
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Monitus works on that for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-transparent" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center ring-1 ring-[var(--accent)]/20">
                  <BarChart3 size={20} className="text-[var(--accent)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  It gives you a clear operating view of what matters now
                </h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Monitus AI agents surface:</p>
              <div className="space-y-2.5">
                {[
                  'The themes worth paying attention to',
                  'The angles you are best placed to own',
                  'Competitor movement where it matters',
                  'The outputs worth preparing or publishing',
                  'The noise that is safe to ignore',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--success)] to-transparent" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center ring-1 ring-[var(--success)]/20">
                  <PenTool size={20} className="text-[var(--success)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  It will also prepare
                </h3>
              </div>
              <div className="space-y-2.5">
                {[
                  'LinkedIn posts',
                  'Email commentary',
                  'Trade media pitches',
                  'Founder talking points',
                  'Event prep',
                  'Meeting briefings',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] mt-2 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 5: Why It's Different */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-light)]/40 via-transparent to-[var(--navy-light)]/40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Monitus is not one thing.{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-[#8B5CF6] bg-clip-text text-transparent">
                It&apos;s your strategic AI growth team.
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: BarChart3, title: 'Market analyst', color: '#7DC4BD' },
              { icon: Target, title: 'Positioning strategist', color: '#4A9E96' },
              { icon: Eye, title: 'Competitor watcher', color: '#3AAF7C' },
              { icon: MessageSquare, title: 'Commentary adviser', color: '#6B7D92' },
              { icon: FileText, title: 'Briefing partner', color: '#8B5CF6' },
            ].map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="glow-card bg-[var(--navy)] border border-[var(--border)] rounded-xl p-6 text-center group"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-shadow duration-300"
                    style={{
                      background: `${role.color}12`,
                      boxShadow: `0 0 0 1px ${role.color}20`,
                    }}
                  >
                    <Icon size={24} style={{ color: role.color }} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{role.title}</p>
                </div>
              );
            })}
          </div>

          <p className="text-[var(--text-secondary)] text-center mt-8 max-w-2xl mx-auto leading-relaxed">
            All running in the background, helping your insurtech stay relevant, sound credible, and build trust with the right buyers.
          </p>
        </div>
      </section>

      {/* Section 6: Learning */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              AI that gets sharper with every cycle.
            </h2>
          </div>

          <div className="glow-card bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#8B5CF6]/5 to-transparent rounded-bl-full" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 relative">
              A regulatory update, trade press theme, or competitor move appears. Monitus works out:
            </p>
            <div className="space-y-3 mb-8 relative">
              {[
                'What happened',
                'Why it matters in the market',
                'Why it matters to your buyers',
                'Whether it deserves a response',
                'Which angle is strongest',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 bg-[var(--navy)]/50 rounded-lg border border-[var(--border)]/50 hover:border-[var(--accent)]/20 transition-colors">
                  <ChevronRight size={14} className="text-[var(--accent)] flex-shrink-0" />
                  <p className="text-sm text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--text-primary)] font-medium mb-8">Then it prepares the output.</p>

            <div className="border-t border-[var(--border)] pt-8">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                It helps shape your positioning over time
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                Monitus helps you reinforce the themes you should own and ignore the ones that do not matter.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[var(--navy)]/50 rounded-xl p-5">
                  <p className="text-sm font-medium text-[var(--accent)] mb-2">For smaller teams</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Consistent strategic output without needing to hire a full team.
                  </p>
                </div>
                <div className="bg-[var(--navy)]/50 rounded-xl p-5">
                  <p className="text-sm font-medium text-[var(--accent)] mb-2">For existing teams</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Less time spent reacting and more time spent acting strategically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 7: Built for Specialist Insurtechs */}
      <section className="fade-section py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-light)]/40 via-transparent to-[var(--navy-light)]/40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Built for Specialist Insurtechs
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Designed for companies selling into insurance, not general B2B software.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 relative">
            <div className="glow-card bg-[var(--navy)] border border-[var(--border)] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] via-[#7DC4BD] to-transparent" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Monitus is built for insurtechs selling to:</h3>
              <div className="space-y-2.5">
                {[
                  'Insurers',
                  'Brokers',
                  'MGAs',
                  'Reinsurers',
                  'Capacity providers',
                  'Lloyd\'s market participants',
                ].map((buyer, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-[var(--navy-light)]/50 rounded-lg">
                    <Users size={14} className="text-[var(--accent)] flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{buyer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glow-card bg-[var(--navy)] border border-[var(--border)] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--success)] via-[#7DC4BD] to-transparent" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">It understands that this market rewards:</h3>
              <div className="space-y-2.5">
                {[
                  'Credibility',
                  'Expertise',
                  'Domain fluency',
                  'Buyer understanding',
                  'Practical value',
                ].map((value, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-[var(--navy-light)]/50 rounded-lg">
                    <Shield size={14} className="text-[var(--success)] flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-4 italic">Not generic SaaS marketing.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 8: The Narrative Definition / Trust */}
      <section className="fade-section py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Recognition becomes trust.{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[#7DC4BD] bg-clip-text text-transparent">
                Trust becomes pipeline.
              </span>
            </h2>
          </div>

          <div className="gradient-border bg-gradient-to-br from-[var(--accent)]/10 via-[var(--navy-light)] to-[#8B5CF6]/10 rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-[var(--accent)] to-[#8B5CF6] rounded-full blur-[150px] opacity-[0.06]" />
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8 max-w-2xl mx-auto relative">
              When your company keeps showing up with credible, buyer-relevant market understanding, the commercial effects compound.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative">
              {[
                { text: 'Easier to recognise', color: '#7DC4BD' },
                { text: 'Easier to trust', color: '#4A9E96' },
                { text: 'Easier to shortlist', color: '#3AAF7C' },
                { text: 'Easier to recommend', color: '#8B5CF6' },
              ].map((outcome, i) => (
                <div key={i} className="bg-[var(--navy)]/60 rounded-xl p-5 border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors group">
                  <div className="w-8 h-1 rounded-full mb-3 mx-auto transition-all group-hover:w-12" style={{ background: outcome.color }} />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{outcome.text}</p>
                </div>
              ))}
            </div>
            <p className="text-[var(--text-primary)] font-semibold text-lg relative">
              That is the outcome Monitus is built for.
            </p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Section 9: Final CTA */}
      <section className="fade-section py-28 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[var(--accent)] to-[#8B5CF6] rounded-full blur-[200px] opacity-[0.06]" />
        </div>

        <div className="max-w-2xl mx-auto px-6 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Build trust before the sales conversation starts.
          </h2>
          <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">
            Let Monitus turn market movement into credible positioning, useful commentary, and consistent market presence.
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
              <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Product
              </Link>
              <Link href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                About
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
