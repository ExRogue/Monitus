import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

async function ensureTable() {
  await getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS user_article_actions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, article_id, action)
    )
  `;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'bookmarks') {
    const result = await sql`
      SELECT article_id FROM user_article_actions
      WHERE user_id = ${user.id} AND action = 'bookmark'
    `;
    return NextResponse.json({ bookmarkedIds: result.rows.map(r => r.article_id) });
  } else if (action === 'dismissals') {
    const result = await sql`
      SELECT article_id FROM user_article_actions
      WHERE user_id = ${user.id} AND action = 'dismiss'
    `;
    return NextResponse.json({ dismissedIds: result.rows.map(r => r.article_id) });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { action, articleIds } = body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: 'No article IDs provided' }, { status: 400 });
    }

    if (action === 'bookmark') {
      await Promise.all(articleIds.map((articleId: string) => {
        const id = `${user.id}-${articleId}-bookmark`;
        return sql`
          INSERT INTO user_article_actions (id, user_id, article_id, action)
          VALUES (${id}, ${user.id}, ${articleId}, 'bookmark')
          ON CONFLICT (user_id, article_id, action) DO NOTHING
        `;
      }));
      return NextResponse.json({ success: true, message: `Bookmarked ${articleIds.length} article(s)` });
    } else if (action === 'unbookmark') {
      await sql`DELETE FROM user_article_actions WHERE user_id = ${user.id} AND article_id = ANY(${articleIds as any}) AND action = 'bookmark'`;
      return NextResponse.json({ success: true, message: `Removed ${articleIds.length} bookmark(s)` });
    } else if (action === 'dismiss') {
      await Promise.all(articleIds.map((articleId: string) => {
        const id = `${user.id}-${articleId}-dismiss`;
        return sql`
          INSERT INTO user_article_actions (id, user_id, article_id, action)
          VALUES (${id}, ${user.id}, ${articleId}, 'dismiss')
          ON CONFLICT (user_id, article_id, action) DO NOTHING
        `;
      }));
      return NextResponse.json({ success: true, message: `Dismissed ${articleIds.length} article(s)` });
    } else if (action === 'undismiss') {
      await sql`DELETE FROM user_article_actions WHERE user_id = ${user.id} AND article_id = ANY(${articleIds as any}) AND action = 'dismiss'`;
      return NextResponse.json({ success: true, message: `Restored ${articleIds.length} article(s)` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('News bulk operation error:', error);
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
  }
}
