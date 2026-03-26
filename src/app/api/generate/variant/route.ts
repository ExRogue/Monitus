import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, sanitizeString } from '@/lib/validation';
import { generateStakeholderVariant } from '@/lib/generate';

export const maxDuration = 300;

/**
 * POST /api/generate/variant
 *
 * Generate a stakeholder-specific variant of existing content.
 *
 * Body: { contentId: string, targetStakeholder: string, coreArgument?: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`generate-variant:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating more variants.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { contentId, targetStakeholder, coreArgument } = body;

  if (!contentId || typeof contentId !== 'string') {
    return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
  }
  if (!targetStakeholder || typeof targetStakeholder !== 'string') {
    return NextResponse.json({ error: 'targetStakeholder is required' }, { status: 400 });
  }

  await getDb();

  // Verify user owns the company that owns this content
  const contentCheck = await sql`
    SELECT gc.company_id FROM generated_content gc
    JOIN companies c ON c.id = gc.company_id
    WHERE gc.id = ${contentId} AND c.user_id = ${user.id}
  `;
  if (!contentCheck.rows.length) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  const companyId = contentCheck.rows[0].company_id as string;

  // If coreArgument not provided, try to get it from the linked opportunity
  let resolvedCoreArgument = sanitizeString(coreArgument || '', 2000);
  let recommendation: { why_it_matters?: string; why_now?: string; source_development?: string } | undefined;

  if (!resolvedCoreArgument) {
    try {
      const oppResult = await sql`
        SELECT o.core_argument, o.why_it_matters, o.why_now, o.summary
        FROM opportunities o
        JOIN generated_content gc ON gc.opportunity_id = o.id
        WHERE gc.id = ${contentId}
        LIMIT 1
      `;
      if (oppResult.rows.length) {
        resolvedCoreArgument = String(oppResult.rows[0].core_argument || oppResult.rows[0].summary || '');
        recommendation = {
          why_it_matters: String(oppResult.rows[0].why_it_matters || ''),
          why_now: String(oppResult.rows[0].why_now || ''),
        };
      }
    } catch {
      // Non-critical
    }
  }

  try {
    const result = await generateStakeholderVariant(
      companyId,
      contentId,
      sanitizeString(targetStakeholder, 200),
      resolvedCoreArgument,
      recommendation
    );

    return NextResponse.json({
      id: result.id,
      title: result.title,
      content: result.content,
      targetStakeholder,
    });
  } catch (err: any) {
    console.error('[generate/variant] Error:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate variant' },
      { status: 500 }
    );
  }
}
