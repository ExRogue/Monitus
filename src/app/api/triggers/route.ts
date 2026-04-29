/**
 * GET / PUT /api/triggers
 *
 * Lightweight read/write of the trigger profile that powers Story
 * Saturation > Your Coverage. Stored on messaging_bibles, exposed here so
 * the Story Saturation empty state can offer an inline editor without
 * dragging users through the full Narrative flow.
 *
 * GET   → { name_variants: string[], products: string[], founders: string[] }
 * PUT   { name_variants, products, founders } → 200 OK
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/validation';

export const maxDuration = 15;

interface TriggerPayload {
  name_variants: string[];
  products: string[];
  founders: string[];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    const company = await sql`SELECT id, name FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    if (!company.rows.length) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const companyId = company.rows[0].id as string;

    const bible = await sql`
      SELECT name_variants, products, founders
      FROM messaging_bibles
      WHERE company_id = ${companyId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    const row = bible.rows[0];
    return NextResponse.json({
      company_name: company.rows[0].name as string,
      name_variants: parseArray(row?.name_variants),
      products: parseArray(row?.products),
      founders: parseArray(row?.founders),
    });
  } catch (error) {
    console.error('[triggers] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load triggers' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    const rl = rateLimit(`triggers:${user.id}`, 20, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const company = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    if (!company.rows.length) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const companyId = company.rows[0].id as string;

    let body: Partial<TriggerPayload>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const nv = sanitizeArray(body.name_variants);
    const pr = sanitizeArray(body.products);
    const fo = sanitizeArray(body.founders);

    // Upsert: if a messaging_bible exists for the company, update; otherwise
    // create a minimal stub so the trigger fields persist even without a
    // completed narrative profile.
    const existing = await sql`SELECT id FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1`;
    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO messaging_bibles (id, company_id, status, name_variants, products, founders)
        VALUES (${uuidv4()}, ${companyId}, 'draft', ${JSON.stringify(nv)}, ${JSON.stringify(pr)}, ${JSON.stringify(fo)})
      `;
    } else {
      await sql`
        UPDATE messaging_bibles
        SET name_variants = ${JSON.stringify(nv)},
            products      = ${JSON.stringify(pr)},
            founders      = ${JSON.stringify(fo)},
            updated_at    = NOW()
        WHERE id = ${existing.rows[0].id as string}
      `;
    }
    return NextResponse.json({
      ok: true,
      name_variants: nv,
      products: pr,
      founders: fo,
    });
  } catch (error) {
    console.error('[triggers] PUT failed:', error);
    return NextResponse.json({ error: 'Failed to save triggers' }, { status: 500 });
  }
}

function parseArray(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function sanitizeArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(s => s.length >= 1 && s.length <= 80)
    .slice(0, 25);
}
