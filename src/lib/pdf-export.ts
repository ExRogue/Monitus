// Dynamic import to avoid SSR issues — jsPDF accesses browser globals at import time
let jsPDFModule: typeof import('jspdf') | null = null;
async function getJsPDF() {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.jsPDF;
}

export interface BrandingOptions {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  company_name?: string;
}

interface ExportToPdfOptions {
  title: string;
  subtitle?: string;
  content: string;
  companyName: string;
  date?: string;
  filename?: string;
  branding?: BrandingOptions;
}

// Default Monitus brand colors
const DEFAULT_PRIMARY = '#4A9E96';
const DEFAULT_ACCENT = '#3AAF7C';

const NAVY = '#0a1628';
const DARK_GRAY = '#1a2744';
const MEDIUM_GRAY = '#6b7280';
const LIGHT_GRAY = '#9ca3af';
const WHITE = '#ffffff';
const BLACK = '#111827';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const MARGIN_BOTTOM = 25;
const HEADER_HEIGHT = 18;
const FOOTER_HEIGHT = 15;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addHeader(
  doc: any,
  companyName: string,
  title: string,
  logoData: string | null,
  primaryColor: string,
) {
  const pc = hexToRgb(primaryColor);
  doc.setFillColor(NAVY);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  let textStartX = MARGIN_LEFT;

  // Logo in header (small, top-left)
  if (logoData) {
    try {
      const logoHeight = 10;
      const logoWidth = 10;
      const logoY = (HEADER_HEIGHT - logoHeight) / 2;
      doc.addImage(logoData, 'AUTO', MARGIN_LEFT, logoY, logoWidth, logoHeight);
      textStartX = MARGIN_LEFT + logoWidth + 3;
    } catch {
      // Logo failed to render, continue without it
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(WHITE);
  doc.text(companyName.toUpperCase(), textStartX, 11.5);

  // Report title on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(LIGHT_GRAY);
  const headerTitle = title.length > 50 ? title.slice(0, 47) + '...' : title;
  doc.text(headerTitle, PAGE_WIDTH - MARGIN_RIGHT, 11.5, { align: 'right' });
}

function addFooter(
  doc: any,
  companyName: string,
  date: string,
  pageNum: number,
  totalPages: number,
  primaryColor: string,
) {
  const y = PAGE_HEIGHT - 10;
  const pc = hexToRgb(primaryColor);
  doc.setDrawColor(pc.r, pc.g, pc.b);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y - 5, PAGE_WIDTH - MARGIN_RIGHT, y - 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(MEDIUM_GRAY);
  doc.text(`${companyName} \u2022 Confidential`, MARGIN_LEFT, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' });
}

function ensureSpace(
  doc: any,
  currentY: number,
  needed: number,
  companyName: string,
  title: string,
  logoData: string | null,
  primaryColor: string,
): number {
  if (currentY + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    addHeader(doc, companyName, title, logoData, primaryColor);
    return HEADER_HEIGHT + 10;
  }
  return currentY;
}

interface ParsedLine {
  type: 'h1' | 'h2' | 'h3' | 'bullet' | 'paragraph' | 'blank';
  text: string;
}

function parseMarkdown(content: string): ParsedLine[] {
  const lines = content.split('\n');
  const result: ParsedLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') {
      result.push({ type: 'blank', text: '' });
      continue;
    }

    if (line.startsWith('### ')) {
      result.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      result.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      result.push({ type: 'h1', text: line.slice(2).trim() });
    } else if (/^\s*[-*]\s+/.test(line)) {
      result.push({ type: 'bullet', text: line.replace(/^\s*[-*]\s+/, '').trim() });
    } else {
      result.push({ type: 'paragraph', text: line.trim() });
    }
  }

  return result;
}

function renderTextWithBold(doc: any, text: string, x: number, y: number, maxWidth: number, fontSize: number, baseStyle: string): number {
  // Split text into bold and non-bold segments
  const segments: { text: string; bold: boolean }[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  if (segments.length === 0) {
    segments.push({ text, bold: false });
  }

  // Flatten to plain text for wrapping calculation
  const plainText = segments.map(s => s.text).join('');
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', baseStyle);
  const wrappedLines = doc.splitTextToSize(plainText, maxWidth) as string[];

  let currentY = y;

  for (const wrappedLine of wrappedLines) {
    let currentX = x;
    let remaining = wrappedLine;

    for (const segment of segments) {
      if (remaining.length === 0) break;

      const segText = segment.text;
      if (!segText) continue;

      // Consume up to the length of this segment from the current wrapped line
      const take = Math.min(segText.length, remaining.length);
      const consumed = remaining.slice(0, take);
      remaining = remaining.slice(take);

      if (consumed) {
        doc.setFont('helvetica', segment.bold ? 'bold' : baseStyle);
        doc.text(consumed, currentX, currentY);
        currentX += doc.getTextWidth(consumed);
      }

      // Remove consumed characters from the segment for subsequent lines
      segment.text = segText.slice(take);
    }

    currentY += fontSize * 0.45;
  }

  return currentY;
}

export async function exportToPdf(options: ExportToPdfOptions): Promise<Blob> {
  const { title, subtitle, content, companyName, date, filename, branding } = options;
  const displayDate = date || new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Resolve branding
  const hasBranding = branding && (branding.logo_url || branding.primary_color);
  const primaryColor = branding?.primary_color || DEFAULT_PRIMARY;
  const accentColor = branding?.accent_color || DEFAULT_ACCENT;
  const displayCompanyName = branding?.company_name || companyName || 'Monitus';
  const logoUrl = branding?.logo_url || '';

  // Load logo if available
  let logoData: string | null = null;
  if (logoUrl) {
    logoData = await loadImageAsBase64(logoUrl);
  }

  const JsPDF = await getJsPDF();
  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pc = hexToRgb(primaryColor);
  const ac = hexToRgb(accentColor);

  // --- Cover Page ---
  // Full navy background for cover
  doc.setFillColor(NAVY);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let y = 60;

  // Company logo on cover (centered, larger)
  if (logoData) {
    try {
      const logoWidth = 40;
      const logoHeight = 40;
      const logoX = (PAGE_WIDTH - logoWidth) / 2;
      doc.addImage(logoData, 'AUTO', logoX, y, logoWidth, logoHeight);
      y += logoHeight + 15;
    } catch {
      // Logo failed, continue
      y += 10;
    }
  } else {
    // No logo — show company name large
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(WHITE);
    const nameLines = doc.splitTextToSize(displayCompanyName, CONTENT_WIDTH) as string[];
    for (const line of nameLines) {
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' });
      y += 12;
    }
    y += 10;
  }

  // Accent line under logo/name
  doc.setFillColor(pc.r, pc.g, pc.b);
  doc.rect(PAGE_WIDTH / 2 - 25, y, 50, 1.5, 'F');
  y += 15;

  // Report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(WHITE);
  const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH - 20) as string[];
  for (const line of titleLines) {
    doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 10;
  }
  y += 6;

  // Subtitle
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(LIGHT_GRAY);
    const subLines = doc.splitTextToSize(subtitle, CONTENT_WIDTH - 20) as string[];
    for (const line of subLines) {
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' });
      y += 6;
    }
    y += 4;
  }

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(MEDIUM_GRAY);
  doc.text(displayDate, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;

  // Prepared for company
  doc.setFontSize(10);
  doc.setTextColor(MEDIUM_GRAY);
  doc.text(`Prepared for ${displayCompanyName}`, PAGE_WIDTH / 2, y, { align: 'center' });

  // "Powered by Monitus" footer on cover
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MEDIUM_GRAY);
  doc.text('Powered by Monitus', PAGE_WIDTH / 2, PAGE_HEIGHT - 20, { align: 'center' });

  // Confidential notice
  doc.setFontSize(7);
  doc.setTextColor(MEDIUM_GRAY);
  doc.text('CONFIDENTIAL', PAGE_WIDTH / 2, PAGE_HEIGHT - 14, { align: 'center' });

  // --- Content pages ---
  doc.addPage();
  addHeader(doc, displayCompanyName, title, logoData, primaryColor);
  y = HEADER_HEIGHT + 10;

  const parsed = parseMarkdown(content);
  let blankCount = 0;

  for (const line of parsed) {
    if (line.type === 'blank') {
      blankCount++;
      if (blankCount <= 2) {
        y += 3;
      }
      continue;
    }
    blankCount = 0;

    switch (line.type) {
      case 'h1': {
        y = ensureSpace(doc, y, 16, displayCompanyName, title, logoData, primaryColor);
        y += 6;
        doc.setFillColor(pc.r, pc.g, pc.b);
        doc.rect(MARGIN_LEFT, y - 4, 30, 1, 'F');
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(pc.r, pc.g, pc.b);
        const h1Lines = doc.splitTextToSize(line.text, CONTENT_WIDTH) as string[];
        for (const l of h1Lines) {
          y = ensureSpace(doc, y, 8, displayCompanyName, title, logoData, primaryColor);
          doc.text(l, MARGIN_LEFT, y);
          y += 7.5;
        }
        y += 4;
        break;
      }

      case 'h2': {
        y = ensureSpace(doc, y, 14, displayCompanyName, title, logoData, primaryColor);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(pc.r, pc.g, pc.b);
        const h2Lines = doc.splitTextToSize(line.text, CONTENT_WIDTH) as string[];
        for (const l of h2Lines) {
          y = ensureSpace(doc, y, 7, displayCompanyName, title, logoData, primaryColor);
          doc.text(l, MARGIN_LEFT, y);
          y += 6.5;
        }
        y += 3;
        break;
      }

      case 'h3': {
        y = ensureSpace(doc, y, 12, displayCompanyName, title, logoData, primaryColor);
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(DARK_GRAY);
        const h3Lines = doc.splitTextToSize(line.text, CONTENT_WIDTH) as string[];
        for (const l of h3Lines) {
          y = ensureSpace(doc, y, 6, displayCompanyName, title, logoData, primaryColor);
          doc.text(l, MARGIN_LEFT, y);
          y += 5.5;
        }
        y += 2;
        break;
      }

      case 'bullet': {
        const bulletIndent = 6;
        y = ensureSpace(doc, y, 6, displayCompanyName, title, logoData, primaryColor);
        doc.setFontSize(9.5);
        doc.setTextColor(BLACK);

        // Bullet character — use accent color
        doc.setFillColor(ac.r, ac.g, ac.b);
        doc.circle(MARGIN_LEFT + 2, y - 1.2, 1, 'F');

        // Text with inline bold support
        const bulletWidth = CONTENT_WIDTH - bulletIndent;
        y = renderTextWithBold(doc, line.text, MARGIN_LEFT + bulletIndent, y, bulletWidth, 9.5, 'normal');
        y += 1;
        break;
      }

      case 'paragraph': {
        y = ensureSpace(doc, y, 6, displayCompanyName, title, logoData, primaryColor);
        doc.setFontSize(9.5);
        doc.setTextColor(BLACK);
        y = renderTextWithBold(doc, line.text, MARGIN_LEFT, y, CONTENT_WIDTH, 9.5, 'normal');
        y += 2;
        break;
      }
    }
  }

  // --- Add footers to all pages except the cover page (page 1) ---
  const totalPages = doc.getNumberOfPages();
  const contentPages = totalPages - 1; // exclude cover page
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, displayCompanyName, displayDate, i - 1, contentPages, primaryColor);
  }

  // Generate blob
  const blob = doc.output('blob');
  return blob;
}

export async function downloadPdf(options: ExportToPdfOptions): Promise<void> {
  const blob = await exportToPdf(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = (options.filename || options.title)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  a.download = `${safeFilename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
