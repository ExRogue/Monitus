/**
 * POST /api/market-view/conversations/[id]/ignore
 * DELETE /api/market-view/conversations/[id]/ignore
 *
 * Toggle the archived flag on a Market Conversation. Archived conversations
 * are hidden from the default Market View list and surface the display
 * status "Ignored" on cards. The user can un-ignore via DELETE.
 *
 * Distinct from Follow (which is "show me even if the system wouldn't") —
 * Ignore is "hide it even if the system would show it".
 */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/validation';

export const runtime = 'nodejs';

async function setArchivedState(
  request: NextRequest,
  conversationId: string,
  desired: boolean,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`market-view:ignore:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ error: 'No company configured' }, { status: 400 });
  }

  const result = await sql`
    UPDATE market_conversations
       SET archived = ${desired}, updated_at = NOW()
     WHERE id = ${conversationId} AND company_id = ${company.id as string}
     RETURNING id, archived
  `;
  if (!result.rows.length) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    conversationId: String(result.rows[0].id),
    archived: Boolean(result.rows[0].archived),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return setArchivedState(request, id, true);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return setArchivedState(request, id, false);
}
