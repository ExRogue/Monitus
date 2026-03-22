import { sql } from '@vercel/postgres';
import * as crypto from 'crypto';

export async function dispatchWebhook(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const hooks = await sql`
      SELECT id, url, secret
      FROM user_webhooks
      WHERE user_id = ${userId}
        AND active = true
        AND events::text LIKE ${`%"${event}"%`}
    `;

    if (!hooks.rows.length) return;

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

    for (const hook of hooks.rows) {
      const signature = crypto
        .createHmac('sha256', hook.secret as string)
        .update(body)
        .digest('hex');

      try {
        const res = await fetch(hook.url as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Monitus-Signature': `sha256=${signature}`,
            'X-Monitus-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        await sql`
          UPDATE user_webhooks
          SET last_fired_at = NOW(), last_status = ${res.status}
          WHERE id = ${hook.id}
        `;
      } catch (err) {
        console.error(`[webhooks] Failed to deliver ${event} to ${hook.url}:`, err);
        await sql`
          UPDATE user_webhooks SET last_fired_at = NOW(), last_status = 0 WHERE id = ${hook.id}
        `;
      }
    }
  } catch (err) {
    // Non-fatal — webhook dispatch must not break the main flow
    console.error('[webhooks] dispatchWebhook error:', err);
  }
}
