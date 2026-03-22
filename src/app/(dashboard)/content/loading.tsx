export default function ContentLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-[var(--navy-lighter)]" />
          <div className="h-4 w-64 rounded-lg bg-[var(--navy-lighter)]" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-[var(--navy-lighter)]" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-t-lg bg-[var(--navy-lighter)]" />
        ))}
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-5 w-3/4 rounded bg-[var(--navy-lighter)]" />
              <div className="h-5 w-16 rounded-full bg-[var(--navy-lighter)]" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-[var(--navy-lighter)]" />
              <div className="h-3 w-5/6 rounded bg-[var(--navy-lighter)]" />
              <div className="h-3 w-2/3 rounded bg-[var(--navy-lighter)]" />
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-20 rounded-full bg-[var(--navy-lighter)]" />
              <div className="h-5 w-20 rounded-full bg-[var(--navy-lighter)]" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
              <div className="h-8 flex-1 rounded-lg bg-[var(--navy-lighter)]" />
              <div className="h-8 flex-1 rounded-lg bg-[var(--navy-lighter)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
