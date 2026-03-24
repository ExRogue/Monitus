export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--navy)] flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--navy-light)] to-[var(--navy)] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--accent)] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--purple)] rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-[var(--text-primary)]">Monitus</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Build market credibility without a marketing team
          </h1>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
            Growth intelligence for specialist insurtechs. Monitor your market, define your narrative, produce channel-specific content, and learn what&apos;s working &mdash; so the right buyers see you consistently saying smart things about their world.
          </p>
          <div className="space-y-3 mb-8">
            {[
              'Free Narrative — your positioning foundation',
              'LinkedIn, email, and trade media drafts in your voice',
              'Market monitoring across insurance trade press',
              'Intelligence reports that sharpen your positioning over time',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-[var(--text-secondary)]">{item}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-[var(--accent)]">3</p>
              <p className="text-xs text-[var(--text-secondary)]">AI Agents</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--purple)]">62+</p>
              <p className="text-xs text-[var(--text-secondary)]">Sources</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--success)]">6</p>
              <p className="text-xs text-[var(--text-secondary)]">Content Formats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}
