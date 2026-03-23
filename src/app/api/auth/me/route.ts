import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let plan = null;
  try {
    await getDb();
    const sub = await sql`SELECT plan_id, status FROM subscriptions WHERE user_id = ${user.id} AND status = 'active' ORDER BY created_at DESC LIMIT 1`;
    plan = sub.rows[0] || null;
  } catch (e) {
    console.error('Failed to fetch subscription:', e);
  }

  const response = NextResponse.json({ user, plan });

  // Sync the email-verified hint cookie with the actual DB state
  response.cookies.set('monitus_ev', user.email_verified ? '1' : '0', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
