'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('mga');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register user
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Create company profile
      await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          type: companyType,
          brand_voice: '',
          niche: companyType === 'insurtech' ? 'insurance technology' : companyType === 'mga' ? 'specialty lines' : companyType === 'broker' ? 'commercial insurance' : companyType === 'capacity_provider' ? 'capacity provision' : 'insurance',
          compliance_frameworks: ['FCA', 'GDPR'],
        }),
      });

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
        <span className="text-xl font-bold text-[var(--text-primary)]">Telum</span>
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create your account</h2>
      <p className="text-[var(--text-secondary)] mb-8">Start with your free Messaging Bible — takes about 5 minutes</p>

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
            className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          >
            <option value="insurtech">Insurtech</option>
            <option value="mga">Managing General Agent (MGA)</option>
            <option value="broker">Insurance Broker</option>
            <option value="capacity_provider">Capacity Provider</option>
            <option value="other">Other Insurance</option>
          </select>
        </div>

        {error && (
          <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>

        <p className="text-xs text-[var(--text-secondary)] text-center mt-3">
          No credit card required. Your Messaging Bible is free &mdash; forever.
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
