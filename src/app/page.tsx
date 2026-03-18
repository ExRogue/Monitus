'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  FileText,
  ShieldCheck,
  Linkedin,
  Mail,
  ArrowRight,
  Check,
  BookOpen,
  Radar,
  PenTool,
  Send,
  Target,
  Brain,
  Megaphone,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

const MODULES = [
  {
    icon: BookOpen,
    name: 'Define',
    title: 'The Narrative',
    color: '#4A9E96',
    description: 'A structured AI interview extracts your genuine positioning — not marketing fluff. It pushes back on vague answers and challenges generic claims. The output is a six-section strategic document: company narrative, ICP profiles, departmental messaging matrix, brand voice rules, competitive positioning, and off-limits language.',
    detail: 'Not a form. Not a questionnaire. A conversation designed to extract real positioning from technical founders who have never thought about narrative explicitly.',
    free: true,
  },
  {
    icon: Radar,
    name: 'Monitor',
    title: 'The Radar',
    color: '#7DC4BD',
    description: 'Continuous monitoring across trade press, regulatory sources, and LinkedIn. Stories are pre-filtered, relevance-scored against your Narrative, and only the strongest signals surface. Maximum five stories per timeframe — if nothing meets the bar, you get alternative angles instead of weak content.',
    detail: 'Four-stage pipeline: Ingest → Pre-filter → Relevance score → Angle identification using 17 news values.',
  },
  {
    icon: PenTool,
    name: 'Draft',
    title: 'Channel-Specific Content',
    color: '#3AAF7C',
    description: 'For each approved signal, three distinct outputs simultaneously: a LinkedIn post in the founder\'s personal voice, an email with a genuine conversation opener, and a complete trade media pitch package with hook, target publication, headline, and attributed senior quote.',
    detail: 'Same voice, same narrative — different register, different length, different structure. The system learns from every edit.',
  },
  {
    icon: Send,
    name: 'Distribute',
    title: 'Zero Friction to Live',
    color: '#6B7D92',
    description: 'One-click copy, direct LinkedIn posting via API, email export compatible with Mailchimp and HubSpot, PDF export for trade media pitches and market briefings. Content calendar view showing published, scheduled, and pending items.',
    detail: 'We don\'t try to be a social media scheduler. The goal is minimum steps between approved and published.',
  },
  {
    icon: Brain,
    name: 'Learn',
    title: 'The PMF Feedback Loop',
    color: '#8B5CF6',
    description: 'Tracks not just engagement volume but who is engaging — flagging when target accounts interact versus when the audience skews wrong. Monthly intelligence reports identify which narrative pillars are landing and which aren\'t. Quarterly positioning reviews suggest specific Narrative updates backed by data.',
    detail: 'This is what makes it a growth intelligence platform, not a content tool. Every revolution of the loop makes the next one more accurate.',
  },
];

const SOURCES = {
  'Tier 1': ['Insurance Times', 'The Insurer', 'Post Magazine', 'FCA', 'Insurance Business UK', 'Insurance Age'],
  'Tier 2': ['Reinsurance News', 'Global Reinsurance', 'Artemis', 'Commercial Risk', 'AM Best', 'Carrier Management'],
};

export default function LandingPage() {
  // Scroll-triggered fade-in animations
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
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md sticky top-0 z-50">
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
              className="text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start with your free Narrative
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
              The AI Growth Manager for Insurtechs
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] leading-tight max-w-4xl mx-auto mb-6">
            Turn insurance market signals into{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] to-[#7DC4BD] bg-clip-text text-transparent">
              credibility and pipeline
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Monitus monitors your market, identifies where you should contribute perspective, and helps you consistently show up with intelligent, market-aware commentary that builds credibility and supports growth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-7 py-3.5 rounded-lg transition-colors text-base"
            >
              Start with your free Narrative <ArrowRight size={18} />
            </Link>
          </div>

          <p className="text-sm text-[var(--text-secondary)]/60">
            No credit card required. Your Narrative is free &mdash; forever.
          </p>
        </div>
      </section>

      {/* Pain point */}
      <section className="fade-section py-20 border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Target size={20} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
                  The problem you already know
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base">
                  You know your product is good. You can&apos;t translate that into consistent market presence.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {[
                'Your LinkedIn page is embarrassing. The last post was a product update three months ago.',
                'You\u2019re losing meetings to competitors who look more credible on paper.',
                'You hired someone to fix it and the output feels completely disconnected from what you\u2019re trying to achieve commercially.',
                'Your buyers are sophisticated insurance professionals who can tell the difference between genuine expertise and generic content instantly.',
              ].map((pain, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--navy)]/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{pain}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--border)]">
              <p className="text-[var(--text-primary)] font-semibold text-center text-base sm:text-lg">
                You need the right people to see you consistently saying smart, specific, non-obvious things about their market.
              </p>
              <p className="text-[var(--text-secondary)] text-center text-sm mt-2">
                Over time that builds a reputation that opens doors before the sales team even knocks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Source bar */}
      <section className="fade-section py-10 bg-[var(--navy-light)]/30">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-6">
            Monitoring insurance trade press &amp; regulatory sources
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[...SOURCES['Tier 1'], ...SOURCES['Tier 2']].map((name) => (
              <span key={name} className="text-sm text-[var(--text-secondary)]/50 font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The Five Modules */}
      <section id="how-it-works" className="fade-section py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Five modules. One loop.
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              The system does the work. You make decisions, not tasks. When you open the app, the work is already done.
            </p>
          </div>

          <div className="space-y-6">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.name}
                  className="bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 hover:border-[var(--accent)]/20 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex items-start gap-4 lg:w-2/5">
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className="text-3xl font-extrabold opacity-20"
                          style={{ color: mod.color }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div
                          className="w-11 h-11 rounded-lg flex items-center justify-center"
                          style={{ background: `${mod.color}15` }}
                        >
                          <Icon size={22} style={{ color: mod.color }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-[var(--text-primary)]">
                            {mod.name}
                          </h3>
                          {mod.free && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 px-2 py-0.5 rounded-full">
                              Free
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[var(--accent)]">{mod.title}</p>
                      </div>
                    </div>
                    <div className="lg:w-3/5">
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                        {mod.description}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]/70 italic">
                        {mod.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core loop visual */}
          <div className="mt-16 bg-gradient-to-r from-[var(--accent)]/5 to-[#8B5CF6]/5 border border-[var(--border)] rounded-2xl p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw size={20} className="text-[var(--accent)]" />
              <h3 className="text-lg font-bold text-[var(--text-primary)]">The Core Loop</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                'Define narrative',
                'Monitor market',
                'Identify angles',
                'Generate drafts',
                'Human review',
                'Distribute',
                'Track what lands',
                'Learn & refine',
                'Update Bible',
              ].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-medium text-xs sm:text-sm whitespace-nowrap">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight size={14} className="text-[var(--text-secondary)]/40 flex-shrink-0" />
                  )}
                </span>
              ))}
              <span className="flex items-center gap-2">
                <ChevronRight size={14} className="text-[var(--accent)] flex-shrink-0" />
                <span className="text-xs text-[var(--accent)] font-medium italic">repeat, better each time</span>
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-4">
              Every revolution makes the next one more accurate, more specific, and more valuable. The product gets better the longer you use it.
            </p>
          </div>
        </div>
      </section>

      {/* Narrative detail */}
      <section className="fade-section py-24 bg-[var(--navy-light)]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Your Narrative is where it starts
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Not a form. A structured AI conversation designed to extract genuine positioning from technical founders. It pushes back on vague answers. It challenges generic claims. It produces a professional document you&apos;d share with investors, new hires, or a PR agency.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Company Narrative', desc: 'Your core thesis — one paragraph, written as you\'d say it at your sharpest and most direct. The north star everything references.' },
              { title: 'ICP Profiles', desc: 'Specific buyer personas with their language, problems, scepticisms, and success criteria. Referenced in every content generation.' },
              { title: 'Departmental Matrix', desc: 'How your message adapts for CTO, CUO, CFO, CEO, Head of Distribution. Stops you saying different things to different people.' },
              { title: 'Brand Voice Rules', desc: 'Not adjectives. Specific writing rules with examples. "Lead with the implication, not the event." "No sentences longer than 25 words."' },
              { title: 'Competitive Positioning', desc: 'Named competitors, how you differ from each, and the specific claim you can make in a head-to-head conversation.' },
              { title: 'Off-Limits', desc: 'What you should never say. Common clichés in your segment. Language your competitors overuse that you should actively avoid.' },
            ].map((section) => (
              <div key={section.title} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 sm:p-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{section.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{section.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
            >
              Build yours free <ArrowRight size={16} />
            </Link>
            <p className="text-xs text-[var(--text-secondary)] mt-3">Takes ~5 minutes. Delivered as a branded PDF.</p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="fade-section py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Built for B2B insurtechs
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              2&ndash;150 people. Pre-seed to Series B. Selling to insurers, brokers, MGAs, reinsurers, capacity providers, or Lloyd&apos;s syndicates.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                badge: 'Primary buyer',
                title: 'Founder / Head of Commercial',
                desc: 'You know the product is good. You can\u2019t translate that into consistent market presence. You\u2019re not a marketer and you don\u2019t have time to become one. You need the right people to see you as the smartest company in your segment.',
              },
              {
                badge: 'Operator',
                title: 'Junior Marketing Hire',
                desc: 'You\u2019re approving drafts, scheduling content, and reporting back. Monitus gives you the strategic foundation and market intelligence you need to produce work that actually connects to commercial goals.',
              },
              {
                badge: 'The outcome',
                title: 'Market Credibility at Scale',
                desc: 'The right people \u2014 insurers, brokers, MGAs, capacity providers \u2014 see your company consistently saying smart, specific, non-obvious things. Over time that reputation opens doors before the sales team even knocks.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8"
              >
                <span className="inline-block text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full px-3 py-1 mb-4">
                  {item.badge}
                </span>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content formats */}
      <section className="fade-section py-20 bg-[var(--navy-light)]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
              Three formats, simultaneously
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto">
              Same voice, same narrative &mdash; different register, different length, different structure.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Linkedin,
                color: '#0A66C2',
                title: 'LinkedIn Post',
                desc: 'Written in the founder\u2019s personal voice. First person. Opinion-led. Opens with the contrarian angle, not the news summary. 150\u2013200 words. No hashtags. No promotional language.',
              },
              {
                icon: Mail,
                color: 'var(--accent)',
                title: 'Email',
                desc: 'More considered, more detailed. Includes a natural reason to reply \u2014 not "book a demo" but a genuine conversation opener tied to the specific story. Works as standalone outreach or newsletter section.',
              },
              {
                icon: Megaphone,
                color: '#F97316',
                title: 'Trade Media Pitch',
                desc: 'A complete pitch package: hook, target publication, suggested headline, story angle, attributed senior quote, supporting context. A PR agency can use it directly without a briefing call.',
              },
            ].map((format) => (
              <div key={format.title} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `color-mix(in srgb, ${format.color} 15%, transparent)` }}
                >
                  <format.icon size={20} style={{ color: format.color }} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{format.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{format.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Briefing builder callout */}
      <section className="fade-section py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[var(--accent)]/10 to-[#8B5CF6]/10 border border-[var(--accent)]/20 rounded-2xl p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-[var(--accent)]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full px-3 py-1 mb-3 inline-block">
                  Intelligence tier
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">
                  The Briefing Builder
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  Generate market briefing documents ahead of investor conversations, partnership discussions, enterprise sales pitches, or conference appearances. Input who you&apos;re meeting and the agenda &mdash; get a 3&ndash;4 page branded PDF with executive summary, market developments, competitive landscape, and outlook.
                </p>
                <p className="text-xs text-[var(--text-secondary)]/70 italic">
                  The highest-value single output in the platform &mdash; the feature most likely to generate a &ldquo;this paid for itself&rdquo; moment within the first month.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance engine */}
      <section className="fade-section py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-2xl p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--success)]/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={24} className="text-[var(--success)]" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">
                  Built-in compliance checking
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  Every piece of content is automatically checked against regulatory frameworks before it reaches you. Not a generic disclaimer &mdash; real rule-based checks designed for insurance market communications.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['FCA (COBS 4.2 & Consumer Duty)', 'Solvency II', 'GDPR', 'TCFD', 'NAIC', 'FTC'].map((fw) => (
                    <span key={fw} className="text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded-full px-3 py-1">
                      {fw}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)]/70 italic mt-4">
                  Checks include fair &amp; balanced presentation, greenwashing detection, prudential language requirements, and PII scanning. Advisory, not legal advice &mdash; but it catches what most teams miss.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* See it in action */}
      <section className="fade-section py-24 bg-[var(--navy-light)]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              See it in action
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              From live market signals to published content in minutes. Here is what you see when you open the app.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Market Radar',
                desc: 'Live insurance trade press articles, filtered by source and category, with relevance scoring against your Narrative.',
                icon: Radar,
                color: '#7DC4BD',
                features: ['FCA, Insurance Times, Reinsurance News', 'Cyber, ILS, UK Market filters', 'Relevance: High / Medium / Low'],
              },
              {
                title: 'Content Pipeline',
                desc: 'Select articles, choose formats, generate branded content. Four-step workflow: Monitor, Analyse, Draft, Review.',
                icon: PenTool,
                color: '#3AAF7C',
                features: ['Monitor \u2192 Analyse \u2192 Draft \u2192 Review', 'LinkedIn, Email, Trade Media', 'Compliance-checked before delivery'],
              },
              {
                title: 'Your Narrative',
                desc: 'The strategic document that powers everything. Executive summary, ICP profiles, voice rules, competitive positioning.',
                icon: BookOpen,
                color: '#4A9E96',
                features: ['AI-generated from interview', 'Copy, Download, Export PDF', 'Regenerate as your positioning evolves'],
              },
              {
                title: 'Briefing Builder',
                desc: 'Select articles, add context, generate boardroom-ready briefing documents for investors, partners, or sales meetings.',
                icon: FileText,
                color: '#8B5CF6',
                features: ['5-step guided workflow', 'Category filtering (Cyber, ILS, Reinsurance)', 'Branded PDF export'],
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-[var(--navy)] border border-[var(--border)] rounded-2xl overflow-hidden">
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                        <Icon size={18} style={{ color: item.color }} />
                      </div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{item.desc}</p>
                    <div className="space-y-1.5">
                      {item.features.map((f) => (
                        <div key={f} className="flex items-center gap-2">
                          <Check size={12} style={{ color: item.color }} className="flex-shrink-0" />
                          <span className="text-[11px] text-[var(--text-secondary)]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-1" style={{ background: item.color, opacity: 0.3 }} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What this is not */}
      <section className="fade-section py-16 bg-[var(--navy-light)]/20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-8">
            What this is not
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { not: 'A social media scheduler', alt: 'Buffer & Hootsuite do that' },
              { not: 'A generic AI writing tool', alt: 'ChatGPT & Jasper do that' },
              { not: 'A PR platform', alt: 'Cision & Muckrack do that' },
              { not: 'A market data terminal', alt: 'Insurance Insider does that' },
              { not: 'A CRM or sales tool', alt: 'HubSpot & Salesforce do that' },
              { not: 'Content without intelligence', alt: 'We sit in the gap between market intelligence and commercial execution' },
            ].map((item) => (
              <div key={item.not} className="flex items-start gap-3 p-4 bg-[var(--navy)] rounded-xl border border-[var(--border)]">
                <span className="text-red-400 text-sm mt-0.5 flex-shrink-0">&times;</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.not}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.alt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="fade-section py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Start with your free Narrative. The paid tiers unlock continuous monitoring, content generation, and intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: 'Free',
                price: 0,
                period: 'forever',
                desc: 'Your Narrative — the foundation',
                features: [
                  'Full onboarding interview',
                  'Complete Narrative',
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
                price: 500,
                period: '/month',
                desc: 'For founders managing their own LinkedIn',
                features: [
                  'Narrative',
                  'Weekly monitoring',
                  '3 LinkedIn drafts per week',
                  'Basic engagement tracking',
                  'Email support',
                ],
                accent: 'var(--accent)',
                popular: false,
                cta: 'Start 7-day trial',
              },
              {
                name: 'Growth',
                price: 1200,
                period: '/month',
                desc: 'For founder + junior marketing hire',
                features: [
                  'Everything in Starter',
                  'Daily monitoring',
                  'All 3 content formats',
                  'LinkedIn posting via API',
                  'Email export',
                  'Trade media pitches',
                  'Monthly intelligence report',
                  'Up to 3 users',
                ],
                accent: 'var(--accent)',
                popular: true,
                cta: 'Start 7-day trial',
              },
              {
                name: 'Intelligence',
                price: 2000,
                period: '/month',
                desc: 'For the full commercial team',
                features: [
                  'Everything in Growth',
                  'Competitor tracking & positioning',
                  'Weekly Priority View',
                  'Quarterly positioning review',
                  'Briefing builder',
                  'Departmental matrix updates',
                  'Unlimited users',
                ],
                accent: 'var(--success)',
                popular: false,
                cta: 'Start 7-day trial',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-[var(--navy-light)] border rounded-xl p-6 flex flex-col ${
                  plan.popular
                    ? 'pricing-card-popular border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
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
                    {plan.price === 0 ? (
                      <span className="text-3xl font-extrabold text-[var(--text-primary)]">&pound;0</span>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                          &pound;{plan.price.toLocaleString()}
                        </span>
                        <span className="text-[var(--text-secondary)] text-sm">{plan.period}</span>
                      </>
                    )}
                  </div>
                  {plan.price === 0 && (
                    <p className="text-xs text-[var(--success)] mt-1 font-medium">{plan.period}</p>
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
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="fade-section py-24 bg-[var(--navy-light)]/40">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Every week without this is a week your competitors are the ones saying something
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
            Start with your free Narrative. See a real piece of content generated from live market intelligence, in your voice, before you decide on a plan.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-7 py-3.5 rounded-lg transition-colors text-base"
            >
              Start with your free Narrative <ArrowRight size={18} />
            </Link>
          </div>

          <p className="text-xs text-[var(--text-secondary)]/60 mt-4">
            No credit card. No commitment. Your Narrative is yours to keep.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Monitus</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Monitus. The AI Growth Manager for Insurtechs.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              About
            </Link>
            <Link href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Pricing
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
      </footer>
    </div>
  );
}
