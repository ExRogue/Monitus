'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch current user email on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.email) {
          setEmail(data.user.email);
          // If already verified, redirect to dashboard
          if (data.user.email_verified) {
            router.push('/dashboard');
          }
        } else {
          // Not logged in
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const submitCode = useCallback(async (digits: string[]) => {
    const fullCode = digits.join('');
    if (fullCode.length !== 6 || !/^\d{6}$/.test(fullCode)) return;

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });
      const data = await res.json();

      if (res.ok && (data.success || data.alreadyVerified)) {
        router.push('/dashboard');
        return;
      }

      setError(data.error || 'Verification failed. Please try again.');
      // Clear code on error
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newCode.every((d) => d !== '')) {
      submitCode(newCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);

    // Focus the next empty input or last
    const nextEmpty = newCode.findIndex((d) => !d);
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();

    // Auto-submit if full code pasted
    if (pasted.length === 6) {
      submitCode(newCode);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'PUT' });
      const data = await res.json();

      if (res.ok) {
        setResendCooldown(60);
        setCode(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        if (data.alreadyVerified) {
          router.push('/dashboard');
          return;
        }
        setError(data.error || 'Failed to resend code.');
        if (data.waitSeconds) {
          setResendCooldown(data.waitSeconds);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, domain) => start + '*'.repeat(Math.min(middle.length, 6)) + domain)
    : '';

  return (
    <div className="w-full max-w-md">
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-xl font-bold text-[var(--text-primary)]">Monitus</span>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--purple)]/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center">
        Check your email
      </h2>
      <p className="text-[var(--text-secondary)] mb-8 text-center">
        We sent a verification code to{' '}
        <span className="text-[var(--text-primary)] font-medium">{maskedEmail || 'your email'}</span>
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 text-center">
          Enter your 6-digit code
        </label>
        <div className="flex justify-center gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={code[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={loading}
              className={`w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 bg-[var(--navy)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all ${
                error ? 'border-red-500/50' : 'border-[var(--border)]'
              } ${loading ? 'opacity-50' : ''}`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-4 text-center">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 mb-4 text-sm text-[var(--text-secondary)]">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verifying...
        </div>
      )}

      <div className="text-center space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Didn&apos;t receive a code?{' '}
          {resendCooldown > 0 ? (
            <span className="text-[var(--text-secondary)]">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-[var(--accent)] hover:underline font-medium disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </p>

        <p className="text-sm text-[var(--text-secondary)]">
          Wrong email?{' '}
          <Link href="/register" className="text-[var(--accent)] hover:underline font-medium">
            Go back
          </Link>
        </p>
      </div>
    </div>
  );
}
