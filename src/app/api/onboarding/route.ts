import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();

    // Check if dismissed
    const userRow = await sql`SELECT onboarding_dismissed FROM users WHERE id = ${user.id}`;
    if (userRow.rows[0]?.onboarding_dismissed) {
      return NextResponse.json({ dismissed: true, steps: [] });
    }

    // Check each step
    const [companyRes, bibleRes, newsRes, contentRes, voiceRes] = await Promise.all([
      sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`,
      sql`SELECT id FROM messaging_bibles mb JOIN companies c ON mb.company_id = c.id WHERE c.user_id = ${user.id} AND mb.status = 'complete' LIMIT 1`,
      sql`SELECT COUNT(*)::int as count FROM news_articles LIMIT 1`,
      sql`SELECT COUNT(*)::int as count FROM generated_content gc JOIN companies c ON gc.company_id = c.id WHERE c.user_id = ${user.id}`,
      sql`SELECT COUNT(*)::int as count FROM voice_edits WHERE user_id = ${user.id}`,
    ]);

    const steps = [
      { id: 'company', label: 'Set up your company', href: '/settings', complete: companyRes.rows.length > 0 },
      { id: 'bible', label: 'Generate your Messaging Bible', href: '/messaging-bible', complete: bibleRes.rows.length > 0 },
      { id: 'news', label: 'Fetch industry news', href: '/pipeline', complete: parseInt(newsRes.rows[0]?.count) > 0 },
      { id: 'content', label: 'Create your first content', href: '/pipeline', complete: parseInt(contentRes.rows[0]?.count) > 0 },
      { id: 'voice', label: 'Review & refine your voice', href: '/content', complete: parseInt(voiceRes.rows[0]?.count) > 0 },
    ];

    const completedCount = steps.filter(s => s.complete).length;

    return NextResponse.json({ dismissed: false, steps, completedCount, totalSteps: steps.length });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
  }
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await getDb();
    await sql`UPDATE users SET onboarding_dismissed = true WHERE id = ${user.id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json({ error: 'Failed to dismiss onboarding' }, { status: 500 });
  }
}
