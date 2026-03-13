import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('id');

  try {
    if (invoiceId) {
      // Get single invoice
      const result = await sql`
        SELECT i.*, s.plan_id FROM invoices i
        LEFT JOIN subscriptions s ON i.subscription_id = s.id
        WHERE i.id = ${invoiceId} AND i.user_id = ${user.id}
      `;

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      return NextResponse.json({ invoice: result.rows[0] });
    }

    // Get all invoices for user
    const result = await sql`
      SELECT i.*, s.plan_id FROM invoices i
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      WHERE i.user_id = ${user.id}
      ORDER BY i.created_at DESC
    `;

    return NextResponse.json({ invoices: result.rows });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
