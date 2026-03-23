import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendVerificationCode } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import * as crypto from 'crypto';

function generateVerificationCode(): string {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

// POST: verify a 6-digit code
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limit: 5 attempts per 10 minutes per user
    const ip = getClientIp(request);
    const rl = rateLimit(`verify-email:${user.id}`, 5, 10 * 60 * 1000);
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many attempts. Please wait before trying again.', code: 'RATE_001', retryAfter },
        { status: 429 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { code } = body;
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code', code: 'VERIFY_001' }, { status: 400 });
    }

    await getDb();

    // Fetch user's verification code
    const result = await sql`
      SELECT verification_code, verification_code_expires, email_verified
      FROM users WHERE id = ${user.id}
    `;
    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (row.email_verified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    if (!row.verification_code || !row.verification_code_expires) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.', code: 'VERIFY_002' }, { status: 400 });
    }

    // Check expiry
    const expiresAt = new Date(row.verification_code_expires).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: 'Code has expired. Please request a new one.', code: 'VERIFY_003' }, { status: 400 });
    }

    // Check code match (timing-safe comparison)
    const codeMatch = crypto.timingSafeEqual(
      Buffer.from(code, 'utf8'),
      Buffer.from(row.verification_code, 'utf8')
    );

    if (!codeMatch) {
      return NextResponse.json({
        error: 'Incorrect code. Please check and try again.',
        code: 'VERIFY_004',
        remaining: rl.remaining,
      }, { status: 400 });
    }

    // Code is valid - mark user as verified and clear the code
    await sql`
      UPDATE users
      SET email_verified = true, verification_code = NULL, verification_code_expires = NULL, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    const response = NextResponse.json({ success: true });
    // Update the middleware hint cookie
    response.cookies.set('monitus_ev', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Email verification error:', error?.message || error);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}

// PUT: resend verification code
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limit: 3 resends per 10 minutes
    const rl = rateLimit(`resend-verify:${user.id}`, 3, 10 * 60 * 1000);
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many resend requests. Please wait.', code: 'RATE_001', retryAfter },
        { status: 429 }
      );
    }

    await getDb();

    const result = await sql`
      SELECT email, name, email_verified, verification_code_expires
      FROM users WHERE id = ${user.id}
    `;
    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (row.email_verified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // Enforce 60-second cooldown between resends
    if (row.verification_code_expires) {
      // The code was set with a 15-minute expiry, so we can compute when it was last sent
      const expiresAt = new Date(row.verification_code_expires).getTime();
      const sentAt = expiresAt - 15 * 60 * 1000;
      const elapsed = Date.now() - sentAt;
      if (elapsed < 60_000) {
        const waitSeconds = Math.ceil((60_000 - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code.`, code: 'VERIFY_005', waitSeconds },
          { status: 429 }
        );
      }
    }

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await sql`
      UPDATE users
      SET verification_code = ${code}, verification_code_expires = ${expiresAt}
      WHERE id = ${user.id}
    `;

    sendVerificationCode(row.email, code, row.name || '').catch(() => {});

    return NextResponse.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    console.error('Resend verification error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to resend code. Please try again.' }, { status: 500 });
  }
}

// Keep the old GET handler for legacy token-based verification links
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
  }

  try {
    await getDb();

    const result = await sql`
      SELECT user_id, id as verification_id FROM email_verifications
      WHERE token = ${token} AND used = false AND expires_at > NOW()
      LIMIT 1
    `;

    if (!result.rows[0]) {
      return NextResponse.redirect(new URL('/login?error=expired-token', request.url));
    }

    const { user_id, verification_id } = result.rows[0];

    await sql`UPDATE users SET email_verified = true, verification_code = NULL, verification_code_expires = NULL, updated_at = NOW() WHERE id = ${user_id}`;
    await sql`UPDATE email_verifications SET used = true WHERE id = ${verification_id}`;

    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/login?error=verification-failed', request.url));
  }
}
