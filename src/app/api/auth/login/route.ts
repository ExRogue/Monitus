import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';
import { dbRateLimit, getClientIp } from '@/lib/rate-limit';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Rate limit: 5 login attempts per minute per IP (DB-backed for serverless)
    const ip = getClientIp(request);
    const rl = await dbRateLimit(`login:${ip}`, 5, 60_000);
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_001', retryAfter },
        { status: 429 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required', code: 'AUTH_002' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email or password', code: 'AUTH_003' }, { status: 401 });
    }

    const result = await login(email.trim().toLowerCase(), password);

    if (!result.success) {
      return NextResponse.json({ error: result.error, code: 'AUTH_003' }, { status: 401 });
    }

    // Email verification disabled for now — treat all users as verified
    const responseData: any = { user: result.user };

    const response = NextResponse.json(responseData);
    response.cookies.set('monitus_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('monitus_ev', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error?.message || error, error?.stack);
    return NextResponse.json({ error: 'Login failed. Please try again or contact support@monitus.ai.' }, { status: 500 });
  }
}
