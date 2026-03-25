import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { exchangeCodeForToken } from '@/lib/slack';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?error=login_required`);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&slack=denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&slack=invalid`);
    }

    // Verify CSRF state
    const savedState = request.cookies.get('slack_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      console.error('[slack-auth] State mismatch');
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&slack=state_error`);
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);

    await getDb();

    // Get user's company
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    const companyId = companyResult.rows[0]?.id || '';

    const encryptedToken = encrypt(tokenData.access_token);

    // Upsert oauth_connections
    const existing = await sql`
      SELECT id FROM oauth_connections WHERE user_id = ${user.id} AND provider = 'slack' LIMIT 1
    `;

    if (existing.rows.length > 0) {
      await sql`
        UPDATE oauth_connections
        SET access_token = ${encryptedToken},
            refresh_token = '',
            token_expires_at = NULL,
            provider_user_id = ${tokenData.authed_user.id},
            profile_name = ${tokenData.team.name || ''},
            profile_url = '',
            scopes = ${JSON.stringify(['chat:write', 'channels:read'])},
            company_id = ${companyId},
            updated_at = NOW()
        WHERE id = ${existing.rows[0].id}
      `;
    } else {
      const id = uuidv4();
      await sql`
        INSERT INTO oauth_connections (
          id, user_id, company_id, provider, provider_user_id,
          access_token, refresh_token, token_expires_at,
          scopes, profile_name, profile_url
        ) VALUES (
          ${id}, ${user.id}, ${companyId}, 'slack', ${tokenData.authed_user.id},
          ${encryptedToken}, '', NULL,
          ${JSON.stringify(['chat:write', 'channels:read'])},
          ${tokenData.team.name || ''}, ''
        )
      `;
    }

    // Update company with team name + default channel if provided
    const channelId = tokenData.incoming_webhook?.channel_id || '';
    const channelName = tokenData.incoming_webhook?.channel || '';

    await sql`
      UPDATE companies
      SET slack_team_name = ${tokenData.team.name || ''},
          slack_channel_id = CASE WHEN ${channelId} != '' THEN ${channelId} ELSE slack_channel_id END,
          slack_channel_name = CASE WHEN ${channelName} != '' THEN ${channelName} ELSE slack_channel_name END
      WHERE id = ${companyId}
    `;

    const response = NextResponse.redirect(`${baseUrl}/settings?tab=integrations&slack=connected`);
    response.cookies.delete('slack_oauth_state');
    return response;
  } catch (err: any) {
    console.error('[slack-auth] Callback error:', err?.message || err);
    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&slack=error`);
  }
}
