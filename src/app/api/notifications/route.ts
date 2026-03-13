import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  try {
    let query = sql`SELECT * FROM notifications WHERE user_id = ${user.id}`;

    if (unreadOnly) {
      query = sql`SELECT * FROM notifications WHERE user_id = ${user.id} AND read = false`;
    }

    const result = await query;
    const notifications = result.rows.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const unreadCount = result.rows.filter((n: any) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  try {
    const { action, notificationIds } = await request.json();

    if (action === 'mark_read') {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
      }

      // Mark specific notifications as read
      for (const id of notificationIds) {
        await sql`
          UPDATE notifications
          SET read = true
          WHERE id = ${id} AND user_id = ${user.id}
        `;
      }

      return NextResponse.json({ success: true, message: 'Marked as read' });
    } else if (action === 'mark_all_read') {
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${user.id}
      `;

      return NextResponse.json({ success: true, message: 'All marked as read' });
    } else if (action === 'create') {
      // Internal action to create notifications (called from other APIs)
      const { type, title, message, link } = await request.json();

      const id = uuidv4();
      await sql`
        INSERT INTO notifications (id, user_id, type, title, message, link, read)
        VALUES (${id}, ${user.id}, ${type}, ${title}, ${message || ''}, ${link || ''}, false)
      `;

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Notification action error:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
