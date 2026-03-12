import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, company_name, company_type } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    await getDb();
    const existing = await sql`SELECT id FROM waitlist WHERE email = ${email}`;
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: 'Already on the waitlist!' });
    }

    const id = uuidv4();
    await sql`
      INSERT INTO waitlist (id, email, company_name, company_type)
      VALUES (${id}, ${email}, ${company_name || ''}, ${company_type || ''})
    `;

    return NextResponse.json({ message: 'Welcome to the waitlist!' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
