/**
 * Company Profile — the system's working understanding of a Monitus user's company.
 *
 * This is the data layer behind the new Company Profile page (which replaces
 * Narrative in the IA). Underneath it reads from / writes to `messaging_bibles`
 * — the table keeps its name because 50+ existing routes reference it, but the
 * shape returned to the new UI is the richer Market Analyst CompanyProfileData
 * model with proofPoints, claimsMade, commercialHooks, buyerPersonas, etc.
 *
 * Field mapping (Market Analyst CompanyProfileData → messaging_bibles):
 *   targetCustomers   ← target_audiences  (existing JSON)
 *   buyerPersonas     ← icp_profiles      (existing JSON)
 *   products          ← products          (existing JSON, added in v22)
 *   differentiation   ← differentiators   (existing JSON)
 *   coreNarrative     ← full_document     (existing — the generated narrative markdown)
 *
 * All other fields are NEW columns added in v24.
 */
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface CompanyProfile {
  id: string;
  companyId: string;
  category: string;
  oneLineDescription: string;
  productDescription: string;
  targetMarkets: string[];
  targetGeographies: string[];
  targetCustomers: string[];
  buyerPersonas: string[];
  products: string[];
  workflows: string[];
  coreNarrative: string;
  enemyProblemFrame: string;
  categoryLanguage: string;
  differentiation: string[];
  proofPoints: string[];
  claimsMade: string[];
  claimsAvoided: string[];
  likelyObjections: string[];
  commercialHooks: string[];
  priorityTopics: string[];
  excludedTopics: string[];
  insuranceSegments: string[];
  regulatoryAreas: string[];
  namedCustomers: string[];
  namedPartners: string[];
  confidence: number;
  sourceSummary: Record<string, unknown>;
  scanDate: string | null;
  updatedAt: string;
}

function parseJsonArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        // ICPs can be objects ({name, role, ...}) — flatten to names for the
        // simple string[] surface; richer views consume the raw column.
        return parsed.map(item =>
          typeof item === 'string' ? item : String(item?.name || item?.role || ''),
        ).filter(Boolean);
      }
    } catch {
      // Fall through — return the raw string as a single-element array
      return [trimmed];
    }
  }
  return [];
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }
  return {};
}

function rowToProfile(row: Record<string, unknown>): CompanyProfile {
  return {
    id: String(row.id || ''),
    companyId: String(row.company_id || ''),
    category: String(row.category || ''),
    // one_line_description was added in v24. Pre-v24 rows fall back to the
    // existing elevator_pitch which served the same purpose.
    oneLineDescription: String(row.one_line_description || row.elevator_pitch || ''),
    productDescription: String(row.product_description || row.company_description || ''),
    targetMarkets: parseJsonArray(row.target_markets),
    targetGeographies: parseJsonArray(row.target_geographies),
    targetCustomers: parseJsonArray(row.target_customers || row.target_audiences),
    buyerPersonas: parseJsonArray(row.buyer_personas || row.icp_profiles),
    products: parseJsonArray(row.products),
    workflows: parseJsonArray(row.workflows),
    coreNarrative: String(row.core_narrative || row.full_document || ''),
    enemyProblemFrame: String(row.enemy_problem_frame || ''),
    categoryLanguage: String(row.category_language || ''),
    differentiation: parseJsonArray(row.differentiation || row.differentiators),
    proofPoints: parseJsonArray(row.proof_points),
    claimsMade: parseJsonArray(row.claims_made),
    claimsAvoided: parseJsonArray(row.claims_avoided),
    likelyObjections: parseJsonArray(row.likely_objections),
    commercialHooks: parseJsonArray(row.commercial_hooks),
    priorityTopics: parseJsonArray(row.priority_topics),
    excludedTopics: parseJsonArray(row.excluded_topics),
    insuranceSegments: parseJsonArray(row.insurance_segments),
    regulatoryAreas: parseJsonArray(row.regulatory_areas),
    namedCustomers: parseJsonArray(row.named_customers),
    namedPartners: parseJsonArray(row.named_partners || row.founders),
    confidence: Number(row.profile_confidence || 0),
    sourceSummary: parseJsonObject(row.source_summary),
    scanDate: row.profile_scan_date ? new Date(row.profile_scan_date as string).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
  };
}

/**
 * Fetch the current CompanyProfile for a company. Returns null if the company
 * has no messaging_bibles row yet (i.e. they haven't run onboarding).
 */
export async function getCompanyProfile(companyId: string): Promise<CompanyProfile | null> {
  await getDb();
  const r = await sql`
    SELECT *
    FROM messaging_bibles
    WHERE company_id = ${companyId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  if (!r.rows.length) return null;
  return rowToProfile(r.rows[0]);
}

/**
 * PATCH a CompanyProfile. Accepts a partial update — only the provided fields
 * are written. Returns the full updated profile.
 */
export async function updateCompanyProfile(
  companyId: string,
  patch: Partial<Omit<CompanyProfile, 'id' | 'companyId' | 'updatedAt'>>,
): Promise<CompanyProfile | null> {
  await getDb();

  // Find or create the messaging_bibles row.
  const existing = await sql`
    SELECT id FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
  `;
  let bibleId: string;
  if (existing.rows.length) {
    bibleId = String(existing.rows[0].id);
  } else {
    bibleId = uuidv4();
    await sql`
      INSERT INTO messaging_bibles (id, company_id, status, channels)
      VALUES (${bibleId}, ${companyId}, 'draft', '["linkedin","email","trade_media"]')
    `;
  }

  // Build the UPDATE column list dynamically. We do this with a series of
  // small UPDATEs rather than one big one to avoid generating a giant
  // template string and to keep typing safe.
  const updates: { column: string; value: unknown }[] = [];
  const j = (v: unknown) => JSON.stringify(v ?? []);

  if (patch.category !== undefined) updates.push({ column: 'category', value: patch.category });
  if (patch.oneLineDescription !== undefined) updates.push({ column: 'one_line_description', value: patch.oneLineDescription });
  if (patch.productDescription !== undefined) updates.push({ column: 'product_description', value: patch.productDescription });
  if (patch.targetMarkets !== undefined) updates.push({ column: 'target_markets', value: j(patch.targetMarkets) });
  if (patch.targetGeographies !== undefined) updates.push({ column: 'target_geographies', value: j(patch.targetGeographies) });
  if (patch.targetCustomers !== undefined) updates.push({ column: 'target_customers', value: j(patch.targetCustomers) });
  if (patch.buyerPersonas !== undefined) updates.push({ column: 'buyer_personas', value: j(patch.buyerPersonas) });
  if (patch.products !== undefined) updates.push({ column: 'products', value: j(patch.products) });
  if (patch.workflows !== undefined) updates.push({ column: 'workflows', value: j(patch.workflows) });
  if (patch.coreNarrative !== undefined) updates.push({ column: 'core_narrative', value: patch.coreNarrative });
  if (patch.enemyProblemFrame !== undefined) updates.push({ column: 'enemy_problem_frame', value: patch.enemyProblemFrame });
  if (patch.categoryLanguage !== undefined) updates.push({ column: 'category_language', value: patch.categoryLanguage });
  if (patch.differentiation !== undefined) updates.push({ column: 'differentiation', value: j(patch.differentiation) });
  if (patch.proofPoints !== undefined) updates.push({ column: 'proof_points', value: j(patch.proofPoints) });
  if (patch.claimsMade !== undefined) updates.push({ column: 'claims_made', value: j(patch.claimsMade) });
  if (patch.claimsAvoided !== undefined) updates.push({ column: 'claims_avoided', value: j(patch.claimsAvoided) });
  if (patch.likelyObjections !== undefined) updates.push({ column: 'likely_objections', value: j(patch.likelyObjections) });
  if (patch.commercialHooks !== undefined) updates.push({ column: 'commercial_hooks', value: j(patch.commercialHooks) });
  if (patch.priorityTopics !== undefined) updates.push({ column: 'priority_topics', value: j(patch.priorityTopics) });
  if (patch.excludedTopics !== undefined) updates.push({ column: 'excluded_topics', value: j(patch.excludedTopics) });
  if (patch.insuranceSegments !== undefined) updates.push({ column: 'insurance_segments', value: j(patch.insuranceSegments) });
  if (patch.regulatoryAreas !== undefined) updates.push({ column: 'regulatory_areas', value: j(patch.regulatoryAreas) });
  if (patch.namedCustomers !== undefined) updates.push({ column: 'named_customers', value: j(patch.namedCustomers) });
  if (patch.namedPartners !== undefined) updates.push({ column: 'named_partners', value: j(patch.namedPartners) });
  if (patch.confidence !== undefined) updates.push({ column: 'profile_confidence', value: Math.max(0, Math.min(1, Number(patch.confidence) || 0)) });
  if (patch.sourceSummary !== undefined) updates.push({ column: 'source_summary', value: JSON.stringify(patch.sourceSummary || {}) });
  if (patch.scanDate !== undefined) updates.push({ column: 'profile_scan_date', value: patch.scanDate });

  // Apply each update individually. With ALTER TABLE ADD COLUMN IF NOT EXISTS,
  // every column is guaranteed to exist before this runs.
  for (const u of updates) {
    // We use sql.query with parameterised values to keep the column name safe-
    // listed (it comes from this file, not user input) while still passing the
    // value through parameter binding.
    await sql.query(`UPDATE messaging_bibles SET ${u.column} = $1, updated_at = NOW() WHERE id = $2`, [u.value, bibleId]);
  }

  return getCompanyProfile(companyId);
}
