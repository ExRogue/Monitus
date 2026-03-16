import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';

const bcryptHash = (bcrypt as any).default?.hash || bcrypt.hash;

const ADMIN_EMAIL = 'admin@monitus.ai';
const ADMIN_NAME = 'Monitus Admin';

// Called from initDb() — do NOT call getDb() here to avoid recursive initialization
export async function seedAdmin() {
  const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.log('ADMIN_SEED_PASSWORD not set — skipping admin seed');
    return;
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL}`;

  let adminId: string;

  if (existing.rows.length > 0) {
    adminId = existing.rows[0].id;
    // Ensure role is admin even if account exists
    await sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = ${ADMIN_EMAIL}`;
  } else {
    adminId = uuidv4();
    const passwordHash = await bcryptHash(ADMIN_PASSWORD, 12);

    await sql`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (${adminId}, ${ADMIN_EMAIL}, ${passwordHash}, ${ADMIN_NAME}, 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin', updated_at = NOW()
    `;
  }

  // Give admin the Intelligence (enterprise) plan — all features unlocked
  const subId = `sub-admin-${adminId.slice(0, 8)}`;
  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

  await sql`
    INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (${subId}, ${adminId}, 'plan-enterprise', 'active', NOW(), ${periodEnd})
    ON CONFLICT (id) DO UPDATE SET plan_id = 'plan-enterprise', status = 'active', current_period_end = ${periodEnd}, updated_at = NOW()
  `;
}
