import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeString } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ bible: null });

  // Support narrative_id query parameter
  const { searchParams } = new URL(request.url);
  const narrativeId = searchParams.get('narrative_id');

  let result;
  if (narrativeId) {
    result = await sql`
      SELECT * FROM messaging_bibles WHERE company_id = ${company.id} AND narrative_id = ${narrativeId} ORDER BY updated_at DESC LIMIT 1
    `;
  } else {
    result = await sql`
      SELECT * FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
  }

  return NextResponse.json({ bible: result.rows[0] || null, company });
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
    // Validate that at least some structured data is provided
    const hasStructuredData = body.targetAudiences?.length > 0 || body.competitors?.length > 0 ||
      body.differentiators?.length > 0 || body.companyDescription || body.voiceArchetypeId;
    if (!hasStructuredData) {
      return NextResponse.json({
        error: 'This endpoint expects structured data (targetAudiences, competitors, differentiators, companyDescription). For conversational input, use POST /api/messaging-bible/interview instead.',
      }, { status: 400 });
    }

    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    let company = companyResult.rows[0];

    // Create company if it doesn't exist
    const voiceArchetypeId = sanitizeString(body.voiceArchetypeId || '', 50);
    if (!company) {
      const companyId = uuidv4();
      await sql`
        INSERT INTO companies (id, user_id, name, type, niche, description, brand_voice)
        VALUES (${companyId}, ${user.id}, ${sanitizeString(body.companyName || 'My Company', 200)}, ${sanitizeString(body.companyType || '', 100)}, ${sanitizeString(body.niche || '', 200)}, ${sanitizeString(body.companyDescription || '', 2000)}, ${voiceArchetypeId || 'Professional and authoritative'})
      `;
      const newResult = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
      company = newResult.rows[0];
    } else {
      // Update company with new info
      if (body.companyDescription) {
        await sql`
          UPDATE companies SET
            description = ${sanitizeString(body.companyDescription, 2000)},
            type = COALESCE(NULLIF(${sanitizeString(body.companyType || '', 100)}, ''), type),
            niche = COALESCE(NULLIF(${sanitizeString(body.niche || '', 200)}, ''), niche),
            updated_at = NOW()
          WHERE id = ${company.id}
        `;
      }
      // Update voice archetype if provided
      if (voiceArchetypeId) {
        await sql`
          UPDATE companies SET brand_voice = ${voiceArchetypeId}, updated_at = NOW()
          WHERE id = ${company.id}
        `;
      }
    }

    // Check for existing bible (scoped to narrative if provided)
    const narrativeId = body.narrative_id || null;
    let existingResult;
    if (narrativeId) {
      existingResult = await sql`
        SELECT id FROM messaging_bibles WHERE company_id = ${company.id} AND narrative_id = ${narrativeId} ORDER BY updated_at DESC LIMIT 1
      `;
    } else {
      existingResult = await sql`
        SELECT id FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
      `;
    }

    const bibleId = existingResult.rows[0]?.id || uuidv4();

    const targetAudiences = JSON.stringify(body.targetAudiences || []);
    const competitors = JSON.stringify(body.competitors || []);
    const differentiators = JSON.stringify(body.differentiators || []);
    const keyChallenges = JSON.stringify(body.keyChallenges || []);
    const departments = JSON.stringify(body.departments || []);
    const channels = JSON.stringify(body.channels || ['linkedin', 'email', 'trade_media']);

    if (existingResult.rows[0]) {
      await sql`
        UPDATE messaging_bibles SET
          company_description = ${sanitizeString(body.companyDescription || '', 2000)},
          target_audiences = ${targetAudiences},
          competitors = ${competitors},
          differentiators = ${differentiators},
          key_challenges = ${keyChallenges},
          departments = ${departments},
          channels = ${channels},
          status = 'draft',
          updated_at = NOW()
        WHERE id = ${bibleId}
      `;
    } else {
      await sql`
        INSERT INTO messaging_bibles (id, company_id, company_description, target_audiences, competitors, differentiators, key_challenges, departments, channels, narrative_id)
        VALUES (${bibleId}, ${company.id}, ${sanitizeString(body.companyDescription || '', 2000)}, ${targetAudiences}, ${competitors}, ${differentiators}, ${keyChallenges}, ${departments}, ${channels}, ${narrativeId})
      `;
    }

    return NextResponse.json({ success: true, bibleId });
  } catch (error) {
    console.error('Messaging bible save error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
