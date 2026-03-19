import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const bcryptHash = (bcrypt as any).default?.hash || bcrypt.hash;

const ADMIN_EMAIL = 'admin@monitus.ai';
const ADMIN_NAME = 'Monitus Admin';
// In production, set ADMIN_SEED_PASSWORD env var to override the default password
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin123!';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    await getDb();

    const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL}`;
    let adminId: string;

    if (existing.rows.length > 0) {
      adminId = existing.rows[0].id;
      const passwordHash = await bcryptHash(ADMIN_PASSWORD, 12);
      await sql`
        UPDATE users
        SET role = 'admin', password_hash = ${passwordHash}, updated_at = NOW()
        WHERE email = ${ADMIN_EMAIL}
      `;
    } else {
      adminId = uuidv4();
      const passwordHash = await bcryptHash(ADMIN_PASSWORD, 12);
      await sql`
        INSERT INTO users (id, email, password_hash, name, role)
        VALUES (${adminId}, ${ADMIN_EMAIL}, ${passwordHash}, ${ADMIN_NAME}, 'admin')
      `;
    }

    // Give admin the Intelligence (enterprise) plan — all features
    const subId = `sub-admin-${adminId.slice(0, 8)}`;
    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Remove any existing subscriptions for this user first
    await sql`DELETE FROM subscriptions WHERE user_id = ${adminId}`;
    await sql`
      INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
      VALUES (${subId}, ${adminId}, 'plan-enterprise', 'active', NOW(), ${periodEnd})
    `;

    // Create a demo company if admin doesn't have one
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${adminId} LIMIT 1`;
    if (companyResult.rows.length === 0) {
      const companyId = uuidv4();
      await sql`
        INSERT INTO companies (id, user_id, name, type, niche, description)
        VALUES (${companyId}, ${adminId}, 'Monitus Demo', 'insurer', 'Cyber & Specialty', 'Demo admin company with all features enabled')
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account seeded successfully',
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
      plan: 'Intelligence (all features)',
      role: 'admin',
    });
  } catch (error: any) {
    console.error('Seed admin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
