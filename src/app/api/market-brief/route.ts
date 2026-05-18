import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { getLatestMarketBrief } from '@/lib/market-brief';
import { getDemoMarketBrief, DEMO_COMPANY_ID } from '@/lib/market-analyst-demo';

export const runtime = 'nodejs';

/**
 * GET /api/market-brief
 *
 * Returns the most recent Market Brief for the caller's company. If
 * `?companyId=demo` is supplied (or no company has been set up yet) the
 * Supercede demo dataset is returned.
 *
 * The Market Brief is generated weekly by /api/cron/weekly-brief — this route
 * is a pure read; it doesn't trigger generation.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCompanyId = searchParams.get('companyId');

  // Demo mode — public, no auth required so it can power marketing-site previews
  if (requestedCompanyId === DEMO_COMPANY_ID) {
    return NextResponse.json({ brief: getDemoMarketBrief() });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    // No company set up — show the demo brief as a preview so the page renders
    return NextResponse.json({ brief: getDemoMarketBrief(), preview: true });
  }

  const brief = await getLatestMarketBrief(company.id as string);
  if (!brief) {
    // Real account but no brief generated yet (no recent conversations).
    // Frontend shows an empty state — not an error.
    return NextResponse.json({ brief: null });
  }

  return NextResponse.json({ brief });
}
