'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Mail, Linkedin, ArrowRight } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Get in touch</h1>
        <p className="text-[var(--text-secondary)] mb-10 leading-relaxed">
          Whether you want to discuss founding customer pricing, ask a question about the platform,
          or explore a partnership &mdash; we&apos;d like to hear from you.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Mail size={18} className="text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Email</h3>
            </div>
            <a href="mailto:hello@monitus.ai" className="text-sm text-[var(--accent)] hover:underline">
              hello@monitus.ai
            </a>
          </div>
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Linkedin size={18} className="text-[#0A66C2]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">LinkedIn</h3>
            </div>
            <a
              href="https://www.linkedin.com/company/monitus-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Follow Monitus
            </a>
          </div>
        </div>

        {sent ? (
          <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl p-8 text-center">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Message sent</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              We&apos;ll get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                placeholder="Tell us what you're looking for..."
              />
            </div>
            {error && (
              <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send message'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Monitus. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">About</Link>
            <Link href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link href="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
