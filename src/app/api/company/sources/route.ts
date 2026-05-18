import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson } from '@/lib/validation';
import { getExcludedSourceNames, setExcludedSourceNames } from '@/lib/company-sources';

export const runtime = 'nodejs';

/**
 * GET  /api/company/sources       → { excludedSourceNames: string[] }
 * POST /api/company/sources       → { excludedSourceNames: string[] }
 *                                   body: { excludedSourceNames: string[] }
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const r = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = r.rows[0];
  if (!company) return NextResponse.json({ excludedSourceNames: [] });

  const excluded = await getExcludedSourceNames(company.id as string);
  return NextResponse.json({ excludedSourceNames: excluded });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`company-sources:${user.id}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  const list = (body as any)?.excludedSourceNames;
  if (!Array.isArray(list)) {
    return NextResponse.json({ error: 'excludedSourceNames must be an array of strings' }, { status: 400 });
  }

  await getDb();
  const r = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = r.rows[0];
  if (!company) return NextResponse.json({ error: 'No company configured' }, { status: 400 });

  await setExcludedSourceNames(company.id as string, list);
  const updated = await getExcludedSourceNames(company.id as string);
  return NextResponse.json({ excludedSourceNames: updated });
}
