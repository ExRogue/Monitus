import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only allow admin users
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const company = await sql`SELECT id FROM companies WHERE id = (SELECT company_id FROM users WHERE id = ${user.id})`;
    if (!company.rows[0]) return NextResponse.json({ error: 'No company' }, { status: 404 });
    const companyId = company.rows[0].id;

    // Clear messaging bible
    await sql`UPDATE messaging_bibles SET full_document = NULL, elevator_pitch = NULL, messaging_pillars = NULL, icp_profiles = NULL WHERE company_id = ${companyId}`;

    return NextResponse.json({ success: true, message: 'Narrative reset for testing' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
