'use client';

function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const html: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<hr class="my-4 border-[var(--border)]" />');
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3 class="text-base font-semibold text-[var(--text-primary)] mt-5 mb-2">${escapeAndFormat(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2 class="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2">${escapeAndFormat(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1 class="text-xl font-bold text-[var(--text-primary)] mt-6 mb-3">${escapeAndFormat(line.slice(2))}</h1>`);
      continue;
    }

    // Unordered list items
    if (/^[\-\*]\s/.test(line.trim())) {
      if (!inList) { html.push('<ul class="list-disc list-inside space-y-1 my-2">'); inList = true; }
      html.push(`<li>${escapeAndFormat(line.trim().slice(2))}</li>`);
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s/.test(line.trim())) {
      // Close unordered list if open
      if (inList) { html.push('</ul>'); inList = false; }
      const content = line.trim().replace(/^\d+\.\s/, '');
      html.push(`<p class="ml-4 my-0.5">${escapeAndFormat(line.trim().match(/^\d+\./)?.[0] || '')} ${escapeAndFormat(content)}</p>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<div class="h-3"></div>');
      continue;
    }

    // Regular paragraph
    if (inList) { html.push('</ul>'); inList = false; }
    html.push(`<p class="my-1">${escapeAndFormat(line)}</p>`);
  }

  if (inList) html.push('</ul>');
  return html.join('\n');
}

function escapeAndFormat(text: string): string {
  // Escape HTML entities first
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>');

  // Italic: *text* (but not inside bold)
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  return s;
}

export default function SimpleMarkdown({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
