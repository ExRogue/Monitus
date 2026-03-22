'use client';

import { useState, useEffect, useRef } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { downloadPdf, BrandingOptions } from '@/lib/pdf-export';

interface ExportPdfButtonProps {
  title: string;
  subtitle?: string;
  content: string;
  companyName: string;
  filename?: string;
  className?: string;
}

// Module-level branding cache shared across all ExportPdfButton instances
let cachedBranding: BrandingOptions | null = null;
let brandingFetchPromise: Promise<BrandingOptions | null> | null = null;

async function fetchBranding(): Promise<BrandingOptions | null> {
  // Return cached value if available
  if (cachedBranding) return cachedBranding;

  // Deduplicate concurrent fetches
  if (brandingFetchPromise) return brandingFetchPromise;

  brandingFetchPromise = (async () => {
    try {
      const res = await fetch('/api/company/branding');
      if (!res.ok) return null;
      const data = await res.json();
      const b = data.branding;
      if (b) {
        cachedBranding = {
          logo_url: b.logo_url || '',
          primary_color: b.primary_color || '',
          secondary_color: b.secondary_color || '',
          accent_color: b.accent_color || '',
        };
        return cachedBranding;
      }
      return null;
    } catch {
      return null;
    } finally {
      brandingFetchPromise = null;
    }
  })();

  return brandingFetchPromise;
}

// Also fetch company name from /api/company for the branding
let cachedCompanyName: string | null = null;
let companyNameFetchPromise: Promise<string | null> | null = null;

async function fetchCompanyName(): Promise<string | null> {
  if (cachedCompanyName) return cachedCompanyName;
  if (companyNameFetchPromise) return companyNameFetchPromise;

  companyNameFetchPromise = (async () => {
    try {
      const res = await fetch('/api/company');
      if (!res.ok) return null;
      const data = await res.json();
      const name = data.company?.name || null;
      if (name) {
        cachedCompanyName = name;
      }
      return name;
    } catch {
      return null;
    } finally {
      companyNameFetchPromise = null;
    }
  })();

  return companyNameFetchPromise;
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
  const [branding, setBranding] = useState<BrandingOptions | null>(cachedBranding);
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(companyName || '');
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch branding and company name in parallel
    Promise.all([fetchBranding(), fetchCompanyName()]).then(([b, name]) => {
      if (b) setBranding(b);
      if (name) setResolvedCompanyName(name);
    });
  }, []);

  const handleExport = async () => {
    if (loading || !content) return;
    setLoading(true);
    try {
      // Merge branding with company name
      const brandingWithName: BrandingOptions | undefined = branding
        ? { ...branding, company_name: resolvedCompanyName || companyName }
        : resolvedCompanyName
          ? { company_name: resolvedCompanyName }
          : undefined;

      await downloadPdf({
        title,
        subtitle,
        content,
        companyName: resolvedCompanyName || companyName,
        filename,
        branding: brandingWithName,
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
