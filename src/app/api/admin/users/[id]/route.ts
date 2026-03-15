import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  await getDb();

  const result = await sql`
    SELECT u.id, u.email, u.name, u.role, u.created_at, u.disabled,
      s.id as sub_id, s.status as sub_status, p.name as plan_name, p.slug as plan_slug
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    WHERE u.id = ${id}
  `;

  if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ user: result.rows[0] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  await getDb();

  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
  }

  const updates: string[] = [];

  if (body.role && ['admin', 'user'].includes(body.role)) {
    await sql`UPDATE users SET role = ${body.role}, updated_at = NOW() WHERE id = ${id}`;
    updates.push(`role updated to ${body.role}`);
  }

  if (typeof body.disabled === 'boolean') {
    await sql`UPDATE users SET disabled = ${body.disabled}, updated_at = NOW() WHERE id = ${id}`;
    updates.push(body.disabled ? 'user disabled' : 'user enabled');
  }

  if (body.cancelSubscription) {
    await sql`UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = ${id} AND status = 'active'`;
    updates.push('subscription cancelled');
  }

  if (body.planSlug) {
    const planResult = await sql`SELECT id FROM subscription_plans WHERE slug = ${body.planSlug}`;
    if (planResult.rows[0]) {
      await sql`UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = ${id} AND status = 'active'`;
      const subId = `admin-${Date.now()}`;
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      await sql`
        INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
        VALUES (${subId}, ${id}, ${planResult.rows[0].id}, 'active', ${now.toISOString()}, ${end.toISOString()})
      `;
      updates.push(`plan changed to ${body.planSlug}`);
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
  }

  const result = await sql`SELECT id, email, name, role, disabled, created_at FROM users WHERE id = ${id}`;
  if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user: result.rows[0], updates });
}
