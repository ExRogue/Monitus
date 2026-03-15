'use client';

import React, { useState, useMemo } from 'react';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

function tokenize(text: string): string[] {
  // Split by word boundaries, preserving whitespace and newlines
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

function computeDiff(oldTokens: string[], newTokens: string[]): DiffToken[] {
  const m = oldTokens.length;
  const n = newTokens.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffToken[] = [];
  let i = m;
  let j = n;

  const stack: DiffToken[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      stack.push({ type: 'unchanged', value: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', value: newTokens[j - 1] });
      j--;
    } else {
      stack.push({ type: 'removed', value: oldTokens[i - 1] });
      i--;
    }
  }

  // Reverse since we built it backwards
  for (let k = stack.length - 1; k >= 0; k--) {
    result.push(stack[k]);
  }

  return result;
}

function DiffInline({ diff }: { diff: DiffToken[] }) {
  return (
    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 overflow-auto">
      {diff.map((token, i) => {
        if (token.type === 'added') {
          return (
            <span key={i} className="bg-green-900/30 text-green-400">
              {token.value}
            </span>
          );
        }
        if (token.type === 'removed') {
          return (
            <span key={i} className="bg-red-900/30 text-red-400 line-through">
              {token.value}
            </span>
          );
        }
        return <span key={i}>{token.value}</span>;
      })}
    </pre>
  );
}

function DiffSideBySide({ diff }: { diff: DiffToken[] }) {
  // Build left (old) and right (new) lines
  const leftTokens: DiffToken[] = [];
  const rightTokens: DiffToken[] = [];

  for (const token of diff) {
    if (token.type === 'unchanged') {
      leftTokens.push(token);
      rightTokens.push(token);
    } else if (token.type === 'removed') {
      leftTokens.push(token);
    } else {
      rightTokens.push(token);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <div className="text-xs uppercase tracking-wider text-red-400 mb-1 px-4 font-semibold">Old</div>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 overflow-auto border-r border-[var(--border)]">
          {leftTokens.map((token, i) => {
            if (token.type === 'removed') {
              return (
                <span key={i} className="bg-red-900/30 text-red-400">
                  {token.value}
                </span>
              );
            }
            return <span key={i}>{token.value}</span>;
          })}
        </pre>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-green-400 mb-1 px-4 font-semibold">New</div>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 overflow-auto">
          {rightTokens.map((token, i) => {
            if (token.type === 'added') {
              return (
                <span key={i} className="bg-green-900/30 text-green-400">
                  {token.value}
                </span>
              );
            }
            return <span key={i}>{token.value}</span>;
          })}
        </pre>
      </div>
    </div>
  );
}

export default function DiffView({ oldText, newText }: DiffViewProps) {
  const [viewMode, setViewMode] = useState<'inline' | 'side-by-side'>('inline');

  const diff = useMemo(() => {
    const oldTokens = tokenize(oldText);
    const newTokens = tokenize(newText);
    return computeDiff(oldTokens, newTokens);
  }, [oldText, newText]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setViewMode('inline')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            viewMode === 'inline'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--navy-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Inline
        </button>
        <button
          onClick={() => setViewMode('side-by-side')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            viewMode === 'side-by-side'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--navy-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Side by Side
        </button>
      </div>
      <div className="bg-[var(--navy-light)] rounded-lg border border-[var(--border)] overflow-hidden">
        {viewMode === 'inline' ? <DiffInline diff={diff} /> : <DiffSideBySide diff={diff} />}
      </div>
    </div>
  );
}
