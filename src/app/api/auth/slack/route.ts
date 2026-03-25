import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSlackAuthUrl } from '@/lib/slack';
import * as crypto from 'crypto';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';
    return NextResponse.redirect(`${baseUrl}/login?error=login_required`);
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Slack OAuth not configured' }, { status: 500 });
  }

  const state = crypto.randomBytes(32).toString('hex');

  let authUrl: string;
  try {
    authUrl = getSlackAuthUrl(state);
  } catch (err) {
    console.error('[slack] Auth URL error:', err);
    return NextResponse.json({ error: 'Slack OAuth not configured' }, { status: 500 });
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('slack_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
