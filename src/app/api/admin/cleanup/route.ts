import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getDb();

  // Remove test/demo users created during development
  const testEmails = [
    'test@test.com',
    'test@telum.ai',
    'demo@telum.ai',
    'uitest@telumtest.com',
    'browsertest@telumtest.com',
    'roundtrip@telumtest.com',
    'testmigration2@test.com',
    'stevenkong1994@gmail.com',
  ];

  // Delete related data first (companies, notifications, etc.)
  for (const email of testEmails) {
    const userResult = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (userResult.rows.length > 0) {
      const uid = userResult.rows[0].id;
      await sql`DELETE FROM notifications WHERE user_id = ${uid}`;
      await sql`DELETE FROM usage_events WHERE user_id = ${uid}`;
      await sql`DELETE FROM usage_alerts WHERE user_id = ${uid}`;
      await sql`DELETE FROM invoices WHERE user_id = ${uid}`;
      await sql`DELETE FROM subscriptions WHERE user_id = ${uid}`;
      await sql`DELETE FROM generated_content WHERE company_id IN (SELECT id FROM companies WHERE user_id = ${uid})`;
      await sql`DELETE FROM companies WHERE user_id = ${uid}`;
      await sql`DELETE FROM users WHERE id = ${uid}`;
    }
  }

  // Verify remaining users
  const remaining = await sql`SELECT id, email, role FROM users ORDER BY created_at`;
  return NextResponse.json({
    ok: true,
    message: `Cleaned up test users. ${remaining.rows.length} user(s) remain.`,
    users: remaining.rows,
  });
}
