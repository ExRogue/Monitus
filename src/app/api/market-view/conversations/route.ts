import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import {
  listConversations,
  type MarketViewFilters,
} from '@/lib/market-conversations';
import { getDemoConversations, DEMO_COMPANY_ID } from '@/lib/market-analyst-demo';

export const runtime = 'nodejs';

const VALID_FILTERS = [
  'all', 'rising', 'under-discussed', 'strong-fit', 'high-confidence',
  'sales-useful', 'pr-potential', 'official-source', 'monitor-only',
] as const;
const VALID_SORTS = ['relevance', 'momentum', 'attention', 'latest', 'saturation'] as const;

/**
 * GET /api/market-view/conversations
 *
 * Returns all conversations for the caller's company, filtered + sorted for
 * the Market View page. The page also derives a Market Map summary (counts
 * across viewStatus) which we compute and return alongside.
 *
 * Query params:
 *   filter — one of VALID_FILTERS (default: all)
 *   sort   — one of VALID_SORTS  (default: relevance)
 *   companyId — for demo mode (companyId=demo bypasses auth + DB)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedCompanyId = searchParams.get('companyId');
  const filter = (searchParams.get('filter') || 'all').toLowerCase();
  const sort = (searchParams.get('sort') || 'relevance').toLowerCase();

  if (!VALID_FILTERS.includes(filter as any)) {
    return NextResponse.json({ error: `Invalid filter. Allowed: ${VALID_FILTERS.join(', ')}` }, { status: 400 });
  }
  if (!VALID_SORTS.includes(sort as any)) {
    return NextResponse.json({ error: `Invalid sort. Allowed: ${VALID_SORTS.join(', ')}` }, { status: 400 });
  }

  // Demo mode — public
  if (requestedCompanyId === DEMO_COMPANY_ID) {
    const conversations = getDemoConversations();
    return NextResponse.json({
      conversations,
      marketMap: computeMarketMap(conversations),
    });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    // No company set up — show demo as preview
    const conversations = getDemoConversations();
    return NextResponse.json({
      conversations,
      marketMap: computeMarketMap(conversations),
      preview: true,
    });
  }

  const filters: MarketViewFilters = {
    filter: filter as MarketViewFilters['filter'],
    sort: sort as MarketViewFilters['sort'],
  };

  const conversations = await listConversations(company.id as string, filters);
  return NextResponse.json({
    conversations,
    marketMap: computeMarketMap(conversations),
  });
}

function computeMarketMap(conversations: Array<{ viewStatus: string }>) {
  const counts: Record<string, number> = {
    included_in_brief: 0,
    action_recommended: 0,
    monitor_only: 0,
    tracked_not_prioritised: 0,
  };
  for (const c of conversations) {
    if (c.viewStatus in counts) counts[c.viewStatus]++;
  }
  return counts;
}
