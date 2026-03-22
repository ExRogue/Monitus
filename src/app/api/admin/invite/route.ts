import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { sendTeamInviteEmail } from '@/lib/email';

const bcryptHash = (bcrypt as any).default?.hash || bcrypt.hash;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, name, role, plan } = body;

  if (!email || !name) {
    return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
  }

  if (role && !['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  await getDb();

  // Check if user already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.rows[0]) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Create user with a random temporary password
  const id = uuidv4();
  const tempPassword = uuidv4().replace(/-/g, '').slice(0, 16);
  const passwordHash = await bcryptHash(tempPassword, 12);
  const userRole = role || 'user';

  await sql`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (${id}, ${email}, ${passwordHash}, ${name}, ${userRole})
  `;

  // Create subscription if a plan is specified
  const planSlug = plan || 'trial';
  const planResult = await sql`SELECT id, name, slug FROM subscription_plans WHERE slug = ${planSlug}`;
  let planName = 'Free Trial';
  let planSlugActual = 'trial';

  if (planResult.rows[0]) {
    const subId = `invite-${Date.now()}`;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    await sql`
      INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
      VALUES (${subId}, ${id}, ${planResult.rows[0].id}, 'active', ${now.toISOString()}, ${end.toISOString()})
    `;
    planName = planResult.rows[0].name;
    planSlugActual = planResult.rows[0].slug;
  }

  // Send invite email via Loops (best-effort)
  try {
    const inviteToken = uuidv4();
    await sendTeamInviteEmail(email, user.name || 'Admin', 'Monitus', inviteToken);
  } catch (emailErr) {
    console.error('Failed to send invite email:', emailErr);
    // Don't fail the request if email fails
  }

  return NextResponse.json({
    success: true,
    user: {
      id,
      email,
      name,
      role: userRole,
      disabled: false,
      created_at: new Date().toISOString(),
      plan_name: planName,
      plan_slug: planSlugActual,
    },
  });
}
