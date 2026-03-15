import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeString, rateLimit } from '@/lib/validation';

// Ensure custom_templates table exists
async function ensureTable() {
  await getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS custom_templates (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ templates: [] });

  const result = await sql`
    SELECT * FROM custom_templates WHERE company_id = ${companyId} ORDER BY created_at DESC
  `;

  return NextResponse.json({ templates: result.rows });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`templates:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  await ensureTable();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ error: 'Set up your company first' }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const name = sanitizeString(body.name || '', 200);
    const contentType = sanitizeString(body.content_type || '', 50);
    const promptTemplate = sanitizeString(body.prompt_template || '', 5000);
    const variables = JSON.stringify(body.variables || []);

    if (!name || !contentType || !promptTemplate) {
      return NextResponse.json({ error: 'Name, content type, and prompt template are required' }, { status: 400 });
    }

    const id = uuidv4();
    await sql`
      INSERT INTO custom_templates (id, company_id, name, content_type, prompt_template, variables)
      VALUES (${id}, ${companyId}, ${name}, ${contentType}, ${promptTemplate}, ${variables})
    `;

    return NextResponse.json({ template: { id, company_id: companyId, name, content_type: contentType, prompt_template: promptTemplate, variables } });
  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ error: 'Set up your company first' }, { status: 400 });

  let putBody: any;
  try {
    putBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body = putBody;
    const templateId = sanitizeString(body.id || '', 100);
    if (!templateId) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });

    // Verify ownership
    const existing = await sql`SELECT id FROM custom_templates WHERE id = ${templateId} AND company_id = ${companyId}`;
    if (!existing.rows[0]) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const name = sanitizeString(body.name || '', 200);
    const promptTemplate = sanitizeString(body.prompt_template || '', 5000);
    const variables = JSON.stringify(body.variables || []);

    await sql`
      UPDATE custom_templates SET
        name = COALESCE(NULLIF(${name}, ''), name),
        prompt_template = COALESCE(NULLIF(${promptTemplate}, ''), prompt_template),
        variables = ${variables},
        updated_at = NOW()
      WHERE id = ${templateId} AND company_id = ${companyId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ error: 'Set up your company first' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('id');
  if (!templateId) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });

  await sql`DELETE FROM custom_templates WHERE id = ${templateId} AND company_id = ${companyId}`;
  return NextResponse.json({ success: true });
}
