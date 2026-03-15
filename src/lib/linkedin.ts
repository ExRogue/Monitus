/**
 * LinkedIn OAuth2 & API helper functions.
 *
 * Env vars required:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 */

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_UGC_URL = 'https://api.linkedin.com/v2/ugcPosts';

const SCOPES = 'openid profile w_member_social';

function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';
  return `${baseUrl}/api/auth/linkedin/callback`;
}

/**
 * Build the LinkedIn OAuth2 authorize URL.
 */
export function getLinkedInAuthUrl(state: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    throw new Error('LINKEDIN_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    state,
    scope: SCOPES,
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access/refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Fetch the authenticated user's LinkedIn profile via the userinfo endpoint.
 */
export async function getLinkedInProfile(
  accessToken: string
): Promise<{ sub: string; name: string; picture?: string }> {
  const res = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn profile fetch failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Post a text share to LinkedIn using the UGC (restli) API.
 */
export async function postToLinkedIn(
  accessToken: string,
  text: string,
  authorUrn: string
): Promise<{ id: string }> {
  const payload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch(LINKEDIN_UGC_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn post failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Refresh an expired LinkedIn access token.
 */
export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${body}`);
  }

  return res.json();
}
