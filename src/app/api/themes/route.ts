import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { detectThemesFromSignals } from '@/lib/themes';

export const maxDuration = 60;

function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('monitus_token')?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// GET /api/themes — list themes for the authenticated user's company
// If no themes exist but signal analyses do, triggers auto-detection
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    // Get company
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.userId} LIMIT 1`;
    if (!companyResult.rows.length) {
      return NextResponse.json({ themes: [] });
    }
    const companyId = companyResult.rows[0].id;

    const { searchParams } = new URL(request.url);
    const classification = searchParams.get('classification');
    const action = searchParams.get('action');

    let themes;
    if (classification) {
      themes = await sql`
        SELECT * FROM themes
        WHERE company_id = ${companyId} AND classification = ${classification}
        ORDER BY score DESC
      `;
    } else if (action) {
      themes = await sql`
        SELECT * FROM themes
        WHERE company_id = ${companyId} AND recommended_action = ${action}
        ORDER BY score DESC
      `;
    } else {
      themes = await sql`
        SELECT * FROM themes
        WHERE company_id = ${companyId}
        ORDER BY score DESC
      `;
    }

    // If no themes exist, check if there are signal analyses to auto-detect from
    if (!themes.rows.length) {
      const analysisCount = await sql`
        SELECT COUNT(*) as cnt FROM signal_analyses WHERE company_id = ${companyId}
      `;
      const count = Number(analysisCount.rows[0]?.cnt || 0);

      if (count > 0) {
        // Auto-detect themes from existing signal analyses
        try {
          const detected = await detectThemesFromSignals(companyId);
          if (detected.length) {
            // Re-fetch from DB to get consistent format
            const freshThemes = await sql`
              SELECT * FROM themes
              WHERE company_id = ${companyId}
              ORDER BY score DESC
            `;
            return NextResponse.json({ themes: freshThemes.rows, auto_detected: true });
          }
        } catch (detectErr) {
          console.error('[themes] Auto-detection failed:', detectErr);
          // Fall through to return empty
        }
      }
    }

    return NextResponse.json({ themes: themes.rows });
  } catch (error) {
    console.error('GET /api/themes error:', error);
    return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
  }
}

// POST /api/themes — create a theme manually or trigger auto-detection
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.userId} LIMIT 1`;
    if (!companyResult.rows.length) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    const companyId = companyResult.rows[0].id;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Auto-detection trigger
    if (body.action === 'auto_detect') {
      try {
        const detected = await detectThemesFromSignals(companyId);
        return NextResponse.json({ themes: detected, auto_detected: true }, { status: 200 });
      } catch (error) {
        console.error('[themes] Auto-detection error:', error);
        return NextResponse.json({ error: 'Theme auto-detection failed' }, { status: 500 });
      }
    }

    // Manual theme creation
    const {
      name, description = '', classification = 'Building',
      score = 0, momentum_7d = 0, momentum_30d = 0, momentum_90d = 0, momentum_180d = 0,
      source_diversity = 0, competitor_activity = 0, icp_relevance = 0, narrative_fit = 0,
      recommended_action = 'monitor', article_ids = [],
    } = body;

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const id = uuidv4();
    const articleIdsJson = JSON.stringify(article_ids);

    const result = await sql`
      INSERT INTO themes (
        id, company_id, name, description, classification,
        score, momentum_7d, momentum_30d, momentum_90d, momentum_180d,
        source_diversity, competitor_activity, icp_relevance, narrative_fit,
        recommended_action, article_ids
      ) VALUES (
        ${id}, ${companyId}, ${name}, ${description}, ${classification},
        ${score}, ${momentum_7d}, ${momentum_30d}, ${momentum_90d}, ${momentum_180d},
        ${source_diversity}, ${competitor_activity}, ${icp_relevance}, ${narrative_fit},
        ${recommended_action}, ${articleIdsJson}
      )
      RETURNING *
    `;

    return NextResponse.json({ theme: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/themes error:', error);
    return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
  }
}
