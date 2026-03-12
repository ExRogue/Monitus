import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const result = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  return NextResponse.json({ company: result.rows[0] || null });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, type, niche, description, brand_voice, brand_tone, compliance_frameworks } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type required' }, { status: 400 });
  }

  await getDb();
  const existing = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;

  if (existing.rows[0]) {
    const existingId = existing.rows[0].id;
    const cfJson = JSON.stringify(compliance_frameworks || ['FCA']);
    await sql`
      UPDATE companies SET name=${name}, type=${type}, niche=${niche || ''}, description=${description || ''}, brand_voice=${brand_voice || 'professional'}, brand_tone=${brand_tone || ''}, compliance_frameworks=${cfJson}, updated_at=NOW() WHERE id=${existingId}
    `;
    const updated = await sql`SELECT * FROM companies WHERE id = ${existingId}`;
    return NextResponse.json({ company: updated.rows[0] });
  }

  const id = uuidv4();
  const cfJson = JSON.stringify(compliance_frameworks || ['FCA']);
  await sql`
    INSERT INTO companies (id, user_id, name, type, niche, description, brand_voice, brand_tone, compliance_frameworks)
    VALUES (${id}, ${user.id}, ${name}, ${type}, ${niche || ''}, ${description || ''}, ${brand_voice || 'professional'}, ${brand_tone || ''}, ${cfJson})
  `;

  const created = await sql`SELECT * FROM companies WHERE id = ${id}`;
  return NextResponse.json({ company: created.rows[0] });
}
