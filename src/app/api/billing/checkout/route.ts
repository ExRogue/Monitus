import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { rateLimit } from '@/lib/validation';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`checkout:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { planSlug, interval = 'monthly' } = body;

    if (!planSlug || !['starter', 'professional', 'enterprise'].includes(planSlug)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    await getDb();

    // Verify the plan exists
    const planResult = await sql`SELECT * FROM subscription_plans WHERE slug = ${planSlug} AND is_active = true`;
    if (!planResult.rows[0]) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const url = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      planSlug,
      interval: interval as 'monthly' | 'yearly',
      successUrl: `${origin}/dashboard?checkout=success`,
      cancelUrl: `${origin}/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
