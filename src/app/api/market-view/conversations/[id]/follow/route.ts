/**
 * POST /api/market-view/conversations/[id]/follow
 * DELETE /api/market-view/conversations/[id]/follow
 *
 * Toggle the `is_followed` flag on a Market Conversation. A followed
 * conversation always appears in Market View regardless of the default
 * visibility filter — used when the user wants to keep an eye on a story
 * the system has otherwise demoted (e.g. saturated or low-relevance).
 *
 * Per-company today. When team support arrives we'll split per-user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/validation';

export const runtime = 'nodejs';

async function setFollowedState(
  request: NextRequest,
  conversationId: string,
  desired: boolean,
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`market-view:follow:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ error: 'No company configured' }, { status: 400 });
  }

  // Scope the UPDATE to this company so a follow can't accidentally toggle
  // another tenant's conversation if an ID is forged.
  const result = await sql`
    UPDATE market_conversations
       SET is_followed = ${desired}, updated_at = NOW()
     WHERE id = ${conversationId} AND company_id = ${company.id as string}
     RETURNING id, is_followed
  `;
  if (!result.rows.length) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    conversationId: String(result.rows[0].id),
    isFollowed: Boolean(result.rows[0].is_followed),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return setFollowedState(request, id, true);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return setFollowedState(request, id, false);
}
