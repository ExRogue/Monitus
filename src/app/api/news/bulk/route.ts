import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

// Track bookmarks and dismissals in memory (in production, use a user_articles table)
const userBookmarks = new Map<string, Set<string>>();
const userDismissals = new Map<string, Set<string>>();

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'bookmarks') {
    const bookmarks = userBookmarks.get(user.id) || new Set();
    return NextResponse.json({ bookmarkedIds: Array.from(bookmarks) });
  } else if (action === 'dismissals') {
    const dismissals = userDismissals.get(user.id) || new Set();
    return NextResponse.json({ dismissedIds: Array.from(dismissals) });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, articleIds } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: 'No article IDs provided' }, { status: 400 });
    }

    if (action === 'bookmark') {
      if (!userBookmarks.has(user.id)) {
        userBookmarks.set(user.id, new Set());
      }
      const bookmarks = userBookmarks.get(user.id)!;
      articleIds.forEach((id) => bookmarks.add(id));

      return NextResponse.json({
        success: true,
        message: `Bookmarked ${articleIds.length} article(s)`,
      });
    } else if (action === 'unbookmark') {
      if (!userBookmarks.has(user.id)) {
        userBookmarks.set(user.id, new Set());
      }
      const bookmarks = userBookmarks.get(user.id)!;
      articleIds.forEach((id) => bookmarks.delete(id));

      return NextResponse.json({
        success: true,
        message: `Removed ${articleIds.length} bookmark(s)`,
      });
    } else if (action === 'dismiss') {
      if (!userDismissals.has(user.id)) {
        userDismissals.set(user.id, new Set());
      }
      const dismissals = userDismissals.get(user.id)!;
      articleIds.forEach((id) => dismissals.add(id));

      return NextResponse.json({
        success: true,
        message: `Dismissed ${articleIds.length} article(s)`,
      });
    } else if (action === 'undismiss') {
      if (!userDismissals.has(user.id)) {
        userDismissals.set(user.id, new Set());
      }
      const dismissals = userDismissals.get(user.id)!;
      articleIds.forEach((id) => dismissals.delete(id));

      return NextResponse.json({
        success: true,
        message: `Restored ${articleIds.length} article(s)`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('News bulk operation error:', error);
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
  }
}
