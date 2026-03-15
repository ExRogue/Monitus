import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';

const VALID_COMPANY_TYPES = ['broker', 'mga', 'insurer', 'reinsurer', 'insurtech', 'other'];
// Accepts both legacy presets and voice archetype IDs
const VALID_VOICES = ['professional', 'conversational', 'authoritative', 'friendly', 'technical', 'authority', 'challenger', 'advisor', 'insider', 'innovator'];
const VALID_FRAMEWORKS = ['FCA', 'PRA', 'State DOI', 'GDPR', 'FTC', 'Solvency II', 'NAIC', 'APRA', 'TCFD'];

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

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`company:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const { name, type, niche, description, brand_voice, brand_tone, compliance_frameworks } = body;

    const safeName = sanitizeString(name, 200);
    const safeType = VALID_COMPANY_TYPES.includes(type) ? type : 'other';
    const safeNiche = sanitizeString(niche || '', 200);
    const safeDescription = sanitizeString(description || '', 1000);
    const voiceIsValid = VALID_VOICES.includes(brand_voice);
    const safeVoice = voiceIsValid ? brand_voice : 'professional';
    const safeTone = sanitizeString(brand_tone || '', 500);
    const warnings: string[] = [];
    if (brand_voice && !voiceIsValid) {
      warnings.push(`brand_voice "${brand_voice}" is not a valid option. Valid values: ${VALID_VOICES.join(', ')}. Defaulting to "professional". Use brand_tone for free-text voice description.`);
    }

    if (!safeName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    let safeFrameworks: string[] = ['FCA'];
    if (Array.isArray(compliance_frameworks)) {
      safeFrameworks = compliance_frameworks.filter((f: string) => VALID_FRAMEWORKS.includes(f));
      if (safeFrameworks.length === 0) safeFrameworks = ['FCA'];
    }
    const cfJson = JSON.stringify(safeFrameworks);

    await getDb();
    const existing = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;

    if (existing.rows[0]) {
      const existingId = existing.rows[0].id;
      await sql`
        UPDATE companies SET name=${safeName}, type=${safeType}, niche=${safeNiche}, description=${safeDescription}, brand_voice=${safeVoice}, brand_tone=${safeTone}, compliance_frameworks=${cfJson}, updated_at=NOW() WHERE id=${existingId}
      `;
      const updated = await sql`SELECT * FROM companies WHERE id = ${existingId}`;
      return NextResponse.json({ company: updated.rows[0], ...(warnings.length > 0 ? { warnings } : {}) });
    }

    const id = uuidv4();
    await sql`
      INSERT INTO companies (id, user_id, name, type, niche, description, brand_voice, brand_tone, compliance_frameworks)
      VALUES (${id}, ${user.id}, ${safeName}, ${safeType}, ${safeNiche}, ${safeDescription}, ${safeVoice}, ${safeTone}, ${cfJson})
    `;

    const created = await sql`SELECT * FROM companies WHERE id = ${id}`;
    return NextResponse.json({ company: created.rows[0], ...(warnings.length > 0 ? { warnings } : {}) });
  } catch (error) {
    console.error('Company error:', error);
    return NextResponse.json({ error: 'Failed to save company profile' }, { status: 500 });
  }
}
