'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
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
    <div className="min-h-screen bg-[var(--navy)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Reset your password
          </h1>

          {submitted ? (
            <div>
              <p className="text-[var(--text-secondary)] mb-4">
                If an account with that email exists, we have sent a password reset link. Check your inbox.
              </p>
              <a href="/login" className="text-[var(--accent)] hover:underline text-sm">
                Back to login
              </a>
            </div>
          ) : (
            <>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">
                Enter your email address and we will send you a link to reset your password.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    placeholder="you@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                Remember your password?{' '}
                <a href="/login" className="text-[var(--accent)] hover:underline">Log in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
