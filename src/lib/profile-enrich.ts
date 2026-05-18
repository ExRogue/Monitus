/**
 * Profile enrichment — extracts the rich CompanyProfile fields
 * (buyerPersonas, claimsMade, commercialHooks, priorityTopics, etc.) from a
 * generated narrative document + the website extraction. Used at onboarding
 * and as a one-shot backfill for existing customers whose messaging_bibles
 * row pre-dates the v24 schema additions.
 *
 * One Sonnet call. Idempotent — overwrites only the new structured columns
 * and leaves legacy fields (elevator_pitch, icp_profiles JSON) untouched.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { updateCompanyProfile, type CompanyProfile } from './company-profile';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type EnrichmentInput = {
  companyId: string;
  /** The generated narrative markdown (preferred — most informative). */
  narrative?: string;
  /** Website extraction (used as a fallback or supplement). */
  websiteSummary?: string;
  /** Existing legacy fields we can mine — elevator_pitch, icp_profiles JSON, etc. */
  legacyFields?: Partial<{
    elevator_pitch: string;
    company_description: string;
    messaging_pillars: string;
    icp_profiles: string;
    differentiators: string;
    target_audiences: string;
    competitors: string;
  }>;
};

const NARRATIVE_CONTEXT_MAX = 8000;

function safeJsonArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(p => typeof p === 'string' ? p : (p?.name || p?.role || JSON.stringify(p))).filter(Boolean);
        }
      } catch {}
    }
    return [trimmed];
  }
  return [];
}

interface EnrichmentResult {
  category?: string;
  oneLineDescription?: string;
  productDescription?: string;
  targetMarkets?: string[];
  targetGeographies?: string[];
  targetCustomers?: string[];
  buyerPersonas?: string[];
  products?: string[];
  workflows?: string[];
  coreNarrative?: string;
  enemyProblemFrame?: string;
  categoryLanguage?: string;
  differentiation?: string[];
  proofPoints?: string[];
  claimsMade?: string[];
  claimsAvoided?: string[];
  likelyObjections?: string[];
  commercialHooks?: string[];
  priorityTopics?: string[];
  excludedTopics?: string[];
  insuranceSegments?: string[];
  regulatoryAreas?: string[];
  namedCustomers?: string[];
  namedPartners?: string[];
  confidence?: number;
}

export async function extractRichProfile(input: EnrichmentInput): Promise<EnrichmentResult | null> {
  if (!anthropic) return null;

  const narrativeBlock = input.narrative
    ? `NARRATIVE DOCUMENT:\n${input.narrative.slice(0, NARRATIVE_CONTEXT_MAX)}`
    : '';
  const websiteBlock = input.websiteSummary
    ? `\n\nWEBSITE EXTRACTION:\n${input.websiteSummary.slice(0, 2000)}`
    : '';

  const legacyParts: string[] = [];
  if (input.legacyFields?.elevator_pitch) legacyParts.push(`Elevator pitch: ${input.legacyFields.elevator_pitch}`);
  if (input.legacyFields?.company_description) legacyParts.push(`Company description: ${input.legacyFields.company_description}`);
  if (input.legacyFields?.messaging_pillars) legacyParts.push(`Messaging pillars: ${input.legacyFields.messaging_pillars.slice(0, 1000)}`);
  if (input.legacyFields?.icp_profiles) legacyParts.push(`ICP profiles (raw JSON): ${input.legacyFields.icp_profiles.slice(0, 2000)}`);
  if (input.legacyFields?.differentiators) legacyParts.push(`Differentiators: ${input.legacyFields.differentiators}`);
  if (input.legacyFields?.target_audiences) legacyParts.push(`Target audiences: ${input.legacyFields.target_audiences}`);
  if (input.legacyFields?.competitors) legacyParts.push(`Competitors: ${input.legacyFields.competitors}`);
  const legacyBlock = legacyParts.length ? `\n\nEXISTING LEGACY FIELDS (use as source material):\n${legacyParts.join('\n')}` : '';

  const prompt = `You are an insurance/insurtech messaging analyst. Read the source material below and extract a rich structured Company Profile that will be used to score market signals, cluster news conversations, and draft content for this company.

${narrativeBlock}${websiteBlock}${legacyBlock}

Return ONLY valid JSON (no markdown, no code fences) with this exact shape. Use the source material to fill fields concretely; only leave a field empty when truly nothing in the source supports it. Arrays should be short lists of 2-8 specific items.

{
  "category": "the category they want to own, e.g. 'Reinsurance Intelligence Technology'",
  "oneLineDescription": "single sentence: what they do",
  "productDescription": "2-4 sentences: fuller description of the product and value",
  "coreNarrative": "the core narrative — what they argue is true about the market",
  "enemyProblemFrame": "what status quo or problem they are fighting against",
  "categoryLanguage": "the specific category language they want associated with them",
  "targetMarkets": ["specific markets they serve, e.g. 'Reinsurance', 'Specialty Insurance'"],
  "targetGeographies": ["countries / regions"],
  "targetCustomers": ["roles or company types they sell to"],
  "buyerPersonas": ["specific personas — 'Head of Reinsurance at mid-sized cedent', not generic titles"],
  "products": ["product lines / platform pieces"],
  "workflows": ["the workflows their product touches"],
  "differentiation": ["specific ways they differ from alternatives"],
  "proofPoints": ["concrete proof they can point to"],
  "claimsMade": ["claims they actively make in their public messaging"],
  "claimsAvoided": ["claims they deliberately don't make (or shouldn't)"],
  "likelyObjections": ["objections buyers raise"],
  "commercialHooks": ["specific hooks that land in sales conversations"],
  "priorityTopics": ["topics we should weight highly when scoring signals"],
  "excludedTopics": ["topics that are noise for this company"],
  "insuranceSegments": ["specialty / commercial / personal lines / reinsurance / etc."],
  "regulatoryAreas": ["regulators / regulations relevant to them, e.g. 'PRA', 'Lloyd's market', 'FCA'"],
  "namedCustomers": ["public references / case study customers"],
  "namedPartners": ["named partners / integrations"],
  "confidence": 0.0-1.0
}

Be specific. "Head of Reinsurance at a mid-sized cedent who is accountable for placement outcomes" is better than "insurance executive". "PRA consultation on reinsurance counterparty data" is better than "regulatory compliance".`;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '{}';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    function arr(v: unknown, max = 10): string[] {
      if (!Array.isArray(v)) return [];
      return v.filter(item => typeof item === 'string' && item.trim()).map(item => String(item).slice(0, 500)).slice(0, max);
    }
    function str(v: unknown, max = 2000): string {
      return typeof v === 'string' ? v.slice(0, max) : '';
    }

    return {
      category: str(parsed.category, 200) || undefined,
      oneLineDescription: str(parsed.oneLineDescription, 500) || undefined,
      productDescription: str(parsed.productDescription, 2000) || undefined,
      coreNarrative: str(parsed.coreNarrative, 5000) || undefined,
      enemyProblemFrame: str(parsed.enemyProblemFrame, 1000) || undefined,
      categoryLanguage: str(parsed.categoryLanguage, 500) || undefined,
      targetMarkets: arr(parsed.targetMarkets, 8),
      targetGeographies: arr(parsed.targetGeographies, 8),
      targetCustomers: arr(parsed.targetCustomers, 8),
      buyerPersonas: arr(parsed.buyerPersonas, 8),
      products: arr(parsed.products, 10),
      workflows: arr(parsed.workflows, 8),
      differentiation: arr(parsed.differentiation, 8),
      proofPoints: arr(parsed.proofPoints, 8),
      claimsMade: arr(parsed.claimsMade, 8),
      claimsAvoided: arr(parsed.claimsAvoided, 8),
      likelyObjections: arr(parsed.likelyObjections, 8),
      commercialHooks: arr(parsed.commercialHooks, 8),
      priorityTopics: arr(parsed.priorityTopics, 10),
      excludedTopics: arr(parsed.excludedTopics, 8),
      insuranceSegments: arr(parsed.insuranceSegments, 6),
      regulatoryAreas: arr(parsed.regulatoryAreas, 6),
      namedCustomers: arr(parsed.namedCustomers, 10),
      namedPartners: arr(parsed.namedPartners, 8),
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
    };
  } catch (err) {
    console.error('[profile-enrich] Failed:', err);
    return null;
  }
}

/**
 * Extract rich profile fields for a single company and persist them.
 * Reads the company's existing messaging_bibles row as source material.
 * Skips companies that already have the rich fields populated.
 */
export async function enrichProfileForCompany(companyId: string, options?: { force?: boolean }): Promise<{
  enriched: boolean;
  reason?: string;
  fieldsUpdated?: number;
}> {
  await getDb();

  const r = await sql`
    SELECT id, elevator_pitch, company_description, messaging_pillars, icp_profiles,
           differentiators, target_audiences, competitors, full_document,
           buyer_personas, claims_made
    FROM messaging_bibles
    WHERE company_id = ${companyId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  if (!r.rows.length) {
    return { enriched: false, reason: 'No messaging_bibles row for this company' };
  }
  const row = r.rows[0];

  // Skip if already enriched, unless forced. We check buyer_personas because
  // it's a v24-only field that's almost certainly populated post-enrichment.
  if (!options?.force) {
    const existing = safeJsonArray(row.buyer_personas);
    if (existing.length > 0) {
      return { enriched: false, reason: 'Already enriched (buyer_personas non-empty)' };
    }
  }

  const result = await extractRichProfile({
    companyId,
    narrative: row.full_document ? String(row.full_document) : undefined,
    legacyFields: {
      elevator_pitch: String(row.elevator_pitch || ''),
      company_description: String(row.company_description || ''),
      messaging_pillars: String(row.messaging_pillars || ''),
      icp_profiles: String(row.icp_profiles || ''),
      differentiators: String(row.differentiators || ''),
      target_audiences: String(row.target_audiences || ''),
      competitors: String(row.competitors || ''),
    },
  });

  if (!result) return { enriched: false, reason: 'Enrichment call failed' };

  // Convert EnrichmentResult to CompanyProfile patch
  const patch: Partial<Omit<CompanyProfile, 'id' | 'companyId' | 'updatedAt'>> = {};
  for (const [k, v] of Object.entries(result)) {
    if (v !== undefined && v !== null) (patch as any)[k] = v;
  }

  await updateCompanyProfile(companyId, patch);
  return { enriched: true, fieldsUpdated: Object.keys(patch).length };
}
