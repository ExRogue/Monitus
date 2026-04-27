/**
 * GET /api/saturation
 *
 * Returns saturation snapshots for the requesting user's company.
 *
 * Query params:
 * - signature=<story_signature>   Get one specific story
 * - limit=<n>                     Top N most saturated (default 10)
 * - window=<hours>                Lookback window in hours (default 24)
 *
 * Without `signature`: returns top N most saturated stories in the window.
 * With `signature`: returns the full snapshot for that story.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { getStorySaturation, getTopSaturatedStories } from '@/lib/saturation';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const companyId = companyResult.rows[0]?.id as string | undefined;

    const { searchParams } = new URL(request.url);
    const signature = searchParams.get('signature');
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'));
    const windowHours = Math.min(168, parseInt(searchParams.get('window') || '24'));

    if (signature) {
      const sat = await getStorySaturation(signature, companyId);
      if (!sat) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      return NextResponse.json({ saturation: sat });
    }

    const stories = await getTopSaturatedStories(companyId, limit, windowHours);
    return NextResponse.json({
      stories,
      window_hours: windowHours,
      count: stories.length,
    });
  } catch (error) {
    console.error('Saturation API error:', error);
    return NextResponse.json({ error: 'Failed to compute saturation' }, { status: 500 });
  }
}
