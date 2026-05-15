import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { submitForApproval } from '@/lib/approval';

export const runtime = 'nodejs';

/**
 * POST /api/content/:id/submit
 *
 * Submit a piece of content for approval. Used when the user wants to
 * re-submit a rejected piece after edits, or when the company didn't have
 * approval turned on at generation time but does now.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`submit-approval:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const contentId = params.id;
  if (!contentId) return NextResponse.json({ error: 'Content ID required' }, { status: 400 });

  await getDb();

  const ownership = await sql`
    SELECT gc.company_id FROM generated_content gc
    JOIN companies c ON c.id = gc.company_id
    WHERE gc.id = ${contentId} AND c.user_id = ${user.id}
    LIMIT 1
  `;
  if (!ownership.rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const companyId = ownership.rows[0].company_id as string;

  const result = await submitForApproval(contentId, companyId, user.id);
  if (!('ok' in result) || !result.ok) {
    return NextResponse.json({ error: (result as any).reason || 'Submit failed' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
