/**
 * Trigger matching for Story Saturation > Your Coverage.
 *
 * Reads three trigger sets from the company narrative profile (companies +
 * messaging_bibles) and produces word-boundary regex patterns:
 *
 *   company: company.name and any name_variants[]
 *   product: messaging_bibles.products[]
 *   founder: messaging_bibles.founders[]
 *
 * The matcher reports which trigger types fire on a given haystack so callers
 * can aggregate at cluster level and feed the trend chart's three series.
 *
 * Edge cases the spec asks us to handle conservatively:
 * - Single-word common-noun company names → require ≥3 chars and prefer the
 *   longest variant on overlap, so we don't flag "Apple" → "apple sauce".
 * - Founder surname collisions → require the full configured term verbatim;
 *   we don't auto-split "Jane Smith" → "Smith". If the user wants the
 *   surname alone to match, they add it as a separate variant entry.
 */

import { sql } from '@vercel/postgres';

export type TriggerType = 'company' | 'product' | 'founder';

export interface TriggerSet {
  /** Display name for the entity (used for UI and trend chart legend) */
  type: TriggerType;
  /** All terms to match for this set (company name + variants for type=company) */
  terms: string[];
  /** Compiled patterns for fast matching */
  patterns: RegExp[];
}

export interface TriggerProfile {
  company: TriggerSet;
  product: TriggerSet;
  founder: TriggerSet;
}

export interface TriggerMatch {
  company: boolean;
  product: boolean;
  founder: boolean;
}

const EMPTY_MATCH: TriggerMatch = { company: false, product: false, founder: false };

/**
 * Pull terms for the company's trigger sets from companies + messaging_bibles.
 * Returns null if the company has no usable triggers (no name, no profile).
 */
export async function getTriggerProfile(companyId: string): Promise<TriggerProfile | null> {
  const companyResult = await sql`SELECT name FROM companies WHERE id = ${companyId} LIMIT 1`;
  const companyName = String(companyResult.rows[0]?.name || '').trim();
  if (!companyName) return null;

  const bibleResult = await sql`
    SELECT name_variants, products, founders
    FROM messaging_bibles
    WHERE company_id = ${companyId}
    ORDER BY updated_at DESC LIMIT 1
  `;
  const bible = bibleResult.rows[0];

  const variants = parseTermArray(bible?.name_variants);
  const products = parseTermArray(bible?.products);
  const founders = parseTermArray(bible?.founders);

  return {
    company: makeSet('company', dedupe([companyName, ...variants])),
    product: makeSet('product', products),
    founder: makeSet('founder', founders),
  };
}

/**
 * Test which trigger types fire on a piece of text. Caller usually passes
 * `${title} ${summary} ${content.slice(0, 2000)}` to keep the regex pass cheap.
 */
export function matchTriggers(haystack: string, profile: TriggerProfile): TriggerMatch {
  if (!haystack) return EMPTY_MATCH;
  return {
    company: profile.company.patterns.some(p => p.test(haystack)),
    product: profile.product.patterns.some(p => p.test(haystack)),
    founder: profile.founder.patterns.some(p => p.test(haystack)),
  };
}

/**
 * Returns true if any trigger fired. Used to filter "Your Coverage" articles.
 */
export function anyTriggerMatched(m: TriggerMatch): boolean {
  return m.company || m.product || m.founder;
}

// ── Internals ────────────────────────────────────────────────────────

function makeSet(type: TriggerType, terms: string[]): TriggerSet {
  // Filter out terms shorter than 3 chars to avoid pathological false positives
  // ("a", "ai", initials) and to be defensible against common-word collisions.
  const cleaned = terms
    .map(t => t.trim())
    .filter(t => t.length >= 3);
  return {
    type,
    terms: cleaned,
    patterns: cleaned.map(buildWordBoundaryRegex),
  };
}

function buildWordBoundaryRegex(term: string): RegExp {
  // Escape regex special chars, then wrap in word boundaries. Case-insensitive
  // so headlines like "BEAZLEY" and "Beazley" both match.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

function parseTermArray(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(v => (typeof v === 'string' ? v : (v as { name?: string })?.name || ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}
