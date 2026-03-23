import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';
import { isValidEmail, validatePassword, sanitizeName } from '@/lib/validation';
import { sendWelcomeEmail, sendVerificationCode, scheduleOnboardingDrip } from '@/lib/email';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const TRIAL_DAYS = 14;

function generateVerificationCode(): string {
  // Generate a cryptographically random 6-digit numeric code
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Rate limit: 3 registration attempts per minute per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`register:${ip}`, 3, 60_000);
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_001', retryAfter },
        { status: 429 }
      );
    }

    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'All fields are required', code: 'REG_001' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address', code: 'REG_002' }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.message, code: 'REG_003' }, { status: 400 });
    }

    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Please enter a valid name', code: 'REG_004' }, { status: 400 });
    }

    const result = await register(email.trim().toLowerCase(), password, sanitizedName);

    if (!result.success) {
      return NextResponse.json({ error: result.error, code: 'REG_005' }, { status: 400 });
    }

    const response = NextResponse.json({ user: result.user, requiresVerification: true });
    response.cookies.set('monitus_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    // Set email-verified hint cookie for middleware (not httpOnly — client reads it)
    response.cookies.set('monitus_ev', '0', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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

    // Schedule onboarding drip emails (Days 2, 5, 12)
    scheduleOnboardingDrip(result.user!.id, email.trim().toLowerCase(), sanitizedName).catch(() => {});

    // Generate and store 6-digit verification code, send via email
    try {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
      await sql`
        UPDATE users
        SET verification_code = ${code}, verification_code_expires = ${expiresAt}
        WHERE id = ${result.user!.id}
      `;
      sendVerificationCode(email.trim().toLowerCase(), code, sanitizedName).catch(() => {});
    } catch (e) {
      console.error('Verification code setup failed:', e);
    }

    return response;
  } catch (error: any) {
    console.error('Register error:', error?.message || error);
    const message = error?.message || '';
    if (message.includes('JWT_SECRET')) {
      return NextResponse.json({ error: 'Service configuration error. Please contact support.' }, { status: 500 });
    }
    if (message.includes('connect') || message.includes('database') || message.includes('POSTGRES')) {
      return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Registration failed. Please try again or contact support@monitus.ai.' }, { status: 500 });
  }
}
