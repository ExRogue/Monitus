/**
 * POST /api/opportunities/from-cluster
 *
 * Spawns a new opportunity from a Story Saturation cluster. Restores the
 * content pipeline path that the previous (action-less) Story Saturation
 * UI had broken: user clicks "Generate opportunity" on a cluster row, this
 * endpoint joins the cluster's articles to their signal_analyses rows for
 * the requesting company, and inserts an opportunity with the relevant
 * source signal IDs + cluster context.
 *
 * Body: { story_signature: string, window_hours?: number }
 * Returns: { opportunity }   201 Created
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/validation';

export const maxDuration = 30;

interface Body {
  story_signature?: string;
  window_hours?: number;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const rl = rateLimit(`opps:from-cluster:${user.id}`, 30, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
    const companyId = companyResult.rows[0]?.id as string | undefined;
    if (!companyId) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    let body: Body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const signature = String(body.story_signature || '').trim();
    if (!signature) return NextResponse.json({ error: 'story_signature is required' }, { status: 400 });
    const windowHours = Math.min(720, Math.max(1, Number(body.window_hours || 168)));

    // Pull the articles in the cluster so we can pick a representative title
    // and find their corresponding signal_analyses rows.
    const clusterResult = await sql`
      SELECT na.id AS article_id, na.title, na.source, na.source_url, na.published_at, na.summary,
             sa.id AS signal_id, sa.usefulness_score, sa.urgency, sa.narrative_fit,
             sa.why_it_matters, sa.why_it_matters_to_buyers, sa.recommended_action,
             sa.competitor_context, sa.themes
      FROM news_articles na
      LEFT JOIN signal_analyses sa ON sa.article_id = na.id AND sa.company_id = ${companyId}
      WHERE na.story_signature = ${signature}
        AND na.published_at >= NOW() - make_interval(hours => ${windowHours})
      ORDER BY COALESCE(sa.usefulness_score, sa.narrative_fit, 0) DESC, na.published_at DESC
    `;

    if (clusterResult.rows.length === 0) {
      return NextResponse.json({ error: 'Cluster not found in window' }, { status: 404 });
    }

    const top = clusterResult.rows[0];
    const signalIds = clusterResult.rows
      .map(r => r.signal_id)
      .filter((id): id is string => Boolean(id));

    // Compose a useful summary: cluster headline + count + best-article context.
    const articleCount = clusterResult.rows.length;
    const sourceCount = new Set(clusterResult.rows.map(r => r.source)).size;
    const summary = [
      `${articleCount} article${articleCount === 1 ? '' : 's'} across ${sourceCount} publication${sourceCount === 1 ? '' : 's'}.`,
      String(top.summary || '').slice(0, 400),
    ].filter(Boolean).join('\n\n');

    const oppId = uuidv4();
    const result = await sql`
      INSERT INTO opportunities (
        id, company_id, type, title, summary,
        source_signal_ids, theme_id,
        why_it_matters, why_it_matters_to_buyers,
        competitor_context, buyer_relevance, recommended_angle, recommended_format,
        urgency_score, opportunity_score, narrative_pillar, target_icp, stage
      ) VALUES (
        ${oppId}, ${companyId}, 'topic-led', ${String(top.title || 'Untitled story')}, ${summary},
        ${JSON.stringify(signalIds)}, NULL,
        ${String(top.why_it_matters || '')}, ${String(top.why_it_matters_to_buyers || '')},
        ${String(top.competitor_context || '')}, '', '', 'linkedin_post',
        ${Number(top.urgency || 50)}, ${Math.round(Number(top.usefulness_score || top.narrative_fit || 50))}, '', '', 'analyse'
      )
      RETURNING *
    `;

    return NextResponse.json({ opportunity: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[opportunities/from-cluster] failed:', error);
    return NextResponse.json({ error: 'Failed to generate opportunity' }, { status: 500 });
  }
}
