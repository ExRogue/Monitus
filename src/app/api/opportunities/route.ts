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

// GET /api/opportunities
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.userId} LIMIT 1`;
    if (!companyResult.rows.length) {
      return NextResponse.json({ opportunities: [] });
    }
    const companyId = companyResult.rows[0].id;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const stage = searchParams.get('stage');
    const showDismissed = searchParams.get('dismissed') === 'true';

    let opportunities;
    if (type) {
      opportunities = await sql`
        SELECT * FROM opportunities
        WHERE company_id = ${companyId} AND type = ${type} AND dismissed = ${showDismissed}
        ORDER BY opportunity_score DESC, created_at DESC
      `;
    } else if (stage) {
      opportunities = await sql`
        SELECT * FROM opportunities
        WHERE company_id = ${companyId} AND stage = ${stage} AND dismissed = ${showDismissed}
        ORDER BY opportunity_score DESC, created_at DESC
      `;
    } else {
      opportunities = await sql`
        SELECT * FROM opportunities
        WHERE company_id = ${companyId} AND dismissed = ${showDismissed}
        ORDER BY opportunity_score DESC, created_at DESC
      `;
    }

    return NextResponse.json({ opportunities: opportunities.rows });
  } catch (error) {
    console.error('GET /api/opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

// POST /api/opportunities — create a new opportunity (manual topic or AI-generated)
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
      type = 'topic-led',
      title,
      summary = '',
      source_signal_ids = [],
      theme_id = null,
      why_it_matters = '',
      why_it_matters_to_buyers = '',
      competitor_context = '',
      buyer_relevance = '',
      recommended_angle = '',
      recommended_format = 'linkedin_post',
      urgency_score = 50,
      opportunity_score = 50,
      narrative_pillar = '',
      target_icp = '',
      stage = 'analyse',
    } = body;

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const id = uuidv4();
    const signalIdsJson = JSON.stringify(source_signal_ids);

    const result = await sql`
      INSERT INTO opportunities (
        id, company_id, type, title, summary,
        source_signal_ids, theme_id, why_it_matters, why_it_matters_to_buyers,
        competitor_context, buyer_relevance, recommended_angle, recommended_format,
        urgency_score, opportunity_score, narrative_pillar, target_icp, stage
      ) VALUES (
        ${id}, ${companyId}, ${type}, ${title}, ${summary},
        ${signalIdsJson}, ${theme_id}, ${why_it_matters}, ${why_it_matters_to_buyers},
        ${competitor_context}, ${buyer_relevance}, ${recommended_angle}, ${recommended_format},
        ${urgency_score}, ${opportunity_score}, ${narrative_pillar}, ${target_icp}, ${stage}
      )
      RETURNING *
    `;

    return NextResponse.json({ opportunity: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/opportunities error:', error);
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }
}
