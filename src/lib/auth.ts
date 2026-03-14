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
    return 'telum-dev-secret-local-only';
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
    const token = cookieStore.get('telum_token')?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    await getDb();
    const result = await sql`SELECT id, email, name, role, created_at FROM users WHERE id = ${payload.userId} AND disabled IS NOT TRUE`;
    const row = result.rows[0];
    if (row) return row as unknown as User;

    // On serverless cold start the DB might not have this user yet,
    // but the JWT signature proves identity. Construct from token.
    return {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split('@')[0],
      role: 'user',
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
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
