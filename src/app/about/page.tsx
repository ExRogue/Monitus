import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Monitus',
  description: 'Monitus is the AI Growth Manager for insurtechs. Built in London for the London Market.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--navy)]">
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
          The AI Growth Manager for Insurtechs
        </h1>
        <p className="text-lg text-[var(--accent)] font-medium mb-12">
          Turn insurance market signals into credibility and pipeline.
        </p>

        <div className="space-y-12 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Why Monitus exists</h2>
            <p className="mb-4">
              Most insurtech companies struggle with market presence, not product quality. Founders know their product
              is strong but struggle to explain why it matters to the market. Marketing output is sporadic, generic,
              or disconnected from commercial goals. Competitors appear more credible simply because they show up
              more often.
            </p>
            <p className="mb-4">
              Insurance buyers are highly experienced market participants who recognise shallow or generic messaging
              instantly. The result: strong products lose attention, credibility, and momentum to companies with
              better narrative and presence.
            </p>
            <p>
              Monitus solves this by acting as an AI Growth Manager. It watches the market continuously, identifies
              the signals that matter, and turns them into opportunities for insurtechs to demonstrate insight and
              credibility. The outcome is consistent market presence built on real industry insight rather than
              marketing noise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">What Monitus is not</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'A social media scheduler',
                'A generic AI writing tool',
                'A PR platform',
                'A market data terminal',
                'A CRM or sales engagement tool',
                'A marketing agency in software form',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-red-400">&times;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">
              Monitus sits in a new category: <strong className="text-[var(--text-primary)]">Growth Intelligence</strong>.
              It connects market awareness with commercial execution &mdash; turning industry developments into
              opportunities for companies to demonstrate expertise, build credibility, and support pipeline growth.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Who we built this for</h2>
            <p className="mb-4">
              B2B insurtechs with 2&ndash;150 employees. Pre-seed to Series B. Selling to insurers, reinsurers,
              brokers, MGAs, capacity providers, or Lloyd&apos;s syndicates. Companies that have a strong product,
              domain expertise, and commercial ambition &mdash; but lack a strategic marketing function, time to
              track industry developments, or consistent market presence.
            </p>
            <p>
              The primary buyer is the founder or commercial leader who knows the product is good but cannot
              consistently articulate why it matters to buyers &mdash; and who watches competitors with weaker
              products look more credible because they show up more often.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Built in London for the London Market</h2>
            <p>
              Monitus is built by people who understand the insurance market. The news monitoring covers
              Insurance Times, The Insurer, Post Magazine, FCA regulatory feeds, and specialist reinsurance and
              ILS sources. The voice and language are calibrated for insurance industry audiences &mdash; not
              generic corporate copy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">The team</h2>
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Steven Kong</h3>
              <p className="text-sm text-[var(--accent)] mb-3">Founder</p>
              <p className="text-sm">
                Background in digital commerce and user experience. Building Monitus to solve the market presence
                gap that holds back insurtechs with genuinely strong products.
              </p>
            </div>
          </section>

          <section className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8 text-center">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Start with your free Narrative
            </h3>
            <p className="text-sm mb-6">
              A structured AI conversation that extracts your genuine positioning. Takes about 5 minutes.
              Delivered as a branded PDF you can share with investors, new hires, or a PR agency.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
            >
              Build yours free <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Monitus. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link href="/contact" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact</Link>
            <Link href="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
