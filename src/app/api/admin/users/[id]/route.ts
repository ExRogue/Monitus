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
  const body = await request.json();

  await getDb();

  // Prevent admin from modifying themselves
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

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
  }

  // Fetch updated user
  const result = await sql`SELECT id, email, name, role, disabled, created_at FROM users WHERE id = ${id}`;
  if (!result.rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: result.rows[0], updates });
}
