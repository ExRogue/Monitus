import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';

const VALID_CHANNELS = ['linkedin', 'email', 'trade_media'];
const VALID_STATUSES = ['draft', 'scheduled', 'published', 'cancelled'];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`distribution-get:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ distributions: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(limitParam, 1), 200);

    let distributions;

    if (status && VALID_STATUSES.includes(status)) {
      distributions = await sql`
        SELECT d.*, gc.title as content_title, gc.content_type, gc.compliance_status
        FROM content_distributions d
        LEFT JOIN generated_content gc ON d.content_id = gc.id
        WHERE d.company_id = ${company.id} AND d.status = ${status}
        ORDER BY d.created_at DESC
        LIMIT ${limit}
      `;
    } else if (channel && VALID_CHANNELS.includes(channel)) {
      distributions = await sql`
        SELECT d.*, gc.title as content_title, gc.content_type, gc.compliance_status
        FROM content_distributions d
        LEFT JOIN generated_content gc ON d.content_id = gc.id
        WHERE d.company_id = ${company.id} AND d.channel = ${channel}
        ORDER BY d.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      distributions = await sql`
        SELECT d.*, gc.title as content_title, gc.content_type, gc.compliance_status
        FROM content_distributions d
        LEFT JOIN generated_content gc ON d.content_id = gc.id
        WHERE d.company_id = ${company.id}
        ORDER BY d.created_at DESC
        LIMIT ${limit}
      `;
    }

    // Also fetch content pieces ready to distribute (not yet distributed)
    const availableContent = await sql`
      SELECT gc.id, gc.title, gc.content_type, gc.compliance_status, gc.created_at
      FROM generated_content gc
      WHERE gc.company_id = ${company.id}
        AND gc.id NOT IN (
          SELECT content_id FROM content_distributions WHERE company_id = ${company.id} AND status != 'cancelled'
        )
      ORDER BY gc.created_at DESC
      LIMIT 20
    `;

    // Compute analytics
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const monthlyStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published' AND published_at >= ${monthStart}::timestamp) as published_this_month,
        COALESCE(SUM(engagement_clicks) FILTER (WHERE status = 'published'), 0) as total_clicks,
        COALESCE(SUM(engagement_views) FILTER (WHERE status = 'published'), 0) as total_views,
        COALESCE(SUM(engagement_reactions) FILTER (WHERE status = 'published'), 0) as total_reactions,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count
      FROM content_distributions
      WHERE company_id = ${company.id}
    `;

    const channelBreakdown = await sql`
      SELECT channel, COUNT(*) as count,
        COALESCE(SUM(engagement_clicks), 0) as clicks,
        COALESCE(SUM(engagement_views), 0) as views,
        COALESCE(SUM(engagement_reactions), 0) as reactions
      FROM content_distributions
      WHERE company_id = ${company.id} AND status = 'published'
      GROUP BY channel
    `;

    // Best performing content
    const bestPerforming = await sql`
      SELECT d.*, gc.title as content_title, gc.content_type
      FROM content_distributions d
      LEFT JOIN generated_content gc ON d.content_id = gc.id
      WHERE d.company_id = ${company.id} AND d.status = 'published'
      ORDER BY (d.engagement_clicks + d.engagement_views + d.engagement_reactions) DESC
      LIMIT 5
    `;

    return NextResponse.json({
      distributions: distributions.rows,
      available_content: availableContent.rows,
      analytics: {
        published_this_month: Number(monthlyStats.rows[0]?.published_this_month || 0),
        scheduled_count: Number(monthlyStats.rows[0]?.scheduled_count || 0),
        total_clicks: Number(monthlyStats.rows[0]?.total_clicks || 0),
        total_views: Number(monthlyStats.rows[0]?.total_views || 0),
        total_reactions: Number(monthlyStats.rows[0]?.total_reactions || 0),
        channel_breakdown: channelBreakdown.rows,
        best_performing: bestPerforming.rows,
      },
    });
  } catch (error) {
    console.error('Distribution GET error:', error);
    return NextResponse.json({ error: 'Failed to load distributions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`distribution-post:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const { content_id, channel, scheduled_at, scheduled_for, notes } = body;
    // Accept both scheduled_at and scheduled_for for convenience
    const scheduledInput = scheduled_at || scheduled_for;

    if (!content_id || typeof content_id !== 'string') {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
    }
    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 });
    }

    const safeContentId = sanitizeString(content_id, 100);
    const safeNotes = sanitizeString(notes || '', 2000);

    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    // Verify content exists and belongs to user's company
    const contentResult = await sql`
      SELECT id FROM generated_content
      WHERE id = ${safeContentId} AND company_id = ${company.id}
    `;
    if (contentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const id = uuidv4();
    let status = 'draft';
    let scheduledAtValue: string | null = null;
    let publishedAtValue: string | null = null;

    if (scheduledInput) {
      const scheduledDate = new Date(scheduledInput);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduled_at date' }, { status: 400 });
      }
      if (scheduledDate.getTime() <= Date.now()) {
        // If scheduled in the past, mark as published immediately
        status = 'published';
        publishedAtValue = new Date().toISOString();
      } else {
        status = 'scheduled';
        scheduledAtValue = scheduledDate.toISOString();
      }
    }

    await sql`
      INSERT INTO content_distributions (id, content_id, company_id, channel, status, scheduled_at, published_at, notes)
      VALUES (${id}, ${safeContentId}, ${company.id}, ${channel}, ${status}, ${scheduledAtValue}, ${publishedAtValue}, ${safeNotes})
    `;

    const result = await sql`
      SELECT d.*, gc.title as content_title, gc.content_type, gc.compliance_status
      FROM content_distributions d
      LEFT JOIN generated_content gc ON d.content_id = gc.id
      WHERE d.id = ${id}
    `;

    return NextResponse.json({ distribution: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Distribution POST error:', error);
    return NextResponse.json({ error: 'Failed to create distribution' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`distribution-put:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: putParseError } = await safeParseJson(request);
    if (putParseError) return NextResponse.json({ error: putParseError }, { status: 400 });
    const { id, status, external_url, engagement_clicks, engagement_views, engagement_reactions, notes } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Distribution id is required' }, { status: 400 });
    }

    const safeId = sanitizeString(id, 100);

    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    // Verify distribution exists and belongs to user's company
    const existing = await sql`
      SELECT id, status FROM content_distributions
      WHERE id = ${safeId} AND company_id = ${company.id}
    `;
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Distribution not found' }, { status: 404 });
    }

    // Build update fields
    const updates: string[] = [];

    if (status && VALID_STATUSES.includes(status)) {
      await sql`UPDATE content_distributions SET status = ${status}, updated_at = NOW() WHERE id = ${safeId}`;

      // Set published_at when marking as published
      if (status === 'published') {
        await sql`UPDATE content_distributions SET published_at = NOW() WHERE id = ${safeId} AND published_at IS NULL`;
      }
    }

    if (external_url !== undefined) {
      const safeUrl = sanitizeString(external_url, 2000);
      await sql`UPDATE content_distributions SET external_url = ${safeUrl}, updated_at = NOW() WHERE id = ${safeId}`;
    }

    if (typeof engagement_clicks === 'number' && engagement_clicks >= 0) {
      await sql`UPDATE content_distributions SET engagement_clicks = ${engagement_clicks}, updated_at = NOW() WHERE id = ${safeId}`;
    }

    if (typeof engagement_views === 'number' && engagement_views >= 0) {
      await sql`UPDATE content_distributions SET engagement_views = ${engagement_views}, updated_at = NOW() WHERE id = ${safeId}`;
    }

    if (typeof engagement_reactions === 'number' && engagement_reactions >= 0) {
      await sql`UPDATE content_distributions SET engagement_reactions = ${engagement_reactions}, updated_at = NOW() WHERE id = ${safeId}`;
    }

    if (notes !== undefined) {
      const safeNotes = sanitizeString(notes, 2000);
      await sql`UPDATE content_distributions SET notes = ${safeNotes}, updated_at = NOW() WHERE id = ${safeId}`;
    }

    const result = await sql`
      SELECT d.*, gc.title as content_title, gc.content_type, gc.compliance_status
      FROM content_distributions d
      LEFT JOIN generated_content gc ON d.content_id = gc.id
      WHERE d.id = ${safeId}
    `;

    return NextResponse.json({ distribution: result.rows[0] });
  } catch (error) {
    console.error('Distribution PUT error:', error);
    return NextResponse.json({ error: 'Failed to update distribution' }, { status: 500 });
  }
}
