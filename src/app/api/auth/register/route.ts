import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';
import { isValidEmail, validatePassword, sanitizeName, rateLimit } from '@/lib/validation';
import { sendWelcomeEmail, sendEmailVerification } from '@/lib/email';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const TRIAL_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registration attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.message }, { status: 400 });
    }

    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Please enter a valid name' }, { status: 400 });
    }

    const result = await register(email.trim().toLowerCase(), password, sanitizedName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json({ user: result.user });
    response.cookies.set('monitus_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Create 7-day free trial subscription
    try {
      await getDb();
      const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const trialSubId = uuidv4();

      // Set trial_ends_at on the user
      await sql`UPDATE users SET trial_ends_at = ${trialEnd.toISOString()} WHERE id = ${result.user!.id}`;

      // Create a trial subscription with Starter-level access
      await sql`
        INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
        VALUES (${trialSubId}, ${result.user!.id}, 'plan-trial', 'active', NOW(), ${trialEnd.toISOString()})
        ON CONFLICT DO NOTHING
      `;
    } catch (trialErr) {
      console.error('Trial setup error:', trialErr);
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(result.user!.id, email.trim().toLowerCase(), sanitizedName).catch(() => {});

    // Send email verification (non-blocking)
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyId = uuidv4();
      const expires = new Date(Date.now() + 86400_000).toISOString(); // 24 hours
      await sql`
        INSERT INTO email_verifications (id, user_id, token, expires_at)
        VALUES (${verifyId}, ${result.user!.id}, ${verifyToken}, ${expires})
      `;
      sendEmailVerification(email.trim().toLowerCase(), verifyToken).catch(() => {});
    } catch (e) {
      console.error('Email verification setup failed:', e);
    }

    return response;
  } catch (error: any) {
    console.error('Register error:', error?.message || error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
