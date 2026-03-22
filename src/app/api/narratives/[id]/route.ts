import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { sanitizeString, rateLimit } from '@/lib/validation';

// GET /api/narratives/[id] — get a single narrative with its messaging bible
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await getDb();

  // Verify ownership
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  const narrativeResult = await sql`
    SELECT * FROM narratives WHERE id = ${id} AND company_id = ${company.id}
  `;
  const narrative = narrativeResult.rows[0];
  if (!narrative) return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });

  // Fetch the associated messaging bible
  const bibleResult = await sql`
    SELECT * FROM messaging_bibles WHERE narrative_id = ${id} ORDER BY updated_at DESC LIMIT 1
  `;

  return NextResponse.json({
    narrative,
    bible: bibleResult.rows[0] || null,
    company,
  });
}

// PUT /api/narratives/[id] — update a narrative
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`narratives:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const narrativeResult = await sql`
      SELECT * FROM narratives WHERE id = ${id} AND company_id = ${company.id}
    `;
    if (narrativeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });
    }

    const updates: string[] = [];
    if (body.name !== undefined) {
      const name = sanitizeString(body.name, 200).trim();
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      await sql`UPDATE narratives SET name = ${name}, updated_at = NOW() WHERE id = ${id}`;
    }

    if (body.is_default === true) {
      // Unset other defaults
      await sql`UPDATE narratives SET is_default = false WHERE company_id = ${company.id}`;
      await sql`UPDATE narratives SET is_default = true, updated_at = NOW() WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM narratives WHERE id = ${id}`;
    return NextResponse.json({ narrative: updated.rows[0] });
  } catch (error) {
    console.error('Update narrative error:', error);
    return NextResponse.json({ error: 'Failed to update narrative' }, { status: 500 });
  }
}

// DELETE /api/narratives/[id] — delete a narrative
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const narrativeResult = await sql`
      SELECT * FROM narratives WHERE id = ${id} AND company_id = ${company.id}
    `;
    const narrative = narrativeResult.rows[0];
    if (!narrative) return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });

    if (narrative.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default narrative. Set another narrative as default first.' },
        { status: 400 }
      );
    }

    // Unlink associated records (don't delete them, just clear the narrative_id)
    await sql`UPDATE messaging_bibles SET narrative_id = NULL WHERE narrative_id = ${id}`;
    await sql`UPDATE interview_sessions SET narrative_id = NULL WHERE narrative_id = ${id}`;
    await sql`UPDATE generated_content SET narrative_id = NULL WHERE narrative_id = ${id}`;
    await sql`UPDATE opportunities SET narrative_id = NULL WHERE narrative_id = ${id}`;
    await sql`UPDATE voice_edits SET narrative_id = NULL WHERE narrative_id = ${id}`;

    await sql`DELETE FROM narratives WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete narrative error:', error);
    return NextResponse.json({ error: 'Failed to delete narrative' }, { status: 500 });
  }
}
