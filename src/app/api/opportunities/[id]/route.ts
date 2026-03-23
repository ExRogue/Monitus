import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';

// PATCH /api/opportunities/[id] — update stage, dismiss, save, etc.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const rl = rateLimit(`opportunities:${user.id}`, 30, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    if (!companyResult.rows.length) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const companyId = companyResult.rows[0].id;

    let body: any;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { stage, dismissed, saved } = body;

    if (stage !== undefined) {
      await sql`
        UPDATE opportunities SET stage = ${stage}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
      `;
    }
    if (dismissed !== undefined) {
      await sql`
        UPDATE opportunities SET dismissed = ${dismissed}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
      `;
    }
    if (saved !== undefined) {
      await sql`
        UPDATE opportunities SET saved = ${saved}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
      `;
    }

    const result = await sql`SELECT * FROM opportunities WHERE id = ${id} AND company_id = ${companyId}`;
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ opportunity: result.rows[0] });
  } catch (error) {
    console.error('PATCH /api/opportunities/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}

// DELETE /api/opportunities/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const rl = rateLimit(`opportunities:${user.id}`, 30, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    if (!companyResult.rows.length) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const companyId = companyResult.rows[0].id;

    await sql`DELETE FROM opportunities WHERE id = ${id} AND company_id = ${companyId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/opportunities/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 });
  }
}
