import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';

const VALID_COMPANY_TYPES = ['broker', 'mga', 'insurer', 'reinsurer', 'insurtech', 'carrier', 'other'];
// Accepts both legacy presets and voice archetype IDs
const VALID_VOICES = ['professional', 'conversational', 'authoritative', 'friendly', 'technical', 'authority', 'challenger', 'advisor', 'insider', 'innovator', 'confident', 'thought-leader', 'storyteller', 'educator'];
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
    // Accept both camelCase aliases and snake_case field names
    const { name, companyName, type, companyType, niche, industry, description, brand_voice, voice, brand_tone, compliance_frameworks, website, topics } = body;

    const safeName = sanitizeString(name || companyName || '', 200);
    const rawType = type || companyType || '';
    const safeType = VALID_COMPANY_TYPES.includes(rawType) ? rawType : 'other';
    const rawNiche = niche || industry || '';
    const rawWebsite = sanitizeString(website || '', 500);
    const safeNiche = sanitizeString(rawWebsite ? `${rawNiche} | ${rawWebsite}` : rawNiche, 500);
    const safeDescription = sanitizeString(description || '', 1000);
    const rawVoice = brand_voice || voice || '';
    const voiceIsValid = VALID_VOICES.includes(rawVoice);
    const safeVoice = voiceIsValid ? rawVoice : 'professional';
    const safeTone = sanitizeString(brand_tone || (Array.isArray(topics) ? topics.join(', ') : '') || '', 500);
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
