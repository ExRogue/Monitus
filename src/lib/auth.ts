import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { cookies } from 'next/headers';

const TOKEN_EXPIRY = '7d';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'monitus-dev-secret-local-only';
  }
  return secret;
}

// bcryptjs 3.x is ESM — resolve hash/compare from default or named exports
const bcryptHash = (bcrypt as any).default?.hash || bcrypt.hash;
const bcryptCompare = (bcrypt as any).default?.compare || bcrypt.compare;
const jwtSign = (jwt as any).default?.sign || jwt.sign;
const jwtVerify = (jwt as any).default?.verify || jwt.verify;

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  email_verified?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  await getDb();

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.rows.length > 0) {
    return { success: false, error: 'Email already registered' };
  }

  const id = uuidv4();
  const passwordHash = await bcryptHash(password, 12);

  await sql`INSERT INTO users (id, email, password_hash, name, role) VALUES (${id}, ${email}, ${passwordHash}, ${name}, ${'user'})`;

  const user: User = { id, email, name, role: 'user', created_at: new Date().toISOString() };
  const token = jwtSign({ userId: id, email }, getSecret(), { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  await getDb();

  const result = await sql`SELECT * FROM users WHERE email = ${email} AND disabled IS NOT TRUE`;
  const row = result.rows[0];
  if (!row) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (row.password_hash === '__google_oauth__') {
    return { success: false, error: 'This account uses Google sign-in. Please click "Continue with Google" above.' };
  }

  const valid = await bcryptCompare(password, row.password_hash);
  if (!valid) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user: User = { id: row.id, email: row.email, name: row.name, role: row.role || 'user', created_at: row.created_at };
  const token = jwtSign({ userId: row.id, email: row.email }, getSecret(), { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwtVerify(token, getSecret()) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('monitus_token')?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    await getDb();
    const result = await sql`SELECT id, email, name, role, created_at, token_invalidated_at, email_verified FROM users WHERE id = ${payload.userId} AND disabled IS NOT TRUE`;
    const row = result.rows[0];
    if (!row) return null;

    // Check if token was issued before invalidation (password change, account disable)
    if (row.token_invalidated_at) {
      try {
        const decoded = jwtVerify(token, getSecret()) as any;
        const issuedAt = (decoded?.iat || 0) * 1000;
        const invalidatedAt = new Date(row.token_invalidated_at).getTime();
        if (issuedAt < invalidatedAt) return null;
      } catch {
        return null;
      }
    }

    return {
      ...row,
      email_verified: row.email_verified === true || row.email_verified === 'true',
    } as unknown as User;
  } catch {
    return null;
  }
}

export async function googleLogin(googleId: string, email: string, name: string): Promise<AuthResult> {
  await getDb();

  // Check if user exists by google_id
  let result = await sql`SELECT * FROM users WHERE google_id = ${googleId} AND disabled IS NOT TRUE`;
  let row = result.rows[0];

  if (!row) {
    // Check if email already exists (link accounts)
    result = await sql`SELECT * FROM users WHERE email = ${email} AND disabled IS NOT TRUE`;
    row = result.rows[0];

    if (row) {
      // Link Google ID to existing account
      await sql`UPDATE users SET google_id = ${googleId}, email_verified = true, updated_at = NOW() WHERE id = ${row.id}`;
    } else {
      // Create new user (no password needed for Google-only users)
      const id = uuidv4();
      await sql`
        INSERT INTO users (id, email, password_hash, name, role, google_id, email_verified)
        VALUES (${id}, ${email}, ${'__google_oauth__'}, ${name}, ${'user'}, ${googleId}, true)
      `;
      row = { id, email, name, role: 'user', created_at: new Date().toISOString() };
    }
  }

  const user: User = { id: row.id, email: row.email, name: row.name, role: row.role || 'user', created_at: row.created_at };
  const token = jwtSign({ userId: row.id, email: row.email }, getSecret(), { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export async function isAdmin(userId: string): Promise<boolean> {
  await getDb();
  const result = await sql`SELECT role FROM users WHERE id = ${userId}`;
  return result.rows[0]?.role === 'admin';
}

export async function setUserRole(userId: string, role: string): Promise<void> {
  await getDb();
  await sql`UPDATE users SET role = ${role}, updated_at = NOW() WHERE id = ${userId}`;
}
