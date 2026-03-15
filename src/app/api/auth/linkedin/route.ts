import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getLinkedInAuthUrl } from '@/lib/linkedin';

export async function GET(request: NextRequest) {
  // User must be logged in to connect LinkedIn
  const user = await getCurrentUser();
  if (!user) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';
    return NextResponse.redirect(`${baseUrl}/login?error=login_required`);
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LinkedIn OAuth not configured' }, { status: 500 });
  }

  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString('hex');

  let authUrl: string;
  try {
    authUrl = getLinkedInAuthUrl(state);
  } catch (err) {
    console.error('LinkedIn auth URL error:', err);
    return NextResponse.json({ error: 'LinkedIn OAuth not configured' }, { status: 500 });
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
