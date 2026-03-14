'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { downloadPdf } from '@/lib/pdf-export';

interface ExportPdfButtonProps {
  title: string;
  subtitle?: string;
  content: string;
  companyName: string;
  filename?: string;
  className?: string;
}

export default function ExportPdfButton({
  title,
  subtitle,
  content,
  companyName,
  filename,
  className,
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading || !content) return;
    setLoading(true);
    try {
      await downloadPdf({
        title,
        subtitle,
        content,
        companyName,
        filename,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading || !content}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        bg-[var(--navy-light)] border-[var(--border)] text-[var(--text-primary)]
        hover:bg-[var(--navy-lighter)] hover:border-[var(--accent)]/30
        ${className || ''}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {loading ? 'Exporting...' : 'Export PDF'}
    </button>
  );
}
