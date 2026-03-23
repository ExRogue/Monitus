import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { generateOpportunitiesFromSignals } from '@/lib/opportunities';
import { rateLimit } from '@/lib/validation';

export const maxDuration = 60;

// GET /api/opportunities
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`opportunities:${user.id}`, 30, 60000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    if (!companyResult.rows.length) {
      return NextResponse.json({ opportunities: [], has_narrative: false });
    }
    const companyId = companyResult.rows[0].id;

    // Check if user has a narrative
    const bibleResult = await sql`
      SELECT id, elevator_pitch, company_description, messaging_pillars
      FROM messaging_bibles WHERE company_id = ${companyId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    const bible = bibleResult.rows[0];
    const hasNarrative = bible && (bible.elevator_pitch || bible.company_description || bible.messaging_pillars);
    if (!hasNarrative) {
      return NextResponse.json({ opportunities: [], has_narrative: false });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const stage = searchParams.get('stage');
    const showDismissed = searchParams.get('dismissed') === 'true';
    const autoGenerate = searchParams.get('auto_generate') === 'true';

    // Check how many opportunities exist
    const countResult = await sql`
      SELECT COUNT(*) as count FROM opportunities
      WHERE company_id = ${companyId} AND dismissed = false
    `;
    const parsedExistingCount = parseInt(countResult.rows[0]?.count as string || '0');
    const existingCount = Math.max(0, Math.min(Number.isNaN(parsedExistingCount) ? 0 : parsedExistingCount, 10000));

    // Check how many analyzed signals exist
    const signalCount = await sql`
      SELECT COUNT(*) as count FROM signal_analyses
      WHERE company_id = ${companyId} AND narrative_fit > 40
    `;
    const parsedHighFitSignals = parseInt(signalCount.rows[0]?.count as string || '0');
    const highFitSignals = Math.max(0, Math.min(Number.isNaN(parsedHighFitSignals) ? 0 : parsedHighFitSignals, 10000));

    // Auto-generate if: user requested it OR (few opportunities exist AND there are analyzed signals)
    let generatedCount = 0;
    if (highFitSignals > 0 && (autoGenerate || existingCount < 3)) {
      const result = await generateOpportunitiesFromSignals(companyId, 5);
      generatedCount = result.generated;
    }

    // Fetch opportunities with source signal/article info
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

    // Enrich with source article info (batched query to avoid N+1)
    const allSignalIds: string[] = [];
    for (const opp of opportunities.rows) {
      try {
        const ids = JSON.parse(opp.source_signal_ids || '[]');
        if (ids.length > 0) allSignalIds.push(ids[0]);
      } catch {}
    }

    const articleMap = new Map<string, any>();
    if (allSignalIds.length > 0) {
      const articleResults = await sql`
        SELECT sa.id as signal_id, na.title, na.source, na.source_url, na.published_at
        FROM signal_analyses sa
        JOIN news_articles na ON na.id = sa.article_id
        WHERE sa.id = ANY(${allSignalIds as any}::text[])
      `;
      for (const row of articleResults.rows) {
        articleMap.set(row.signal_id, { title: row.title, source: row.source, source_url: row.source_url, published_at: row.published_at });
      }
    }

    const enriched = opportunities.rows.map((opp) => {
      let sourceArticle = null;
      try {
        const ids = JSON.parse(opp.source_signal_ids || '[]');
        if (ids.length > 0) {
          sourceArticle = articleMap.get(ids[0]) || null;
        }
      } catch {}
      return { ...opp, source_article: sourceArticle };
    });

    return NextResponse.json({
      opportunities: enriched,
      has_narrative: true,
      generated_count: generatedCount,
      signal_count: highFitSignals,
    });
  } catch (error) {
    console.error('GET /api/opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

// POST /api/opportunities — create a new opportunity (manual topic or AI-generated)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
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
