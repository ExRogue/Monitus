import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeString, rateLimit } from '@/lib/validation';

// GET /api/narratives — list all narratives for the current user's company
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ narratives: [] });

  const result = await sql`
    SELECT n.*, mb.status as bible_status, mb.full_document as has_document
    FROM narratives n
    LEFT JOIN messaging_bibles mb ON mb.narrative_id = n.id
    WHERE n.company_id = ${company.id}
    ORDER BY n.is_default DESC, n.created_at ASC
  `;

  // Deduplicate narratives (LEFT JOIN may produce duplicates if multiple bibles exist)
  const seen = new Set<string>();
  const narratives = result.rows.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return NextResponse.json({ narratives, company });
}

// POST /api/narratives — create a new narrative
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`narratives:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = sanitizeString(body.name || '', 200).trim();
  if (!name) {
    return NextResponse.json({ error: 'Narrative name is required' }, { status: 400 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    // Check if this is the first narrative for this company — make it default
    const existingResult = await sql`
      SELECT COUNT(*) as count FROM narratives WHERE company_id = ${company.id}
    `;
    const isFirst = parseInt(existingResult.rows[0]?.count || '0') === 0;

    const id = uuidv4();
    const isDefault = body.is_default === true || isFirst;

    // If setting as default, unset existing default
    if (isDefault) {
      await sql`
        UPDATE narratives SET is_default = false WHERE company_id = ${company.id}
      `;
    }

    await sql`
      INSERT INTO narratives (id, company_id, name, is_default)
      VALUES (${id}, ${company.id}, ${name}, ${isDefault})
    `;

    return NextResponse.json({
      narrative: { id, company_id: company.id, name, is_default: isDefault },
    });
  } catch (error) {
    console.error('Create narrative error:', error);
    return NextResponse.json({ error: 'Failed to create narrative' }, { status: 500 });
  }
}
