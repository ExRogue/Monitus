import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string = '',
  link: string = ''
): Promise<string> {
  await getDb();

  const id = uuidv4();
  await sql`
    INSERT INTO notifications (id, user_id, type, title, message, link, read)
    VALUES (${id}, ${userId}, ${type}, ${title}, ${message}, ${link}, false)
  `;

  return id;
}

export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  await getDb();

  const result = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId} AND read = false
    ORDER BY created_at DESC
  `;

  return result.rows as Notification[];
}

export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;

  await getDb();

  await sql`UPDATE notifications SET read = true WHERE id = ANY(${notificationIds as any}::text[])`;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await getDb();

  await sql`UPDATE notifications SET read = true WHERE user_id = ${userId}`;
}

export async function deleteOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
  await getDb();

  await sql`
    DELETE FROM notifications
    WHERE user_id = ${userId}
    AND created_at < NOW() - INTERVAL '1 day' * ${daysOld}
  `;
}
