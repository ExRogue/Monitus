import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';

const bcryptHash = (bcrypt as any).default?.hash || bcrypt.hash;

const ADMIN_EMAIL = 'admin@telum.io';
const ADMIN_PASSWORD = 'Telum2026!';
const ADMIN_NAME = 'Telum Admin';

// Called from initDb() — do NOT call getDb() here to avoid recursive initialization
export async function seedAdmin() {
  const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL}`;

  if (existing.rows.length > 0) {
    // Ensure role is admin even if account exists
    await sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = ${ADMIN_EMAIL}`;
    return;
  }

  const id = uuidv4();
  const passwordHash = await bcryptHash(ADMIN_PASSWORD, 12);

  await sql`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (${id}, ${ADMIN_EMAIL}, ${passwordHash}, ${ADMIN_NAME}, 'admin')
    ON CONFLICT (email) DO UPDATE SET role = 'admin', updated_at = NOW()
  `;
}
