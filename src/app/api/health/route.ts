import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  let dbOk = false;
  try {
    const result = await sql`SELECT 1 as ok`;
    dbOk = result.rows[0]?.ok === 1;
  } catch {
    // DB unreachable
  }

  const status = dbOk ? 'ok' : 'degraded';
  const statusCode = dbOk ? 200 : 503;

  return NextResponse.json({ status, timestamp: new Date().toISOString() }, { status: statusCode });
}
