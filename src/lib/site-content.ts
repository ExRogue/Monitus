import { sql } from '@vercel/postgres';
import { getDb } from './db';

// Default content for all editable sections of the site.
// When a key has no DB override, the default is used.
export const DEFAULTS: Record<string, { value: string; section: string; label: string; field_type: string }> = {
  // ── Hero ──
  'hero.badge': { value: 'Built for insurance distribution companies', section: 'hero', label: 'Badge text', field_type: 'text' },
  'hero.title': { value: 'Turn insurance news into', section: 'hero', label: 'Headline (before highlight)', field_type: 'text' },
  'hero.title_highlight': { value: 'client-ready content', section: 'hero', label: 'Headline (highlighted part)', field_type: 'text' },
  'hero.subtitle': { value: 'Monitus ingests live trade press and generates branded content across four formats — so your team publishes in minutes, not days.', section: 'hero', label: 'Subtitle', field_type: 'textarea' },
  'hero.cta_primary': { value: 'Start free', section: 'hero', label: 'Primary CTA button', field_type: 'text' },
  'hero.cta_secondary': { value: 'See how it works', section: 'hero', label: 'Secondary CTA button', field_type: 'text' },

  // ── Source bar ──
  'sources.label': { value: 'Aggregating from leading trade press', section: 'sources', label: 'Sources section label', field_type: 'text' },

  // ── Features ──
  'features.title': { value: 'Everything you need to publish with confidence', section: 'features', label: 'Section heading', field_type: 'text' },
  'features.subtitle': { value: 'From news aggregation to multi-format delivery — Monitus handles the full content pipeline for insurance distribution.', section: 'features', label: 'Section description', field_type: 'textarea' },
  'features.1.title': { value: 'Live News Ingestion', section: 'features', label: 'Feature 1 title', field_type: 'text' },
  'features.1.desc': { value: 'Aggregates from 6 insurance trade press sources in real-time — Insurance Journal, Reinsurance News, Artemis, Insurance Times, The Insurer, and Commercial Risk.', section: 'features', label: 'Feature 1 description', field_type: 'textarea' },
  'features.2.title': { value: 'AI Content Generation', section: 'features', label: 'Feature 2 title', field_type: 'text' },
  'features.2.desc': { value: 'One click transforms raw articles into polished newsletters, LinkedIn posts, podcast scripts, and client briefings in your brand voice.', section: 'features', label: 'Feature 2 description', field_type: 'textarea' },
  'features.3.title': { value: 'Brand Voice Engine', section: 'features', label: 'Feature 3 title', field_type: 'text' },
  'features.3.desc': { value: 'Every piece of content is generated in your brand voice with the right tone, terminology, and positioning for your audience.', section: 'features', label: 'Feature 3 description', field_type: 'textarea' },
  'features.4.title': { value: 'Multi-Format Output', section: 'features', label: 'Feature 4 title', field_type: 'text' },
  'features.4.desc': { value: 'Publish across every channel your clients use — from formal briefings to conversational social posts, all from the same source material.', section: 'features', label: 'Feature 4 description', field_type: 'textarea' },

  // ── How it works ──
  'steps.title': { value: 'Three steps to published content', section: 'steps', label: 'Section heading', field_type: 'text' },
  'steps.subtitle': { value: 'No more copy-pasting from trade press. No more back-and-forth.', section: 'steps', label: 'Section description', field_type: 'textarea' },
  'steps.1.title': { value: 'Select Articles', section: 'steps', label: 'Step 1 title', field_type: 'text' },
  'steps.1.desc': { value: 'Browse your live news feed from 6 insurance trade press sources. Pick the stories that matter to your clients.', section: 'steps', label: 'Step 1 description', field_type: 'textarea' },
  'steps.2.title': { value: 'Choose Formats', section: 'steps', label: 'Step 2 title', field_type: 'text' },
  'steps.2.desc': { value: 'Select which content types to generate — newsletters, LinkedIn posts, podcast scripts, or client briefings.', section: 'steps', label: 'Step 2 description', field_type: 'textarea' },
  'steps.3.title': { value: 'Publish with Confidence', section: 'steps', label: 'Step 3 title', field_type: 'text' },
  'steps.3.desc': { value: 'Review, edit, and distribute across LinkedIn, email, and more — all from one dashboard.', section: 'steps', label: 'Step 3 description', field_type: 'textarea' },

  // ── Who it's for ──
  'audience.title': { value: 'Built for insurance distribution', section: 'audience', label: 'Section heading', field_type: 'text' },
  'audience.1.badge': { value: 'Managing General Agents', section: 'audience', label: 'Audience 1 badge', field_type: 'text' },
  'audience.1.title': { value: 'MGAs', section: 'audience', label: 'Audience 1 title', field_type: 'text' },
  'audience.1.desc': { value: 'Generate thought leadership that positions your binding authority. Stay ahead of market trends with automated content from the specialist press.', section: 'audience', label: 'Audience 1 description', field_type: 'textarea' },
  'audience.2.badge': { value: 'Insurance Technology', section: 'audience', label: 'Audience 2 badge', field_type: 'text' },
  'audience.2.title': { value: 'Insurtechs', section: 'audience', label: 'Audience 2 title', field_type: 'text' },
  'audience.2.desc': { value: 'Keep your digital-first audience engaged with rapid-fire content. Turn market developments into social proof and product narratives.', section: 'audience', label: 'Audience 2 description', field_type: 'textarea' },
  'audience.3.badge': { value: 'Insurance Brokers', section: 'audience', label: 'Audience 3 badge', field_type: 'text' },
  'audience.3.title': { value: 'Brokers', section: 'audience', label: 'Audience 3 title', field_type: 'text' },
  'audience.3.desc': { value: 'Deliver commercial intelligence your clients value. Transform complex industry news into clear, actionable briefings.', section: 'audience', label: 'Audience 3 description', field_type: 'textarea' },

  // ── Pricing ──
  'pricing.title': { value: 'Simple, transparent pricing', section: 'pricing', label: 'Section heading', field_type: 'text' },
  'pricing.subtitle': { value: "Start free, upgrade when you're ready. Every plan includes AI-powered generation and multi-format output.", section: 'pricing', label: 'Section description', field_type: 'textarea' },
  'pricing.starter.desc': { value: 'For solo brokers and small teams getting started with automated content.', section: 'pricing', label: 'Starter plan description', field_type: 'textarea' },
  'pricing.professional.desc': { value: 'For growing teams that need more volume and advanced features.', section: 'pricing', label: 'Professional plan description', field_type: 'textarea' },
  'pricing.enterprise.desc': { value: 'For large organisations with unlimited needs and dedicated support.', section: 'pricing', label: 'Enterprise plan description', field_type: 'textarea' },

  // ── CTA / Waitlist ──
  'cta.title': { value: 'Get early access', section: 'cta', label: 'CTA heading', field_type: 'text' },
  'cta.subtitle': { value: 'Join the waitlist and be the first to automate your insurance content pipeline.', section: 'cta', label: 'CTA description', field_type: 'textarea' },
  'cta.button': { value: 'Join waitlist', section: 'cta', label: 'CTA button text', field_type: 'text' },
  'cta.success': { value: "You're on the list! We'll be in touch soon.", section: 'cta', label: 'Success message', field_type: 'text' },

  // ── Footer ──
  'footer.tagline': { value: 'AI-powered content for insurance distribution.', section: 'footer', label: 'Footer tagline', field_type: 'text' },
};

// Get all site content, merging DB overrides with defaults
export async function getSiteContent(): Promise<Record<string, string>> {
  await getDb();

  const result = await sql`SELECT key, value FROM site_content`;
  const dbValues: Record<string, string> = {};
  for (const row of result.rows) {
    dbValues[row.key] = row.value;
  }

  // Merge: DB values override defaults
  const content: Record<string, string> = {};
  for (const [key, def] of Object.entries(DEFAULTS)) {
    content[key] = dbValues[key] ?? def.value;
  }

  return content;
}

// Get a single content value
export async function getContentValue(key: string): Promise<string> {
  const def = DEFAULTS[key];
  if (!def) return '';

  await getDb();
  const result = await sql`SELECT value FROM site_content WHERE key = ${key}`;
  return result.rows[0]?.value ?? def.value;
}

// Set a content value (upsert)
export async function setContentValue(key: string, value: string): Promise<void> {
  const def = DEFAULTS[key];
  if (!def) throw new Error(`Unknown content key: ${key}`);

  await getDb();
  await sql`
    INSERT INTO site_content (key, value, section, label, field_type, updated_at)
    VALUES (${key}, ${value}, ${def.section}, ${def.label}, ${def.field_type}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}

// Set multiple content values at once
export async function setContentValues(entries: { key: string; value: string }[]): Promise<void> {
  const validEntries = entries.filter(({ key }) => DEFAULTS[key]);
  if (validEntries.length === 0) return;

  await getDb();

  // Build batch upsert using UNNEST arrays
  const keys = validEntries.map(e => e.key);
  const values = validEntries.map(e => e.value);
  const sections = validEntries.map(e => DEFAULTS[e.key].section);
  const labels = validEntries.map(e => DEFAULTS[e.key].label);
  const fieldTypes = validEntries.map(e => DEFAULTS[e.key].field_type);

  await sql`
    INSERT INTO site_content (key, value, section, label, field_type, updated_at)
    SELECT * FROM UNNEST(
      ${keys as any}::text[],
      ${values as any}::text[],
      ${sections as any}::text[],
      ${labels as any}::text[],
      ${fieldTypes as any}::text[]
    ) AS t(key, value, section, label, field_type),
    LATERAL (SELECT NOW() AS updated_at) ts
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

// Reset a key back to its default
export async function resetContentValue(key: string): Promise<void> {
  await getDb();
  await sql`DELETE FROM site_content WHERE key = ${key}`;
}

// Get all content with metadata (for admin UI)
export async function getSiteContentWithMeta(): Promise<Array<{
  key: string;
  value: string;
  default_value: string;
  section: string;
  label: string;
  field_type: string;
  is_custom: boolean;
}>> {
  await getDb();
  const result = await sql`SELECT key, value FROM site_content`;
  const dbValues: Record<string, string> = {};
  for (const row of result.rows) {
    dbValues[row.key] = row.value;
  }

  return Object.entries(DEFAULTS).map(([key, def]) => ({
    key,
    value: dbValues[key] ?? def.value,
    default_value: def.value,
    section: def.section,
    label: def.label,
    field_type: def.field_type,
    is_custom: key in dbValues,
  }));
}
