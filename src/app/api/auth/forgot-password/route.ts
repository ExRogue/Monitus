import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail } from '@/lib/email';
import * as crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Rate limit: 3 forgot-password attempts per minute per IP
  const ip = getClientIp(request);
  const rl = rateLimit(`forgot-password:${ip}`, 3, 60_000);
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter },
      { status: 429 }
    );
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
      try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600_000).toISOString(); // 1 hour

        const id = uuidv4();
        await sql`
          INSERT INTO password_resets (id, user_id, token, expires_at)
          VALUES (${id}, ${result.rows[0].id}, ${token}, ${expires})
        `;

        // Fire-and-forget so email failure doesn't crash the endpoint
        sendPasswordResetEmail(result.rows[0].email, token).catch((err) =>
          console.error('Failed to send password reset email:', err)
        );
      } catch (err) {
        // Log but don't expose internal error — still return success to prevent enumeration
        console.error('Password reset token creation failed:', err);
      }
    }

    return NextResponse.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
