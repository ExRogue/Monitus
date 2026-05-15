import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson, sanitizeString } from '@/lib/validation';
import { reject } from '@/lib/approval';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`reject:${user.id}`, 30, 60_000);
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

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  const rawReason = body?.reason;
  if (typeof rawReason !== 'string' || rawReason.trim().length < 3) {
    return NextResponse.json(
      { error: 'A rejection reason of at least 3 characters is required.' },
      { status: 400 },
    );
  }
  const reason = sanitizeString(rawReason, 1000);

  const result = await reject(contentId, companyId, user.id, reason);
  if (!('ok' in result) || !result.ok) {
    return NextResponse.json({ error: (result as any).reason || 'Rejection failed' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
