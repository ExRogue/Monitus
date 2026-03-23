import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeString, safeParseJson, rateLimit } from '@/lib/validation';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    // Check if dismissed
    const userRow = await sql`SELECT onboarding_dismissed FROM users WHERE id = ${user.id}`;
    if (userRow.rows[0]?.onboarding_dismissed) {
      return NextResponse.json({ dismissed: true, steps: [] });
    }

    // Check each step — use individual try/catch so one failing table doesn't break all
    const safeQuery = async (query: Promise<any>, fallback: any = { rows: [] }) => {
      try { return await query; } catch { return fallback; }
    };

    const [companyRes, bibleRes, newsRes, contentRes, voiceRes] = await Promise.all([
      safeQuery(sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`),
      safeQuery(sql`SELECT mb.id FROM messaging_bibles mb WHERE mb.company_id = (SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1) AND (mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10) LIMIT 1`),
      safeQuery(sql`SELECT COUNT(*)::int as count FROM custom_feeds cf JOIN companies c ON cf.company_id = c.id WHERE c.user_id = ${user.id} AND cf.last_fetched_at IS NOT NULL`, { rows: [{ count: 0 }] }),
      safeQuery(sql`SELECT COUNT(*)::int as count FROM generated_content gc JOIN companies c ON gc.company_id = c.id WHERE c.user_id = ${user.id}`, { rows: [{ count: 0 }] }),
      safeQuery(sql`SELECT COUNT(*)::int as count FROM voice_edits WHERE user_id = ${user.id}`, { rows: [{ count: 0 }] }),
    ]);

    const steps = [
      { id: 'company', label: 'Set up your company', href: '/settings', complete: companyRes.rows.length > 0 },
      { id: 'bible', label: 'Generate your Narrative', href: '/messaging-bible', complete: bibleRes.rows.length > 0 },
      { id: 'news', label: 'Fetch industry news', href: '/signals', complete: parseInt(newsRes.rows[0]?.count) > 0 },
      { id: 'content', label: 'Create your first content', href: '/content', complete: parseInt(contentRes.rows[0]?.count) > 0 },
      { id: 'voice', label: 'Review & refine your voice', href: '/content', complete: parseInt(voiceRes.rows[0]?.count) > 0 },
    ];

    const completedCount = steps.filter(s => s.complete).length;

    return NextResponse.json({ dismissed: false, steps, completedCount, totalSteps: steps.length });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
  }
}

const VALID_COMPANY_TYPES = ['broker', 'mga', 'insurer', 'reinsurer', 'insurtech', 'carrier', 'other'];
const VALID_VOICES = ['professional', 'conversational', 'authoritative', 'friendly', 'technical', 'authority', 'challenger', 'advisor', 'insider', 'innovator', 'confident', 'thought-leader', 'storyteller', 'educator'];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`onboarding:${user.id}`, 10, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    await getDb();

    // Parse body — if body has company data, create/update the company too
    let body: any = {};
    try {
      const parsed = await safeParseJson(request);
      if (parsed.data) body = parsed.data;
    } catch {
      // No body or empty body is fine — just dismiss onboarding
    }

    const companyName = sanitizeString(body.companyName || body.name || '', 200);

    // If company data was provided, create/update the company profile
    if (companyName) {
      const existing = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
      const safeType = VALID_COMPANY_TYPES.includes(body.companyType || body.type) ? (body.companyType || body.type) : 'other';
      const safeVoice = VALID_VOICES.includes(body.voice || body.brand_voice) ? (body.voice || body.brand_voice) : 'professional';
      const safeNiche = sanitizeString(body.industry || body.niche || '', 500);
      const safeDescription = sanitizeString(body.description || '', 1000);
      const safeTone = sanitizeString(body.brand_tone || '', 500);
      const safeWebsite = sanitizeString(body.website || '', 500);

      // Default compliance frameworks based on company type
      const VALID_FRAMEWORKS = ['FCA', 'State DOI', 'GDPR', 'FTC', 'Solvency II', 'NAIC', 'APRA', 'TCFD'];
      let safeFrameworks: string[] = ['FCA', 'GDPR'];
      if (Array.isArray(body.compliance_frameworks)) {
        const filtered = body.compliance_frameworks.filter((f: string) => VALID_FRAMEWORKS.includes(f));
        if (filtered.length > 0) safeFrameworks = filtered;
      }
      const cfJson = JSON.stringify(safeFrameworks);

      if (existing.rows[0]) {
        await sql`
          UPDATE companies SET name=${companyName}, type=${safeType}, niche=${safeNiche},
            description=${safeDescription}, brand_voice=${safeVoice}, brand_tone=${safeTone},
            compliance_frameworks=${cfJson}, website=${safeWebsite}, updated_at=NOW()
          WHERE id=${existing.rows[0].id}
        `;
      } else {
        const id = uuidv4();
        await sql`
          INSERT INTO companies (id, user_id, name, type, niche, description, brand_voice, brand_tone, compliance_frameworks, website)
          VALUES (${id}, ${user.id}, ${companyName}, ${safeType}, ${safeNiche}, ${safeDescription}, ${safeVoice}, ${safeTone}, ${cfJson}, ${safeWebsite})
        `;
      }
    }

    // Only dismiss onboarding checklist if explicitly requested
    if (body.dismiss === true) {
      await sql`UPDATE users SET onboarding_dismissed = true WHERE id = ${user.id}`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding' }, { status: 500 });
  }
}
