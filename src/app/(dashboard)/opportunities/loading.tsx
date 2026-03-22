export default function OpportunitiesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--navy-lighter)]" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-[var(--navy-lighter)]" />
            <div className="h-4 w-64 rounded bg-[var(--navy-lighter)]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-20 rounded-lg bg-[var(--navy-lighter)]" />
          <div className="h-7 w-24 rounded-lg bg-[var(--navy-lighter)]" />
        </div>
      </div>

      {/* Stats strip skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] px-4 py-3 flex items-center gap-3"
          >
            <div className="w-4 h-4 rounded bg-[var(--navy-lighter)]" />
            <div className="space-y-1.5">
              <div className="h-3 w-14 rounded bg-[var(--navy-lighter)]" />
              <div className="h-5 w-6 rounded bg-[var(--navy-lighter)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-lg bg-[var(--navy-lighter)]" />
        ))}
      </div>

      {/* Opportunity card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] overflow-hidden"
        >
          <div className="p-5 space-y-3">
            {/* Top badge row */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-24 rounded-full bg-[var(--navy-lighter)]" />
              <div className="h-6 w-16 rounded-full bg-[var(--navy-lighter)]" />
              <div className="h-6 w-20 rounded-full bg-[var(--navy-lighter)]" />
              <div className="h-6 w-20 rounded-full bg-[var(--navy-lighter)]" />
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <div className="h-5 w-3/4 rounded bg-[var(--navy-lighter)]" />
              <div className="h-4 w-full rounded bg-[var(--navy-lighter)]" />
              <div className="h-4 w-5/6 rounded bg-[var(--navy-lighter)]" />
            </div>

            {/* Angle strip */}
            <div className="bg-[var(--navy)]/60 rounded-lg p-3 border border-[var(--border)] space-y-1.5">
              <div className="h-3 w-28 rounded bg-[var(--navy-lighter)]" />
              <div className="h-4 w-4/5 rounded bg-[var(--navy-lighter)]" />
              <div className="h-3 w-32 rounded bg-[var(--navy-lighter)]" />
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-[var(--navy-lighter)]" />
              <div className="h-3 w-20 rounded bg-[var(--navy-lighter)]" />
            </div>
          </div>

          {/* Action bar */}
          <div className="border-t border-[var(--border)] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-32 rounded-lg bg-[var(--navy-lighter)]" />
              <div className="h-7 w-28 rounded-lg bg-[var(--navy-lighter)]" />
            </div>
            <div className="h-7 w-24 rounded-lg bg-[var(--navy-lighter)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
