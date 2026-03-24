import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { createNotification } from './notifications';
import { v4 as uuidv4 } from 'uuid';

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';
const LOOPS_SIGNAL_ALERT_ID = process.env.LOOPS_SIGNAL_ALERT_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

interface AlertSignal {
  usefulness_score: number;
  recommended_action: string;
  why_it_matters: string;
  strongest_stakeholder: string;
}

interface AlertArticle {
  title: string;
  source_url: string;
}

/**
 * Check if the current time falls within quiet hours.
 * Handles overnight ranges (e.g. 22:00-06:00).
 */
export function isQuietHours(start: string, end: string): boolean {
  if (!start || !end) return false;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;

  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00-17:00)
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  } else {
    // Overnight range (e.g. 22:00-06:00)
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }
}

/**
 * Send a Slack Block Kit message via incoming webhook.
 */
export async function sendSlackAlert(
  webhookUrl: string,
  signal: AlertSignal,
  article: AlertArticle
): Promise<boolean> {
  try {
    const score = signal.usefulness_score.toFixed(1);
    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `Signal Alert: ${article.title.slice(0, 140)}`, emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Score:* ${score}/10` },
            { type: 'mrkdwn', text: `*Action:* ${signal.recommended_action.replace('_', ' ')}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Why it matters:*\n${signal.why_it_matters.slice(0, 500)}` },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View in Monitus' },
              url: `${APP_URL}/market-analyst`,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Read Source' },
              url: article.source_url,
            },
          ],
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('[alerts] Slack send failed:', err);
    return false;
  }
}

/**
 * Send an alert email via Loops transactional template.
 */
export async function sendAlertEmail(
  email: string,
  firstName: string,
  signal: AlertSignal,
  article: AlertArticle
): Promise<boolean> {
  if (!LOOPS_API_KEY || !LOOPS_SIGNAL_ALERT_ID) {
    console.log('[alerts] Email alert skipped (no Loops config):', email, article.title);
    return true; // Don't count as failure
  }

  try {
    const res = await fetch(LOOPS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        transactionalId: LOOPS_SIGNAL_ALERT_ID,
        dataVariables: {
          firstName,
          signalTitle: article.title.slice(0, 200),
          score: signal.usefulness_score.toFixed(1),
          whyItMatters: signal.why_it_matters.slice(0, 500),
          sourceUrl: article.source_url,
          dashboardUrl: `${APP_URL}/market-analyst`,
          stakeholder: signal.strongest_stakeholder || '',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[alerts] Loops alert email failed:', text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[alerts] Alert email send failed:', err);
    return false;
  }
}

/**
 * Dispatch a signal alert to configured channels (Slack, email, in-app).
 * Called from the news cron when a signal scores as 'act_now'.
 */
export async function dispatchSignalAlert(
  companyId: string,
  userId: string,
  signalAnalysisId: string,
  signal: AlertSignal,
  article: AlertArticle
): Promise<void> {
  try {
    await getDb();

    // Get company alert settings + user info
    const [companyResult, userResult] = await Promise.all([
      sql`SELECT slack_webhook_url, alert_threshold, alert_channels, quiet_hours_start, quiet_hours_end, alert_email_enabled, name FROM companies WHERE id = ${companyId}`,
      sql`SELECT email, name FROM users WHERE id = ${userId}`,
    ]);

    const company = companyResult.rows[0];
    const user = userResult.rows[0];
    if (!company || !user) return;

    const threshold = parseInt(String(company.alert_threshold)) || 8;
    const channels = (company.alert_channels as string) || 'email';

    // Check threshold
    if (signal.usefulness_score < threshold) return;

    // Check quiet hours
    if (isQuietHours(company.quiet_hours_start as string, company.quiet_hours_end as string)) {
      await sql`INSERT INTO signal_alerts (id, company_id, user_id, signal_analysis_id, channel, status) VALUES (${uuidv4()}, ${companyId}, ${userId}, ${signalAnalysisId}, ${channels}, 'suppressed_quiet_hours')`;
      return;
    }

    // Check for duplicate alert (don't alert twice for same signal)
    const existing = await sql`SELECT id FROM signal_alerts WHERE signal_analysis_id = ${signalAnalysisId} AND status = 'sent' LIMIT 1`;
    if (existing.rows.length > 0) return;

    let slackOk = true;
    let emailOk = true;

    // Send Slack alert
    if ((channels === 'slack' || channels === 'both') && company.slack_webhook_url) {
      slackOk = await sendSlackAlert(company.slack_webhook_url as string, signal, article);
    }

    // Send email alert
    if ((channels === 'email' || channels === 'both') && company.alert_email_enabled) {
      emailOk = await sendAlertEmail(
        user.email as string,
        (user.name as string) || 'there',
        signal,
        article
      );
    }

    // Create in-app notification
    await createNotification(
      userId,
      'signal_alert',
      `High-value signal: ${article.title.slice(0, 80)}`,
      signal.why_it_matters.slice(0, 200),
      '/market-analyst'
    );

    // Log the alert
    const status = slackOk && emailOk ? 'sent' : 'failed';
    await sql`INSERT INTO signal_alerts (id, company_id, user_id, signal_analysis_id, channel, status) VALUES (${uuidv4()}, ${companyId}, ${userId}, ${signalAnalysisId}, ${channels}, ${status})`;
  } catch (err) {
    console.error('[alerts] dispatchSignalAlert failed:', err);
    // Non-fatal: signal is still saved, just alert didn't send
  }
}
