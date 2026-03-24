import { NextRequest, NextResponse } from 'next/server';
import { googleLogin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

const TRIAL_DAYS = 7;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

    if (error) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_invalid`);
    }

    // Verify CSRF state
    const savedState = request.cookies.get('google_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_state`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_token`);
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_userinfo`);
    }

    const googleUser = await userInfoRes.json();
    const { id: googleId, email, name } = googleUser;

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_no_email`);
    }

    // Check if this is a new user (for trial setup)
    await getDb();
    const existingUser = await sql`SELECT id FROM users WHERE google_id = ${googleId} OR email = ${email}`;
    const isNewUser = existingUser.rows.length === 0;

    // Login or create user
    const result = await googleLogin(googleId, email, name || email.split('@')[0]);

    if (!result.success) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_auth`);
    }

    // Set up trial for new users
    if (isNewUser && result.user) {
      try {
        const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        const trialSubId = uuidv4();
        await sql`UPDATE users SET trial_ends_at = ${trialEnd.toISOString()} WHERE id = ${result.user.id}`;
        await sql`
          INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
          VALUES (${trialSubId}, ${result.user.id}, 'plan-trial', 'active', NOW(), ${trialEnd.toISOString()})
          ON CONFLICT DO NOTHING
        `;
      } catch (e) {
        console.error('Trial setup error for Google user:', e);
      }
    }

    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    response.cookies.set('monitus_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    // Google users are auto-verified
    response.cookies.set('monitus_ev', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    // Clear the OAuth state cookie
    response.cookies.delete('google_oauth_state');

    return response;
  } catch (error: any) {
    console.error('Google OAuth callback error:', error?.message || error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';
    return NextResponse.redirect(`${baseUrl}/login?error=google_server`);
  }
}
