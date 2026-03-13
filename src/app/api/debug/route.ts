import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  const steps: string[] = [];

  try {
    // Step 1: raw sql ping
    steps.push('starting raw sql ping');
    const ping = await sql`SELECT 1 as ok`;
    steps.push(`raw sql ok: ${JSON.stringify(ping.rows)}`);

    // Step 2: import getDb
    steps.push('importing getDb');
    const { getDb } = await import('@/lib/db');
    steps.push('getDb imported');

    // Step 3: call getDb
    steps.push('calling getDb');
    await getDb();
    steps.push('getDb completed');

    // Step 4: query users
    steps.push('querying users');
    const users = await sql`SELECT id, email, role FROM users LIMIT 3`;
    steps.push(`users: ${JSON.stringify(users.rows)}`);

    return NextResponse.json({ ok: true, steps });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      steps,
      error: error?.message || String(error),
      stack: error?.stack?.split('\n').slice(0, 8),
    });
  }
}
