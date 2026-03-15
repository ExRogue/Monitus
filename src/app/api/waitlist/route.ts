import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { isValidEmail, sanitizeString, rateLimit } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`waitlist:${ip}`, 3, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, company_name, company_type } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeName = sanitizeString(company_name || '', 200);
    const safeType = sanitizeString(company_type || '', 100);

    await getDb();
    const existing = await sql`SELECT id FROM waitlist WHERE email = ${normalizedEmail}`;
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: 'Already on the waitlist!' });
    }

    const id = uuidv4();
    await sql`
      INSERT INTO waitlist (id, email, company_name, company_type)
      VALUES (${id}, ${normalizedEmail}, ${safeName}, ${safeType})
    `;

    return NextResponse.json({ message: 'Welcome to the waitlist!' });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
