/**
 * Per-company source selection.
 *
 * Different insurance specialists want different sources: a cyber MGA doesn't
 * care about Lloyd's Q1 results; a marine broker doesn't need NIST cyber alerts.
 * The full source list is in source_registry (seeded from INSURANCE_FEEDS).
 * Per-company opt-out is stored as `excluded_source_names` JSON array on
 * companies — using names not IDs so news_articles.source joins are trivial.
 */
import { sql } from '@vercel/postgres';
import { getDb } from './db';

export interface SourceRegistryEntry {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  classification: string;
  trustWeight: number;
  geography: string | null;
  segment: string | null;
  priority: string;
  isActive: boolean;
}

function parseExcluded(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }
  return [];
}

/**
 * List all active sources from the registry. Used by the Settings UI to show
 * toggles. Excludes the company-scoped customs (those have a company_id) —
 * only returns globally-registered sources.
 */
export async function listAllSources(): Promise<SourceRegistryEntry[]> {
  await getDb();
  const r = await sql`
    SELECT id, name, url, source_type, classification, trust_weight, geography, segment, priority, is_active
    FROM source_registry
    WHERE company_id IS NULL AND is_active = true
    ORDER BY trust_weight DESC NULLS LAST, name ASC
  `;
  return r.rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    url: String(row.url || ''),
    sourceType: String(row.source_type || 'rss'),
    classification: String(row.classification || 'trade'),
    trustWeight: Number(row.trust_weight || 0),
    geography: row.geography ? String(row.geography) : null,
    segment: row.segment ? String(row.segment) : null,
    priority: String(row.priority || 'standard'),
    isActive: Boolean(row.is_active),
  }));
}

export async function getExcludedSourceNames(companyId: string): Promise<string[]> {
  await getDb();
  const r = await sql`SELECT excluded_source_names FROM companies WHERE id = ${companyId} LIMIT 1`;
  if (!r.rows.length) return [];
  return parseExcluded(r.rows[0].excluded_source_names);
}

export async function setExcludedSourceNames(companyId: string, names: string[]): Promise<void> {
  await getDb();
  // De-dup + sanitise
  const cleaned = Array.from(new Set(names.filter(n => typeof n === 'string' && n.trim()).map(n => n.trim()))).slice(0, 200);
  await sql`
    UPDATE companies
    SET excluded_source_names = ${JSON.stringify(cleaned)}, updated_at = NOW()
    WHERE id = ${companyId}
  `;
}

/**
 * Build a SQL fragment usable for filtering news_articles or signal_analyses
 * to exclude sources the company has opted out of. Returns null if there's
 * no exclusion (so the caller can skip the filter entirely).
 */
export async function articleSourceExclusionList(companyId: string): Promise<string[] | null> {
  const excluded = await getExcludedSourceNames(companyId);
  return excluded.length > 0 ? excluded : null;
}
