import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { isValidEmail, rateLimit } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 login attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`login:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const result = await login(email.trim().toLowerCase(), password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ user: result.user });
    response.cookies.set('monitus_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error?.message || error, error?.stack);
    return NextResponse.json({ error: 'Login failed. Please try again or contact support@monitus.ai.' }, { status: 500 });
  }
}
