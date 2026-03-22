import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await getDb();

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = (page - 1) * limit;

    const countResult = await sql`SELECT COUNT(*) as total FROM users`;
    const total = parseInt(countResult.rows[0].total);

    const result = await sql`
      SELECT u.id, u.email, u.name, u.role, u.disabled, u.created_at,
        p.name as plan_name, p.slug as plan_slug, s.id as sub_id
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      users: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
