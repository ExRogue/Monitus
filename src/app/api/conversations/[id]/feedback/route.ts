import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson, sanitizeString } from '@/lib/validation';
import { recordFeedback, type FeedbackType } from '@/lib/conversation-feedback';

export const runtime = 'nodejs';

const VALID_TYPES: FeedbackType[] = ['not_relevant', 'wrong_cluster', 'low_quality', 'duplicate', 'helpful'];

/**
 * POST /api/conversations/[id]/feedback
 *
 * User feedback on a market conversation. Body:
 *   { feedbackType: 'not_relevant' | 'wrong_cluster' | 'low_quality' | 'duplicate' | 'helpful',
 *     comment?: string }
 *
 * Side-effects:
 *   not_relevant / low_quality / duplicate → archive the conversation
 *   wrong_cluster → detach items + archive so next clustering re-groups them
 *   helpful → recorded only, no side-effect
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`conv-feedback:${user.id}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const conversationId = params.id;
  if (!conversationId) return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  const feedbackType = String((body as any)?.feedbackType || '');
  if (!VALID_TYPES.includes(feedbackType as FeedbackType)) {
    return NextResponse.json(
      { error: `Invalid feedback type. Allowed: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    );
  }
  const comment = sanitizeString(String((body as any)?.comment || ''), 1000);

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 });

  const result = await recordFeedback(
    conversationId,
    company.id as string,
    user.id,
    feedbackType as FeedbackType,
    comment,
  );

  if (!('ok' in result) || !result.ok) {
    return NextResponse.json({ error: (result as any).reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
