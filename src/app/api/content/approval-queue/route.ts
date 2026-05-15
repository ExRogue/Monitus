import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { listApprovalQueue } from '@/lib/approval';

export const runtime = 'nodejs';

/**
 * GET /api/content/approval-queue
 *
 * Returns all generated content currently in `approval_status='pending'`
 * for the user's company. Used by the approver dashboard.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ queue: [] });
  }

  const queue = await listApprovalQueue(company.id as string);
  return NextResponse.json({ queue });
}
