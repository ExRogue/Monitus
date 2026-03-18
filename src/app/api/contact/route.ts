import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormEmail } from '@/lib/email';
import { rateLimit } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`contact:${ip}`, 5, 300_000); // 5 per 5 minutes
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await sendContactFormEmail(
      name.trim().substring(0, 200),
      email.trim().substring(0, 200),
      message.trim().substring(0, 2000),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 });
  }
}
