import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { getApprovalHistory } from '@/lib/approval';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentId = params.id;
  if (!contentId) return NextResponse.json({ error: 'Content ID required' }, { status: 400 });

  await getDb();

  const ownership = await sql`
    SELECT 1 FROM generated_content gc
    JOIN companies c ON c.id = gc.company_id
    WHERE gc.id = ${contentId} AND c.user_id = ${user.id}
    LIMIT 1
  `;
  if (!ownership.rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const history = await getApprovalHistory(contentId);
  return NextResponse.json({ history });
}
