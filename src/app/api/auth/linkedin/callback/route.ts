import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { exchangeCodeForTokens, getLinkedInProfile } from '@/lib/linkedin';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

  try {
    // User must be logged in
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?error=login_required`);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings?linkedin=denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?linkedin=invalid`);
    }

    // Verify CSRF state
    const savedState = request.cookies.get('linkedin_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/settings?linkedin=state_error`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get LinkedIn profile
    const profile = await getLinkedInProfile(tokens.access_token);

    await getDb();

    // Get user's company
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    const companyId = companyResult.rows[0]?.id || '';

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Upsert the oauth_connections record
    const existingConnection = await sql`
      SELECT id FROM oauth_connections
      WHERE user_id = ${user.id} AND provider = 'linkedin'
      LIMIT 1
    `;

    if (existingConnection.rows.length > 0) {
      // Update existing connection
      await sql`
        UPDATE oauth_connections
        SET access_token = ${tokens.access_token},
            refresh_token = ${tokens.refresh_token || ''},
            token_expires_at = ${tokenExpiresAt},
            provider_user_id = ${profile.sub},
            profile_name = ${profile.name || ''},
            profile_url = ${`https://www.linkedin.com/in/${profile.sub}`},
            scopes = ${JSON.stringify(['openid', 'profile', 'w_member_social'])},
            company_id = ${companyId},
            updated_at = NOW()
        WHERE id = ${existingConnection.rows[0].id}
      `;
    } else {
      // Insert new connection
      const id = uuidv4();
      await sql`
        INSERT INTO oauth_connections (
          id, user_id, company_id, provider, provider_user_id,
          access_token, refresh_token, token_expires_at,
          scopes, profile_name, profile_url
        )
        VALUES (
          ${id}, ${user.id}, ${companyId}, 'linkedin', ${profile.sub},
          ${tokens.access_token}, ${tokens.refresh_token || ''}, ${tokenExpiresAt},
          ${JSON.stringify(['openid', 'profile', 'w_member_social'])},
          ${profile.name || ''},
          ${`https://www.linkedin.com/in/${profile.sub}`}
        )
      `;
    }

    const response = NextResponse.redirect(`${baseUrl}/settings?linkedin=connected`);
    // Clear the OAuth state cookie
    response.cookies.delete('linkedin_oauth_state');

    return response;
  } catch (err: any) {
    console.error('LinkedIn OAuth callback error:', err?.message || err);
    return NextResponse.redirect(`${baseUrl}/settings?linkedin=error`);
  }
}
