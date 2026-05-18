import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { getConversation } from '@/lib/market-conversations';
import { getDemoConversation, DEMO_COMPANY_ID } from '@/lib/market-analyst-demo';

export const runtime = 'nodejs';

/**
 * GET /api/market-view/conversations/[id]
 *
 * Returns one conversation with its full Story / Coverage / Actions payload
 * (score + interpretation + attached items). Used by the Conversation Detail
 * page linked from Market View.
 *
 * Query param: companyId=demo for the Supercede demo.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const conversationId = params.id;
  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const requestedCompanyId = searchParams.get('companyId');

  if (requestedCompanyId === DEMO_COMPANY_ID) {
    const conv = getDemoConversation(conversationId);
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ conversation: conv });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    // Fallback: try demo
    const demo = getDemoConversation(conversationId);
    if (demo) return NextResponse.json({ conversation: demo, preview: true });
    return NextResponse.json({ error: 'No company configured' }, { status: 400 });
  }

  const conv = await getConversation(conversationId, company.id as string, { withItems: true });
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ conversation: conv });
}
