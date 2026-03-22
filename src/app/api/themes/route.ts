import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

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

    return NextResponse.json({ themes: themes.rows });
  } catch (error) {
    console.error('GET /api/themes error:', error);
    return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
  }
}

// POST /api/themes — create or update a theme
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
