import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border border-[var(--border)] p-4">
            <Skeleton className="h-5 w-5 shrink-0" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-24 ml-auto" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
