/**
 * Slack OAuth2 & API helper functions.
 *
 * Env vars required:
 *   SLACK_CLIENT_ID
 *   SLACK_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 */

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';
const SLACK_CONVERSATIONS_URL = 'https://slack.com/api/conversations.list';

const SCOPES = 'chat:write,channels:read';

function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';
  return `${baseUrl}/api/auth/slack/callback`;
}

/**
 * Build the Slack OAuth2 authorize URL.
 */
export function getSlackAuthUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error('SLACK_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: getRedirectUri(),
    state,
  });

  return `${SLACK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeCodeForToken(code: string): Promise<{
  ok: boolean;
  access_token: string;
  token_type: string;
  team: { id: string; name: string };
  authed_user: { id: string };
  incoming_webhook?: { channel: string; channel_id: string; url: string };
}> {
  const res = await fetch(SLACK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || '',
      client_secret: process.env.SLACK_CLIENT_SECRET || '',
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack token exchange failed: ${data.error || 'unknown'}`);
  }

  return data;
}

/**
 * List public channels the bot can post to.
 */
export async function listChannels(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}>> {
  const channels: Array<{ id: string; name: string; is_private: boolean; num_members: number }> = [];
  let cursor = '';

  // Paginate (usually 1-2 pages)
  for (let i = 0; i < 5; i++) {
    const params = new URLSearchParams({
      types: 'public_channel',
      exclude_archived: 'true',
      limit: '200',
    });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${SLACK_CONVERSATIONS_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[slack] listChannels failed:', data.error);
      break;
    }

    for (const ch of data.channels || []) {
      channels.push({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private || false,
        num_members: ch.num_members || 0,
      });
    }

    cursor = data.response_metadata?.next_cursor || '';
    if (!cursor) break;
  }

  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Post a Block Kit message to a Slack channel via the API.
 */
export async function postMessage(
  accessToken: string,
  channelId: string,
  blocks: any[],
  text?: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const res = await fetch(SLACK_POST_MESSAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      blocks,
      text: text || 'Monitus Signal Alert',
    }),
  });

  return res.json();
}
