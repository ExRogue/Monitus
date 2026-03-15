import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';

// Accept both POST and PUT for content editing
export async function POST(request: NextRequest) {
  return handleEdit(request);
}

export async function PUT(request: NextRequest) {
  return handleEdit(request);
}

async function handleEdit(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`content-edit:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const { content_id, edited_text } = body;

    if (!content_id || typeof content_id !== 'string') {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
    }

    if (!edited_text || typeof edited_text !== 'string') {
      return NextResponse.json({ error: 'edited_text is required' }, { status: 400 });
    }

    const safeContentId = sanitizeString(content_id, 100);
    const safeEditedText = sanitizeString(edited_text, 50000);

    if (!safeEditedText) {
      return NextResponse.json({ error: 'edited_text cannot be empty' }, { status: 400 });
    }

    await getDb();

    // Verify the content belongs to the user's company
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    const contentResult = await sql`
      SELECT id, title, content, company_id FROM generated_content
      WHERE id = ${safeContentId} AND company_id = ${company.id}
    `;
    const contentRow = contentResult.rows[0];
    if (!contentRow) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const originalText = contentRow.content as string;
    const currentTitle = (contentRow.title as string) || '';

    // Skip if no actual changes were made
    if (originalText === safeEditedText) {
      return NextResponse.json({ message: 'No changes detected', content_id: safeContentId });
    }

    // Save current content as a version before overwriting
    const versionResult = await sql`SELECT COALESCE(MAX(version_number), 0) as max_v FROM content_versions WHERE content_id = ${safeContentId}`;
    const nextVersion = Number(versionResult.rows[0].max_v) + 1;
    await sql`INSERT INTO content_versions (id, content_id, version_number, title, content, change_summary, created_by) VALUES (${uuidv4()}, ${safeContentId}, ${nextVersion}, ${currentTitle}, ${originalText}, 'Edit', ${user.id})`;

    // Save the voice edit for learning
    const editId = uuidv4();
    await sql`
      INSERT INTO voice_edits (id, user_id, company_id, content_id, original_text, edited_text, edit_type)
      VALUES (${editId}, ${user.id}, ${company.id}, ${safeContentId}, ${originalText}, ${safeEditedText}, 'manual')
    `;

    // Update the generated content with the edited text
    await sql`
      UPDATE generated_content
      SET content = ${safeEditedText}, updated_at = NOW()
      WHERE id = ${safeContentId}
    `;

    return NextResponse.json({
      message: 'Content updated and voice edit recorded',
      content_id: safeContentId,
      edit_id: editId,
    });
  } catch (error) {
    console.error('Content edit error:', error);
    return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 });
  }
}
