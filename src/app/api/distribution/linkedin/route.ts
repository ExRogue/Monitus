import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, sanitizeString } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

const LINKEDIN_CHAR_LIMIT = 3000;
const LINKEDIN_HASHTAG_LIMIT = 5;
const LINKEDIN_OPTIMAL_LENGTH = 1300;

interface LinkedInFormatResult {
  formattedContent: string;
  characterCount: number;
  hashtagCount: number;
  hookLine: string;
  status: 'ok' | 'warning' | 'over_limit';
  statusMessage: string;
  optimisations: string[];
}

function formatForLinkedIn(rawContent: string): LinkedInFormatResult {
  let content = rawContent.trim();
  const optimisations: string[] = [];

  // Extract existing hashtags
  const hashtagRegex = /#[A-Za-z]\w{0,49}/g;
  const existingHashtags = content.match(hashtagRegex) || [];

  // Remove duplicate hashtags
  const uniqueHashtags = [...new Set(existingHashtags)];
  if (existingHashtags.length !== uniqueHashtags.length) {
    optimisations.push('Removed duplicate hashtags');
  }

  // Warn if too many hashtags
  if (uniqueHashtags.length > LINKEDIN_HASHTAG_LIMIT) {
    optimisations.push(
      `Reduced hashtags from ${uniqueHashtags.length} to ${LINKEDIN_HASHTAG_LIMIT} (LinkedIn best practice)`
    );
  }
  const finalHashtags = uniqueHashtags.slice(0, LINKEDIN_HASHTAG_LIMIT);

  // Remove all hashtags from content body — we'll append them at the end
  let cleanContent = content.replace(hashtagRegex, '').trim();

  // Normalise line breaks: collapse 3+ newlines into 2
  cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');

  // Remove trailing whitespace on each line
  cleanContent = cleanContent
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // Ensure a blank line after the hook (first line)
  const lines = cleanContent.split('\n');
  const hookLine = lines[0] || '';
  if (lines.length > 1 && lines[1] !== '') {
    lines.splice(1, 0, '');
    optimisations.push('Added spacing after hook line for better readability');
  }

  cleanContent = lines.join('\n').trim();

  // Append hashtags with spacing
  const hashtagBlock = finalHashtags.join(' ');
  const formattedContent = hashtagBlock
    ? `${cleanContent}\n\n${hashtagBlock}`
    : cleanContent;

  const characterCount = formattedContent.length;

  let status: LinkedInFormatResult['status'] = 'ok';
  let statusMessage = `${characterCount} characters — good length for LinkedIn`;

  if (characterCount > LINKEDIN_CHAR_LIMIT) {
    status = 'over_limit';
    statusMessage = `${characterCount} characters — exceeds LinkedIn's ${LINKEDIN_CHAR_LIMIT} character limit by ${characterCount - LINKEDIN_CHAR_LIMIT}`;
  } else if (characterCount > LINKEDIN_OPTIMAL_LENGTH) {
    status = 'warning';
    statusMessage = `${characterCount} characters — longer than the optimal ${LINKEDIN_OPTIMAL_LENGTH}. Longer posts can still perform well if the content is strong.`;
  }

  return {
    formattedContent,
    characterCount,
    hashtagCount: finalHashtags.length,
    hookLine,
    status,
    statusMessage,
    optimisations,
  };
}

// POST: Format content for LinkedIn and optionally mark as posted
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`linkedin:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    await getDb();

    // Action: format raw content
    if (action === 'format') {
      const { content } = body;
      if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      const result = formatForLinkedIn(sanitizeString(content, 5000));
      return NextResponse.json(result);
    }

    // Action: format content from a content_id in the database
    if (action === 'format_by_id') {
      const { content_id } = body;
      if (!content_id) {
        return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
      }

      // Verify the user owns this content
      const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
      const company = companyResult.rows[0];
      if (!company) {
        return NextResponse.json({ error: 'No company found' }, { status: 400 });
      }

      const contentResult = await sql`
        SELECT id, title, content, content_type
        FROM generated_content
        WHERE id = ${content_id} AND company_id = ${company.id}
      `;
      const row = contentResult.rows[0];
      if (!row) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 });
      }

      const result = formatForLinkedIn(row.content);
      return NextResponse.json({ ...result, contentId: row.id, title: row.title });
    }

    // Action: mark content as posted to LinkedIn
    if (action === 'mark_posted') {
      const { content_id } = body;
      if (!content_id) {
        return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
      }

      const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
      const company = companyResult.rows[0];
      if (!company) {
        return NextResponse.json({ error: 'No company found' }, { status: 400 });
      }

      // Verify content exists and belongs to user
      const contentResult = await sql`
        SELECT id FROM generated_content
        WHERE id = ${content_id} AND company_id = ${company.id}
      `;
      if (contentResult.rows.length === 0) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 });
      }

      // Track the posting event
      const eventId = uuidv4();
      await sql`
        INSERT INTO usage_events (id, user_id, event_type, metadata, created_at)
        VALUES (
          ${eventId},
          ${user.id},
          'linkedin_posted',
          ${JSON.stringify({ content_id, posted_at: new Date().toISOString() })},
          NOW()
        )
      `;

      // Update the content status
      await sql`
        UPDATE generated_content
        SET status = 'posted', updated_at = NOW()
        WHERE id = ${content_id}
      `;

      return NextResponse.json({ success: true, postedAt: new Date().toISOString() });
    }

    return NextResponse.json({ error: 'Invalid action. Use: format, format_by_id, or mark_posted' }, { status: 400 });
  } catch (error) {
    console.error('LinkedIn distribution error:', error);
    return NextResponse.json({ error: 'LinkedIn formatting failed' }, { status: 500 });
  }
}

// GET: Retrieve LinkedIn posting history for the current user
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const result = await sql`
      SELECT ue.id, ue.metadata, ue.created_at,
             gc.title, gc.content_type
      FROM usage_events ue
      LEFT JOIN generated_content gc ON gc.id = (ue.metadata::json->>'content_id')
      WHERE ue.user_id = ${user.id} AND ue.event_type = 'linkedin_posted'
      ORDER BY ue.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      posts: result.rows.map((r) => ({
        id: r.id,
        contentTitle: r.title,
        contentType: r.content_type,
        postedAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('LinkedIn history error:', error);
    return NextResponse.json({ error: 'Failed to fetch posting history' }, { status: 500 });
  }
}
