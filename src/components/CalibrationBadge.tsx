'use client';
import { useState } from 'react';
import { Target, Info } from 'lucide-react';

export default function CalibrationBadge() {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
      >
        <Target className="w-3 h-3" />
        Calibration Draft
        <Info className="w-3 h-3 opacity-60" />
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--navy)] border border-[var(--border)] rounded-lg shadow-xl">
          <p className="text-xs text-[var(--text-primary)] font-medium mb-1">Calibration Draft</p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            This is a calibration draft. Edit it to teach the AI your preferred style. After 3 drafts, your voice profile will be established.
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-[var(--navy)] border-r border-b border-[var(--border)] rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
