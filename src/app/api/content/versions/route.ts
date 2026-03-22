import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

/** Verify content belongs to the user's company. Returns { company, content } or null. */
async function verifyContentOwnership(userId: string, contentId: string, selectFields: string = 'gc.id, gc.title, gc.content, gc.updated_at') {
  const result = await sql`
    SELECT c.id as company_id, gc.id, gc.title, gc.content, gc.updated_at, gc.company_id as gc_company_id
    FROM companies c
    LEFT JOIN generated_content gc ON gc.company_id = c.id AND gc.id = ${contentId}
    WHERE c.user_id = ${userId}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return { company: null, content: null };
  return {
    company: { id: row.company_id },
    content: row.id ? { id: row.id, title: row.title, content: row.content, updated_at: row.updated_at, company_id: row.gc_company_id } : null,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('content_id');

    if (!contentId) {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
    }

    await getDb();

    // Verify the content belongs to the user's company (single query)
    const { company, content: contentRow } = await verifyContentOwnership(user.id, contentId);
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }
    if (!contentRow) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Get all saved versions
    const versionsResult = await sql`
      SELECT id, content_id, version_number, title, content, change_summary, created_by, created_at
      FROM content_versions
      WHERE content_id = ${contentId}
      ORDER BY version_number DESC
    `;

    // Include the current version from generated_content as "current"
    const currentVersion = {
      id: 'current',
      content_id: contentId,
      version_number: null,
      title: contentRow.title,
      content: contentRow.content,
      change_summary: 'Current version',
      created_by: user.id,
      created_at: contentRow.updated_at,
      is_current: true,
    };

    const versions = [currentVersion, ...versionsResult.rows];

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Version history error:', error);
    return NextResponse.json({ error: 'Failed to fetch version history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { content_id, action, version_id } = body;

    if (!content_id || typeof content_id !== 'string') {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
    }

    if (action !== 'restore') {
      return NextResponse.json({ error: 'Invalid action. Only "restore" is supported.' }, { status: 400 });
    }

    if (!version_id || typeof version_id !== 'string') {
      return NextResponse.json({ error: 'version_id is required for restore' }, { status: 400 });
    }

    await getDb();

    // Verify the content belongs to the user's company (single query)
    const { company, content: contentRow } = await verifyContentOwnership(user.id, content_id);
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }
    if (!contentRow) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Find the version to restore
    const versionResult = await sql`
      SELECT id, title, content FROM content_versions
      WHERE id = ${version_id} AND content_id = ${content_id}
    `;
    const versionRow = versionResult.rows[0];
    if (!versionRow) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Save current content as a new version before overwriting
    const maxVersionResult = await sql`SELECT COALESCE(MAX(version_number), 0) as max_v FROM content_versions WHERE content_id = ${content_id}`;
    const nextVersion = Number(maxVersionResult.rows[0].max_v) + 1;

    await sql`
      INSERT INTO content_versions (id, content_id, version_number, title, content, change_summary, created_by)
      VALUES (${uuidv4()}, ${content_id}, ${nextVersion}, ${contentRow.title}, ${contentRow.content}, 'Before restore', ${user.id})
    `;

    // Update generated_content with restored version
    await sql`
      UPDATE generated_content
      SET title = ${versionRow.title}, content = ${versionRow.content}, updated_at = NOW()
      WHERE id = ${content_id}
    `;

    return NextResponse.json({
      message: 'Version restored successfully',
      content_id,
      restored_version_id: version_id,
    });
  } catch (error) {
    console.error('Version restore error:', error);
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
