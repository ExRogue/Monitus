import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string;
  limits_articles: number;
  limits_content_pieces: number;
  limits_users: number;
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface UsageSummary {
  articles_used: number;
  content_pieces_used: number;
  articles_limit: number;
  content_pieces_limit: number;
  users_limit: number;
  period_start: string;
  period_end: string;
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  await getDb();
  const result = await sql`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`;
  return result.rows as unknown as SubscriptionPlan[];
}

export async function getPlan(planId: string): Promise<SubscriptionPlan | null> {
  await getDb();
  const result = await sql`SELECT * FROM subscription_plans WHERE id = ${planId}`;
  return (result.rows[0] as unknown as SubscriptionPlan) || null;
}

export async function getUserSubscription(userId: string): Promise<(Subscription & { plan?: SubscriptionPlan }) | null> {
  await getDb();
  const result = await sql`
    SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.price_monthly, p.price_yearly,
           p.features, p.limits_articles, p.limits_content_pieces, p.limits_users
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.user_id = ${userId} AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  if (!result.rows[0]) return null;
  const row = result.rows[0] as any;
  return {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    status: row.status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
    stripe_subscription_id: row.stripe_subscription_id,
    stripe_customer_id: row.stripe_customer_id,
    created_at: row.created_at,
    plan: {
      id: row.plan_id,
      name: row.plan_name,
      slug: row.plan_slug,
      price_monthly: row.price_monthly,
      price_yearly: row.price_yearly,
      currency: 'GBP',
      features: row.features,
      limits_articles: row.limits_articles,
      limits_content_pieces: row.limits_content_pieces,
      limits_users: row.limits_users,
      is_active: true,
      sort_order: 0,
    },
  };
}

export async function createSubscription(userId: string, planId: string): Promise<Subscription> {
  await getDb();
  const id = uuidv4();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await sql`
    UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = ${userId} AND status = 'active'
  `;

  await sql`
    INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (${id}, ${userId}, ${planId}, 'active', ${now.toISOString()}, ${periodEnd.toISOString()})
  `;

  return {
    id,
    user_id: userId,
    plan_id: planId,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    created_at: now.toISOString(),
  };
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await getDb();
  await sql`
    UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW()
    WHERE id = ${subscriptionId}
  `;
}

export async function trackUsage(userId: string, eventType: string, metadata: Record<string, any> = {}): Promise<void> {
  await getDb();
  const id = uuidv4();
  await sql`
    INSERT INTO usage_events (id, user_id, event_type, metadata)
    VALUES (${id}, ${userId}, ${eventType}, ${JSON.stringify(metadata)})
  `;
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  await getDb();

  const sub = await getUserSubscription(userId);
  const periodStart = sub?.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const periodEnd = sub?.current_period_end || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

  const articlesResult = await sql`
    SELECT COUNT(*) as count FROM usage_events
    WHERE user_id = ${userId} AND event_type = 'article_view' AND created_at >= ${periodStart}
  `;

  const contentResult = await sql`
    SELECT COUNT(*) as count FROM usage_events
    WHERE user_id = ${userId} AND event_type = 'content_generated' AND created_at >= ${periodStart}
  `;

  const plan = sub?.plan;

  return {
    articles_used: parseInt(articlesResult.rows[0]?.count || '0'),
    content_pieces_used: parseInt(contentResult.rows[0]?.count || '0'),
    articles_limit: plan?.limits_articles || 50,
    content_pieces_limit: plan?.limits_content_pieces || 10,
    users_limit: plan?.limits_users || 1,
    period_start: periodStart,
    period_end: periodEnd,
  };
}

export async function getAllSubscriptions(): Promise<any[]> {
  await getDb();
  const result = await sql`
    SELECT s.*, u.email, u.name as user_name, p.name as plan_name, p.slug as plan_slug
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    JOIN subscription_plans p ON s.plan_id = p.id
    ORDER BY s.created_at DESC
  `;
  return result.rows;
}

export async function getUsageStats(): Promise<{ total_users: number; active_subscriptions: number; total_content: number; total_articles: number }> {
  await getDb();
  const users = await sql`SELECT COUNT(*) as count FROM users`;
  const subs = await sql`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`;
  const content = await sql`SELECT COUNT(*) as count FROM generated_content`;
  const articles = await sql`SELECT COUNT(*) as count FROM news_articles`;

  return {
    total_users: parseInt(users.rows[0]?.count || '0'),
    active_subscriptions: parseInt(subs.rows[0]?.count || '0'),
    total_content: parseInt(content.rows[0]?.count || '0'),
    total_articles: parseInt(articles.rows[0]?.count || '0'),
  };
}

export async function checkAndCreateUsageAlerts(userId: string): Promise<void> {
  await getDb();

  const usage = await getUsageSummary(userId);
  const { createNotification } = await import('./notifications');

  // Check articles usage
  const articlesPercent = (usage.articles_used / usage.articles_limit) * 100;
  if (articlesPercent >= 100) {
    // Check if alert already sent for 100%
    const existing = await sql`
      SELECT id FROM usage_alerts
      WHERE user_id = ${userId} AND threshold_percent = 100 AND limit_type = 'articles'
      AND created_at > ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
    `;

    if (existing.rows.length === 0) {
      const alertId = uuidv4();
      await sql`
        INSERT INTO usage_alerts (id, user_id, alert_type, threshold_percent, limit_type)
        VALUES (${alertId}, ${userId}, 'limit_reached', 100, 'articles')
      `;

      await createNotification(
        userId,
        'usage_alert',
        'Article Limit Reached',
        `You have reached your monthly article limit of ${usage.articles_limit}. Upgrade your plan to continue.`,
        '/billing'
      );
    }
  } else if (articlesPercent >= 80) {
    // Check if alert already sent for 80%
    const existing = await sql`
      SELECT id FROM usage_alerts
      WHERE user_id = ${userId} AND threshold_percent = 80 AND limit_type = 'articles'
      AND created_at > ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
    `;

    if (existing.rows.length === 0) {
      const alertId = uuidv4();
      await sql`
        INSERT INTO usage_alerts (id, user_id, alert_type, threshold_percent, limit_type)
        VALUES (${alertId}, ${userId}, 'usage_warning', 80, 'articles')
      `;

      await createNotification(
        userId,
        'usage_alert',
        'Article Usage Warning',
        `You have used ${Math.round(articlesPercent)}% of your monthly article limit (${usage.articles_used}/${usage.articles_limit}).`,
        '/billing'
      );
    }
  }

  // Check content pieces usage
  const contentPercent = (usage.content_pieces_used / usage.content_pieces_limit) * 100;
  if (contentPercent >= 100) {
    // Check if alert already sent for 100%
    const existing = await sql`
      SELECT id FROM usage_alerts
      WHERE user_id = ${userId} AND threshold_percent = 100 AND limit_type = 'content'
      AND created_at > ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
    `;

    if (existing.rows.length === 0) {
      const alertId = uuidv4();
      await sql`
        INSERT INTO usage_alerts (id, user_id, alert_type, threshold_percent, limit_type)
        VALUES (${alertId}, ${userId}, 'limit_reached', 100, 'content')
      `;

      await createNotification(
        userId,
        'usage_alert',
        'Content Limit Reached',
        `You have reached your monthly content piece limit of ${usage.content_pieces_limit}. Upgrade your plan to continue.`,
        '/billing'
      );
    }
  } else if (contentPercent >= 80) {
    // Check if alert already sent for 80%
    const existing = await sql`
      SELECT id FROM usage_alerts
      WHERE user_id = ${userId} AND threshold_percent = 80 AND limit_type = 'content'
      AND created_at > ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
    `;

    if (existing.rows.length === 0) {
      const alertId = uuidv4();
      await sql`
        INSERT INTO usage_alerts (id, user_id, alert_type, threshold_percent, limit_type)
        VALUES (${alertId}, ${userId}, 'usage_warning', 80, 'content')
      `;

      await createNotification(
        userId,
        'usage_alert',
        'Content Usage Warning',
        `You have used ${Math.round(contentPercent)}% of your monthly content limit (${usage.content_pieces_used}/${usage.content_pieces_limit}).`,
        '/billing'
      );
    }
  }
}
