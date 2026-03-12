import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'telum-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

export interface User {
  id: string;
  email: string;
  name: string;
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
  const passwordHash = await bcrypt.hash(password, 12);

  await sql`INSERT INTO users (id, email, password_hash, name) VALUES (${id}, ${email}, ${passwordHash}, ${name})`;

  const user: User = { id, email, name, created_at: new Date().toISOString() };
  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  await getDb();

  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  const row = result.rows[0];
  if (!row) {
    return { success: false, error: 'Invalid email or password' };
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user: User = { id: row.id, email: row.email, name: row.name, created_at: row.created_at };
  const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
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
    const result = await sql`SELECT id, email, name, created_at FROM users WHERE id = ${payload.userId}`;
    const row = result.rows[0];
    if (row) return row as unknown as User;

    // On serverless cold start the DB might not have this user yet,
    // but the JWT signature proves identity. Construct from token.
    return {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split('@')[0],
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
