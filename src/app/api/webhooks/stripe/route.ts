import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/stripe';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendSubscriptionConfirmationEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const event = await handleWebhookEvent(body, signature);
    await getDb();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const planSlug = session.metadata?.planSlug;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!userId || !planSlug) break;

        // Idempotency: skip if we already have a subscription for this Stripe subscription ID
        if (stripeSubscriptionId) {
          const existingSub = await sql`SELECT id FROM subscriptions WHERE stripe_subscription_id = ${stripeSubscriptionId} LIMIT 1`;
          if (existingSub.rows.length > 0) break;
        }

        // Get plan
        const planResult = await sql`SELECT * FROM subscription_plans WHERE slug = ${planSlug}`;
        const plan = planResult.rows[0];
        if (!plan) break;

        // Cancel existing active subscriptions
        await sql`
          UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
          WHERE user_id = ${userId} AND status = 'active'
        `;

        // Create new subscription
        const subId = uuidv4();
        const now = new Date();
        const periodEnd = new Date(now);
        const interval = session.metadata?.interval || 'month';
        if (interval === 'year') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await sql`
          INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id)
          VALUES (${subId}, ${userId}, ${plan.id}, 'active', ${now.toISOString()}, ${periodEnd.toISOString()}, ${stripeSubscriptionId}, ${stripeCustomerId})
        `;

        // Create invoice record
        const invId = uuidv4();
        const invNumber = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${invId.slice(0, 6)}`;
        await sql`
          INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, invoice_number, period_start, period_end)
          VALUES (${invId}, ${userId}, ${subId}, ${plan.price_monthly * 100}, 'GBP', 'paid', ${invNumber}, ${now.toISOString()}, ${periodEnd.toISOString()})
        `;

        await sendSubscriptionConfirmationEmail(userId, plan.name, plan.price_monthly);
        await createNotification(userId, 'subscription_changed', `Subscribed to ${plan.name}`, `Your ${plan.name} plan is now active.`, '/billing');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;

        await sql`
          UPDATE subscriptions SET
            status = ${subscription.status === 'active' ? 'active' : subscription.status},
            cancel_at_period_end = ${subscription.cancel_at_period_end},
            current_period_start = ${new Date(subscription.current_period_start * 1000).toISOString()},
            current_period_end = ${new Date(subscription.current_period_end * 1000).toISOString()},
            updated_at = NOW()
          WHERE stripe_subscription_id = ${stripeSubId}
        `;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;

        const subResult = await sql`
          SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${stripeSubId}
        `;
        const userId = subResult.rows[0]?.user_id;

        await sql`
          UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
          WHERE stripe_subscription_id = ${stripeSubId}
        `;

        if (userId) {
          await createNotification(userId, 'subscription_changed', 'Subscription Cancelled', 'Your subscription has been cancelled. You can resubscribe at any time.', '/billing');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription;

        const subResult = await sql`
          SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = ${stripeSubId}
        `;
        if (subResult.rows[0]) {
          const invId = uuidv4();
          const invNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${invId.slice(0, 6)}`;
          await sql`
            INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, invoice_number, period_start, period_end)
            VALUES (${invId}, ${subResult.rows[0].user_id}, ${subResult.rows[0].id}, ${invoice.amount_paid}, ${invoice.currency.toUpperCase()}, 'paid', ${invNumber}, ${new Date(invoice.period_start * 1000).toISOString()}, ${new Date(invoice.period_end * 1000).toISOString()})
          `;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription;

        const subResult = await sql`
          SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${stripeSubId}
        `;
        if (subResult.rows[0]) {
          await createNotification(subResult.rows[0].user_id, 'billing_alert', 'Payment Failed', 'Your latest payment failed. Please update your payment method to avoid service interruption.', '/billing');
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
