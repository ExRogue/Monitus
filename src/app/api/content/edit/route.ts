import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit } from '@/lib/validation';

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`content-edit:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { content_id, edited_text } = await request.json();

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
      SELECT id, content, company_id FROM generated_content
      WHERE id = ${safeContentId} AND company_id = ${company.id}
    `;
    const contentRow = contentResult.rows[0];
    if (!contentRow) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const originalText = contentRow.content as string;

    // Skip if no actual changes were made
    if (originalText === safeEditedText) {
      return NextResponse.json({ message: 'No changes detected', content_id: safeContentId });
    }

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
