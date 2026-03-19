import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';
import { rateLimit } from '@/lib/validation';
import { postToLinkedIn, refreshLinkedInToken } from '@/lib/linkedin';
import { decrypt, encrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gate behind linkedin_api tier (Growth+)
  const gate = await checkTierAccess(user.id, 'linkedin_api');
  if (!gate.allowed) {
    return NextResponse.json(tierDeniedResponse(gate), { status: 403 });
  }

  const rl = rateLimit(`linkedin-post:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { content_id } = body;

    if (!content_id || typeof content_id !== 'string') {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
    }

    await getDb();

    // Get user's company
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    // Get the content to post
    const contentResult = await sql`
      SELECT id, title, content, content_type, status
      FROM generated_content
      WHERE id = ${content_id} AND company_id = ${company.id}
    `;
    const contentRow = contentResult.rows[0];
    if (!contentRow) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Get user's LinkedIn OAuth connection
    const connectionResult = await sql`
      SELECT id, access_token, refresh_token, token_expires_at, provider_user_id
      FROM oauth_connections
      WHERE user_id = ${user.id} AND provider = 'linkedin'
      LIMIT 1
    `;
    const connection = connectionResult.rows[0];
    if (!connection) {
      return NextResponse.json(
        { error: 'LinkedIn account not connected. Please connect your LinkedIn account in Settings.' },
        { status: 400 }
      );
    }

    let accessToken = decrypt(connection.access_token);
    const tokenExpiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at).getTime()
      : 0;

    // Refresh token if expired or expiring within 5 minutes
    if (tokenExpiresAt < Date.now() + 5 * 60 * 1000) {
      if (!connection.refresh_token) {
        return NextResponse.json(
          { error: 'LinkedIn token expired and no refresh token available. Please reconnect your LinkedIn account in Settings.' },
          { status: 401 }
        );
      }

      try {
        const refreshed = await refreshLinkedInToken(decrypt(connection.refresh_token));
        accessToken = refreshed.access_token;
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

        // Update stored tokens
        await sql`
          UPDATE oauth_connections
          SET access_token = ${encrypt(refreshed.access_token)},
              token_expires_at = ${newExpiresAt},
              updated_at = NOW()
          WHERE id = ${connection.id}
        `;
      } catch (refreshErr: any) {
        console.error('LinkedIn token refresh failed:', refreshErr?.message || refreshErr);
        return NextResponse.json(
          { error: 'LinkedIn token refresh failed. Please reconnect your LinkedIn account in Settings.' },
          { status: 401 }
        );
      }
    }

    // Post to LinkedIn
    const authorUrn = `urn:li:person:${connection.provider_user_id}`;
    const linkedInResult = await postToLinkedIn(accessToken, contentRow.content, authorUrn);

    // Track the posting event
    const eventId = uuidv4();
    await sql`
      INSERT INTO usage_events (id, user_id, event_type, metadata, created_at)
      VALUES (
        ${eventId},
        ${user.id},
        'linkedin_api_posted',
        ${JSON.stringify({
          content_id,
          linkedin_post_id: linkedInResult.id,
          posted_at: new Date().toISOString(),
        })},
        NOW()
      )
    `;

    // Update content status
    await sql`
      UPDATE generated_content
      SET status = 'posted', updated_at = NOW()
      WHERE id = ${content_id}
    `;

    // Upsert distribution record as published
    const distId = uuidv4();
    await sql`
      INSERT INTO content_distributions (
        id, content_id, company_id, channel, status, published_at, external_url
      )
      VALUES (
        ${distId}, ${content_id}, ${company.id}, 'linkedin', 'published', NOW(),
        ${`https://www.linkedin.com/feed/update/${linkedInResult.id}`}
      )
    `;

    return NextResponse.json({
      success: true,
      linkedin_post_id: linkedInResult.id,
      posted_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('LinkedIn direct post error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to post to LinkedIn' }, { status: 500 });
  }
}
