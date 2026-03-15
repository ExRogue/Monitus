import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSubscription } from '@/lib/billing';
import { sanitizeString, rateLimit } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`subscribe:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const planId = sanitizeString(body.planId || '', 100);

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const subscription = await createSubscription(user.id, planId);
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
