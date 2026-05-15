import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * GET  /api/company/approval-settings   → returns { require_content_approval }
 * POST /api/company/approval-settings   → updates the flag for the caller's company
 *
 * Used by the Settings → Compliance UI to toggle whether new content needs
 * approval before distribution.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const r = await sql`
    SELECT id, require_content_approval FROM companies WHERE user_id = ${user.id}
  `;
  if (!r.rows.length) {
    return NextResponse.json({ require_content_approval: false });
  }
  return NextResponse.json({
    require_content_approval: Boolean(r.rows[0].require_content_approval),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`approval-settings:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  const requireApproval = Boolean(body?.require_content_approval);

  await getDb();
  const r = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  if (!r.rows.length) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 });
  }

  await sql`
    UPDATE companies
    SET require_content_approval = ${requireApproval}, updated_at = NOW()
    WHERE id = ${r.rows[0].id}
  `;

  return NextResponse.json({ ok: true, require_content_approval: requireApproval });
}
