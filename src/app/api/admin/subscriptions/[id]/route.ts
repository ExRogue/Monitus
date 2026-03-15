import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

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

  if (body.status === 'cancelled') {
    await sql`UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Subscription cancelled' });
  }

  if (body.status === 'active') {
    await sql`UPDATE subscriptions SET status = 'active', cancel_at_period_end = false, updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Subscription reactivated' });
  }

  if (body.plan_id) {
    await sql`UPDATE subscriptions SET plan_id = ${body.plan_id}, updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Plan updated' });
  }

  return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
}
