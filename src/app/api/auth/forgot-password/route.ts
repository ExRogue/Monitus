import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit } from '@/lib/validation';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`forgot-password:${ip}`, 5, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await getDb();

    // Always return success to prevent email enumeration
    const result = await sql`SELECT id, email FROM users WHERE email = ${email}`;
    if (result.rows[0]) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600_000).toISOString(); // 1 hour

      // Store reset token
      await sql`
        CREATE TABLE IF NOT EXISTS password_resets (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      const id = uuidv4();
      await sql`
        INSERT INTO password_resets (id, user_id, token, expires_at)
        VALUES (${id}, ${result.rows[0].id}, ${token}, ${expires})
      `;

      await sendPasswordResetEmail(result.rows[0].email, token);
    }

    return NextResponse.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
