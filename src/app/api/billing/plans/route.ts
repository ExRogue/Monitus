import { NextRequest, NextResponse } from 'next/server';
import { getPlans, getUserSubscription } from '@/lib/billing';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const [plans, user] = await Promise.all([getPlans(), getCurrentUser()]);

    let currentPlan = null;
    if (user) {
      const sub = await getUserSubscription(user.id);
      if (sub && sub.plan && sub.plan.slug !== 'trial' && sub.status === 'active') {
        const now = new Date();
        const isActive = !sub.current_period_end || new Date(sub.current_period_end) > now;
        currentPlan = {
          planId: `plan-${sub.plan.slug}`,
          planName: sub.plan.name,
          price: sub.plan.price_monthly,
          period: 'monthly',
          startDate: sub.current_period_start,
          endDate: sub.current_period_end,
          isActive,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        };
      }
    }

    return NextResponse.json({ plans, currentPlan });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
