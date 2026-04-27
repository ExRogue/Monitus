/**
 * POST /api/admin/backfill-signatures
 *
 * Populates story_signature for existing articles that were ingested before
 * the saturation feature shipped. Resumable — only processes articles where
 * story_signature IS NULL OR = ''. Defaults to last 7 days (saturation window)
 * but accepts ?days=N for wider backfills.
 *
 * Returns { processed, remaining } so the client can call repeatedly until
 * remaining = 0.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/validation';
import { extractStorySignature } from '@/lib/news';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await getDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const rl = rateLimit(`admin:backfill-sig:${user.id}`, 30, 60000);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const days = Math.min(90, parseInt(searchParams.get('days') || '7'));
    const batch = Math.min(2000, parseInt(searchParams.get('batch') || '500'));

    // Fetch a batch of articles missing signatures
    const result = await sql`
      SELECT id, title FROM news_articles
      WHERE (story_signature IS NULL OR story_signature = '')
        AND published_at >= NOW() - INTERVAL '${days.toString()} days'::interval
      LIMIT ${batch}
    `;

    let processed = 0;
    for (const row of result.rows) {
      const sig = extractStorySignature(String(row.title || ''));
      if (!sig) {
        // Mark with a placeholder so it's not retried forever
        await sql`UPDATE news_articles SET story_signature = '__no_title__' WHERE id = ${row.id as string}`;
        continue;
      }
      await sql`UPDATE news_articles SET story_signature = ${sig} WHERE id = ${row.id as string}`;
      processed++;
    }

    // How many still need backfilling?
    const remainingResult = await sql`
      SELECT COUNT(*)::int as cnt FROM news_articles
      WHERE (story_signature IS NULL OR story_signature = '')
        AND published_at >= NOW() - INTERVAL '${days.toString()} days'::interval
    `;
    const remaining = remainingResult.rows[0]?.cnt || 0;

    return NextResponse.json({
      processed,
      remaining,
      days,
      batch,
      done: remaining === 0,
    });
  } catch (error) {
    console.error('Backfill signatures error:', error);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
