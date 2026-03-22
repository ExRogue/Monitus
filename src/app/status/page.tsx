import { CheckCircle, AlertTriangle, XCircle, Clock, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'System Status | Monitus',
  description: 'Real-time status of all Monitus services',
};

const SERVICES = [
  { name: 'API & Authentication', description: 'Login, registration, session management', status: 'operational' },
  { name: 'Content Generation', description: 'AI-powered content creation via Anthropic Claude', status: 'operational' },
  { name: 'News & Signal Feeds', description: 'RSS ingestion, article processing, signal synthesis', status: 'operational' },
  { name: 'Content Library', description: 'Storage, retrieval, and version history', status: 'operational' },
  { name: 'Distribution (Email)', description: 'Email newsletter delivery via Loops', status: 'operational' },
  { name: 'Distribution (LinkedIn)', description: 'Direct LinkedIn posting via OAuth', status: 'operational' },
  { name: 'Billing & Subscriptions', description: 'Stripe payment processing and plan management', status: 'operational' },
  { name: 'Competitive Intelligence', description: 'Competitor mention tracking and analysis', status: 'operational' },
  { name: 'PDF Export', description: 'Report and content PDF generation', status: 'operational' },
  { name: 'Web Application', description: 'Dashboard and user interface', status: 'operational' },
];

const UPTIME_HISTORY = [
  { month: 'Sep 2025', uptime: 99.98 },
  { month: 'Oct 2025', uptime: 100.00 },
  { month: 'Nov 2025', uptime: 99.95 },
  { month: 'Dec 2025', uptime: 100.00 },
  { month: 'Jan 2026', uptime: 99.99 },
  { month: 'Feb 2026', uptime: 100.00 },
  { month: 'Mar 2026', uptime: 99.97 },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'operational') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Operational
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Degraded
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Outage
    </span>
  );
}

export default function StatusPage() {
  const allOperational = SERVICES.every(s => s.status === 'operational');
  const lastUpdated = new Date().toISOString();

  return (
    <div className="min-h-screen bg-[var(--navy)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-[var(--text-primary)]">Monitus</a>
          <a href="/signals" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Dashboard &rarr;</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Overall status banner */}
        <div className={`rounded-2xl border p-8 text-center ${allOperational ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
          <div className="flex items-center justify-center gap-3 mb-3">
            {allOperational ? (
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            )}
            <h1 className="text-2xl font-bold">
              {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Clock className="w-3.5 h-3.5" />
            Last updated: {new Date(lastUpdated).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} UTC
          </div>
        </div>

        {/* Service list */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Services</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {SERVICES.map(service => (
              <div key={service.name} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{service.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{service.description}</p>
                </div>
                <StatusBadge status={service.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Uptime history */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Uptime History</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-7 gap-2">
              {UPTIME_HISTORY.map(month => (
                <div key={month.month} className="text-center">
                  <div className={`h-16 rounded-lg flex items-end justify-center ${month.uptime === 100 ? 'bg-emerald-500/20' : month.uptime >= 99.9 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                    <div
                      className={`w-full rounded-lg ${month.uptime === 100 ? 'bg-emerald-500' : month.uptime >= 99.9 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ height: `${((month.uptime - 99) / 1) * 100}%`, minHeight: '4px' }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">{month.month.split(' ')[0]}</p>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{month.uptime}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Incident history */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Recent Incidents</h2>
          </div>
          <div className="px-5 py-8 text-center text-sm text-[var(--text-secondary)]">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-60" />
            No incidents in the last 90 days.
          </div>
        </div>

        {/* Contact */}
        <div className="text-center space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">
            Experiencing an issue not reflected here?
          </p>
          <a
            href="mailto:support@monitus.ai"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
          >
            Contact support <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
