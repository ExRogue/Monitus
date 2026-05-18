import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson, sanitizeString } from '@/lib/validation';
import { getCompanyProfile, updateCompanyProfile, type CompanyProfile } from '@/lib/company-profile';
import { getDemoCompanyProfile, DEMO_COMPANY_ID } from '@/lib/market-analyst-demo';

export const runtime = 'nodejs';

/**
 * GET  /api/company-profile          → returns the caller's company profile
 * GET  /api/company-profile?companyId=demo → Supercede demo profile (public)
 * PATCH /api/company-profile         → updates fields in the caller's profile
 *
 * Replaces the old /api/narrative read path in the new IA. The underlying
 * messaging_bibles row keeps its identity so existing routes that reference
 * elevator_pitch, icp_profiles, etc. continue to work.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCompanyId = searchParams.get('companyId');

  if (requestedCompanyId === DEMO_COMPANY_ID) {
    return NextResponse.json({ profile: getDemoCompanyProfile() });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ profile: getDemoCompanyProfile(), preview: true });
  }

  const profile = await getCompanyProfile(company.id as string);
  if (!profile) {
    // Company exists but no messaging_bibles row yet — return an empty shell
    // so the page can render the editor and saves create the row.
    return NextResponse.json({ profile: emptyProfile(company.id as string) });
  }
  return NextResponse.json({ profile });
}

function emptyProfile(companyId: string): CompanyProfile {
  return {
    id: '', companyId, category: '', oneLineDescription: '', productDescription: '',
    targetMarkets: [], targetGeographies: [], targetCustomers: [], buyerPersonas: [],
    products: [], workflows: [], coreNarrative: '', enemyProblemFrame: '', categoryLanguage: '',
    differentiation: [], proofPoints: [], claimsMade: [], claimsAvoided: [],
    likelyObjections: [], commercialHooks: [], priorityTopics: [], excludedTopics: [],
    insuranceSegments: [], regulatoryAreas: [], namedCustomers: [], namedPartners: [],
    confidence: 0, sourceSummary: {}, scanDate: null, updatedAt: new Date().toISOString(),
  };
}

const STRING_FIELDS = [
  'category', 'oneLineDescription', 'productDescription',
  'coreNarrative', 'enemyProblemFrame', 'categoryLanguage',
] as const;

const ARRAY_FIELDS = [
  'targetMarkets', 'targetGeographies', 'targetCustomers', 'buyerPersonas',
  'products', 'workflows', 'differentiation', 'proofPoints',
  'claimsMade', 'claimsAvoided', 'likelyObjections', 'commercialHooks',
  'priorityTopics', 'excludedTopics', 'insuranceSegments', 'regulatoryAreas',
  'namedCustomers', 'namedPartners',
] as const;

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`company-profile:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ error: 'No company configured for this user' }, { status: 400 });
  }

  // Build a typed patch from the body, dropping unknown fields and sanitising.
  const patch: Partial<CompanyProfile> = {};
  for (const field of STRING_FIELDS) {
    const v = (body as any)?.[field];
    if (typeof v === 'string') {
      (patch as any)[field] = sanitizeString(v, field === 'coreNarrative' ? 20000 : 2000);
    }
  }
  for (const field of ARRAY_FIELDS) {
    const v = (body as any)?.[field];
    if (Array.isArray(v)) {
      (patch as any)[field] = v
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => sanitizeString(item as string, 500))
        .slice(0, 50);
    }
  }
  if (typeof (body as any)?.confidence === 'number') {
    patch.confidence = Math.max(0, Math.min(1, (body as any).confidence));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await updateCompanyProfile(company.id as string, patch);
  return NextResponse.json({ profile: updated });
}
