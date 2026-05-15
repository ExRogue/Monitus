import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { checkAndPersist } from '@/lib/fabrication-check';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/content/fabrication-check
 *
 * Async fabrication check. Called fire-and-forget from the content-generation
 * flow, or manually from the content editor "Re-check claims" button.
 *
 * Body: { contentId: string, companyId?: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`fab-check:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { contentId, companyId } = body;
  if (!contentId) {
    return NextResponse.json({ error: 'contentId required' }, { status: 400 });
  }

  await getDb();

  // Resolve company — caller can pass it, otherwise look it up from the user.
  let resolvedCompanyId = companyId;
  if (!resolvedCompanyId) {
    const c = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    resolvedCompanyId = c.rows[0]?.id;
  }
  if (!resolvedCompanyId) {
    return NextResponse.json({ error: 'No company resolved' }, { status: 400 });
  }

  // Verify ownership before running the check
  const ownership = await sql`
    SELECT 1 FROM generated_content gc
    JOIN companies c ON c.id = gc.company_id
    WHERE gc.id = ${contentId} AND c.user_id = ${user.id}
    LIMIT 1
  `;
  if (!ownership.rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const result = await checkAndPersist(contentId, resolvedCompanyId);
    if (!result) {
      return NextResponse.json({
        checked: false,
        reason: 'AI checker unavailable on this deployment',
      });
    }
    return NextResponse.json({ checked: true, result });
  } catch (err: any) {
    console.error('[fabrication-check] Failed:', err);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
