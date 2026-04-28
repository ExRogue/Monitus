'use client';

interface TrendBucket {
  date: string;
  company: number;
  product: number;
  founder: number;
  total: number;
}

interface Props {
  buckets: TrendBucket[];
  currentTotal: number;
  priorTotal: number;
  deltaPct: number | null;
  byType: { company: number; product: number; founder: number };
}

const SERIES = [
  { key: 'company' as const, label: 'Company', color: '#10b981' },
  { key: 'product' as const, label: 'Product', color: '#fbbf24' },
  { key: 'founder' as const, label: 'Founder', color: '#a78bfa' },
];

/**
 * Stacked-area trend chart for Story Saturation > Your Coverage.
 * Three series (company / product / founder), one path each, plotted in an
 * SVG so we don't pay the cost of pulling a chart lib for one chart.
 */
export default function CoverageTrendChart({
  buckets, currentTotal, priorTotal, deltaPct, byType,
}: Props) {
  const hasData = buckets.length > 0 && currentTotal > 0;
  const max = Math.max(1, ...buckets.map(b => b.total));

  const viewW = 800;
  const viewH = 160;
  const padX = 8;
  const padY = 12;
  const innerW = viewW - padX * 2;
  const innerH = viewH - padY * 2;
  const stepX = buckets.length > 1 ? innerW / (buckets.length - 1) : innerW;

  const pathFor = (key: 'company' | 'product' | 'founder') => {
    if (buckets.length === 0) return '';
    return buckets.map((b, i) => {
      const x = padX + i * stepX;
      const y = padY + innerH - (b[key] / max) * innerH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const deltaText =
    deltaPct === null ? 'new this period'
    : deltaPct > 0 ? `+${deltaPct}% vs prior`
    : deltaPct < 0 ? `${deltaPct}% vs prior`
    : 'no change';
  const deltaColor =
    deltaPct === null || deltaPct === 0 ? 'text-[var(--text-secondary)]'
    : deltaPct > 0 ? 'text-emerald-400'
    : 'text-red-400';

  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Coverage trend</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Mentions in monitored sources, segmented by trigger type.
          </p>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">{currentTotal}</p>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mt-1">current</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${deltaColor}`}>{deltaText}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">prior: {priorTotal}</p>
          </div>
        </div>
      </div>

      {/* Legend with per-type totals */}
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        {SERIES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
            <span className="text-[var(--text-primary)] font-semibold ml-0.5">{byType[s.key]}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        {hasData ? (
          <svg
            viewBox={`0 0 ${viewW} ${viewH}`}
            className="w-full h-32"
            preserveAspectRatio="none"
            aria-label="Coverage trend over time"
          >
            {/* Grid baseline */}
            <line x1={padX} y1={viewH - padY} x2={viewW - padX} y2={viewH - padY}
              stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
            {SERIES.map(s => (
              <path
                key={s.key}
                d={pathFor(s.key)}
                fill="none"
                stroke={s.color}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-[var(--text-secondary)]">
            No matching coverage in this period.
          </div>
        )}
      </div>

      {/* Date axis labels (first / middle / last) */}
      {hasData && (
        <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1 px-2">
          <span>{formatBucketDate(buckets[0].date)}</span>
          <span>{formatBucketDate(buckets[Math.floor(buckets.length / 2)].date)}</span>
          <span>{formatBucketDate(buckets[buckets.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}

function formatBucketDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
