import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson, sanitizeString } from '@/lib/validation';
import { approve } from '@/lib/approval';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`approve:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const contentId = params.id;
  if (!contentId) return NextResponse.json({ error: 'Content ID required' }, { status: 400 });

  await getDb();

  // Verify the caller owns the company that owns this content
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

  const { data: body } = await safeParseJson(request);
  const note = sanitizeString((body?.note as string) || '', 500);

  const result = await approve(contentId, companyId, user.id, note);
  if (!('ok' in result) || !result.ok) {
    return NextResponse.json({ error: (result as any).reason || 'Approval failed' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
