'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

function getPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  if (passed <= 1) return { label: 'Weak', color: '#ef4444', width: 25, checks, passed };
  if (passed <= 2) return { label: 'Fair', color: '#f97316', width: 50, checks, passed };
  if (passed <= 3) return { label: 'Good', color: '#84cc16', width: 75, checks, passed };
  return { label: 'Strong', color: '#22c55e', width: 100, checks, passed };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register user
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, gdpr_consent: gdprConsent, gdpr_consent_at: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Create company profile
      const nicheMap: Record<string, string> = {
        insurtech: 'insurance technology',
        mga: 'specialty lines',
        broker: 'commercial insurance',
        insurer: 'insurance',
        reinsurer: 'reinsurance',
        carrier: 'insurance',
        other: 'insurance services',
      };
      // Set sensible default compliance frameworks based on company type
      const frameworkMap: Record<string, string[]> = {
        mga: ['FCA', 'GDPR'],
        broker: ['FCA', 'GDPR'],
        insurer: ['FCA', 'Solvency II', 'GDPR'],
        reinsurer: ['FCA', 'Solvency II', 'GDPR', 'TCFD'],
        carrier: ['State DOI', 'NAIC', 'GDPR'],
        insurtech: ['FCA', 'GDPR'],
        other: ['FCA', 'GDPR'],
      };

      const companyRes = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          type: companyType,
          brand_voice: 'professional',
          niche: nicheMap[companyType] || 'insurance',
          compliance_frameworks: frameworkMap[companyType] || ['FCA', 'GDPR'],
        }),
      });

      if (!companyRes.ok) {
        console.error('Company creation failed during registration');
        // Still proceed to dashboard — onboarding wizard will collect company info
        setError('Account created, but company setup failed. You can complete it in the dashboard.');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create your account</h2>
      <p className="text-[var(--text-secondary)] mb-8">Start with your free Narrative — takes about 5 minutes</p>

      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--navy)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </a>

      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-secondary)]">or</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Full name"
          placeholder="Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="email"
          label="Work email"
          type="email"
          placeholder="jane@yourcompany.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {password.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--navy)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${strength.width}%`, backgroundColor: strength.color }}
                  />
                </div>
                <span className="text-xs font-medium min-w-[48px] text-right" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { key: 'length', label: '8+ chars' },
                  { key: 'uppercase', label: 'Uppercase' },
                  { key: 'lowercase', label: 'Lowercase' },
                  { key: 'number', label: 'Number' },
                  { key: 'special', label: 'Special char' },
                ].map(({ key, label }) => (
                  <span
                    key={key}
                    className="text-[11px] flex items-center gap-1"
                    style={{ color: strength.checks[key as keyof typeof strength.checks] ? '#22c55e' : 'var(--text-secondary)' }}
                  >
                    {strength.checks[key as keyof typeof strength.checks] ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <Input
          id="company"
          label="Company name"
          placeholder="Acme Insurance"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Company type
          </label>
          <select
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            required
            className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          >
            <option value="" disabled>Select company type...</option>
            <option value="insurtech">Insurtech</option>
            <option value="mga">Managing General Agent (MGA)</option>
            <option value="broker">Insurance Broker</option>
            <option value="insurer">Insurer</option>
            <option value="reinsurer">Reinsurer</option>
            <option value="carrier">Carrier</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="gdpr-consent"
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            className="mt-1 rounded border-[var(--border)] bg-[var(--navy)] text-[var(--accent)] focus:ring-[var(--accent)]"
            required
          />
          <label htmlFor="gdpr-consent" className="text-xs text-[var(--text-secondary)] leading-relaxed">
            I agree to the{' '}
            <Link href="/terms" className="text-[var(--accent)] hover:underline" target="_blank">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-[var(--accent)] hover:underline" target="_blank">Privacy Policy</Link>,
            and consent to Monitus processing my data as described.
          </label>
        </div>

        {error && (
          <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg" disabled={!gdprConsent}>
          Create account
        </Button>

        <p className="text-xs text-[var(--text-secondary)] text-center mt-3">
          No credit card required. Your Narrative is free &mdash; forever.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
