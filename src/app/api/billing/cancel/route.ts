import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserSubscription, cancelSubscription, getPlans } from '@/lib/billing';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`cancel:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    await getDb();
    const subscription = await getUserSubscription(user.id);

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (subscription.plan_id === 'plan-trial') {
      return NextResponse.json({ error: 'Trial subscriptions cannot be cancelled this way' }, { status: 400 });
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({ error: 'Subscription is already scheduled for cancellation' }, { status: 400 });
    }

    // If subscription has a Stripe ID, cancel via Stripe
    if (subscription.stripe_subscription_id) {
      const { getStripe } = await import('@/lib/stripe');
      const stripe = getStripe();
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Mark as cancel_at_period_end in our DB
    await cancelSubscription(subscription.id);

    // Return updated plan info for the UI
    const plans = await getPlans();
    const currentPlan = plans.find(p => p.id === subscription.plan_id) || null;

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.current_period_end,
      currentPlan,
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
