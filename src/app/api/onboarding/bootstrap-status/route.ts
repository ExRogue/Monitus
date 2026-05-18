import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { getBootstrapProgress, BOOTSTRAP_STEP_LABELS } from '@/lib/bootstrap-status';

export const runtime = 'nodejs';

/**
 * GET /api/onboarding/bootstrap-status
 *
 * Returns the current bootstrap pipeline progress for the caller's company.
 * Frontend polls this on the Market Brief empty state so the user sees
 * "Scoring 30 days of coverage..." / "Clustering conversations..." / etc.
 * instead of a black box.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const r = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = r.rows[0];
  if (!company) {
    return NextResponse.json({ status: 'pending', label: BOOTSTRAP_STEP_LABELS.pending, progress: {} });
  }

  const progress = await getBootstrapProgress(company.id as string);
  if (!progress) {
    return NextResponse.json({ status: 'pending', label: BOOTSTRAP_STEP_LABELS.pending, progress: {} });
  }
  return NextResponse.json({
    ...progress,
    label: BOOTSTRAP_STEP_LABELS[progress.status],
  });
}
