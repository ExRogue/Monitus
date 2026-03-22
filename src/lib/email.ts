import { sql } from '@vercel/postgres';

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

// Transactional email template IDs from Loops dashboard
// Set these in Vercel env vars after creating templates in Loops
const TEMPLATE_IDS = {
  welcome: process.env.LOOPS_WELCOME_ID || '',
  verify_email: process.env.LOOPS_VERIFY_EMAIL_ID || '',
  password_reset: process.env.LOOPS_PASSWORD_RESET_ID || '',
  team_invite: process.env.LOOPS_TEAM_INVITE_ID || '',
  usage_warning: process.env.LOOPS_USAGE_WARNING_ID || '',
  usage_limit: process.env.LOOPS_USAGE_LIMIT_ID || '',
  subscription_confirmed: process.env.LOOPS_SUBSCRIPTION_ID || '',
  notification_digest: process.env.LOOPS_DIGEST_ID || '',
  content_ready: process.env.LOOPS_CONTENT_READY_ID || '',
  contact_form: process.env.LOOPS_CONTACT_ID || '',
  drip_day2: process.env.LOOPS_DRIP_DAY2_ID || '',
  drip_day5: process.env.LOOPS_DRIP_DAY5_ID || '',
  drip_day12: process.env.LOOPS_DRIP_DAY12_ID || '',
};

async function sendViaLoops(
  email: string,
  transactionalId: string,
  dataVariables: Record<string, string | number>,
): Promise<void> {
  if (!LOOPS_API_KEY || !transactionalId) {
    console.log('[EMAIL DEV] Would send to:', email, 'Template:', transactionalId, 'Data:', dataVariables);
    return;
  }

  const res = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      transactionalId,
      addToAudience: true,
      dataVariables,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Loops API error (${res.status}): ${text}`);
  }
}

// Also add contact to Loops audience for marketing emails
async function addToAudience(email: string, name: string, properties?: Record<string, string>): Promise<void> {
  if (!LOOPS_API_KEY) return;

  try {
    await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        source: 'monitus-app',
        ...properties,
      }),
    });
  } catch {
    // Non-critical — best-effort audience sync
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // Generic email — use welcome template as fallback or log
  console.log('[EMAIL] Generic send to:', to, 'Subject:', subject);
}

export async function sendWelcomeEmail(userId: string, email: string, name: string): Promise<void> {
  try {
    // Add to Loops audience
    await addToAudience(email, name, { userSource: 'registration' });

    await sendViaLoops(email, TEMPLATE_IDS.welcome, {
      name,
      firstName: name.split(' ')[0],
      dashboardUrl: `${APP_URL}/dashboard`,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  await sendViaLoops(email, TEMPLATE_IDS.password_reset, {
    resetUrl,
  });
}

export async function sendEmailVerification(email: string, verifyToken: string): Promise<void> {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${verifyToken}`;
  await sendViaLoops(email, TEMPLATE_IDS.verify_email, {
    verifyUrl,
  });
}

export async function sendTeamInviteEmail(email: string, inviterName: string, companyName: string, inviteToken: string): Promise<void> {
  const inviteUrl = `${APP_URL}/api/team/accept?token=${inviteToken}`;
  await sendViaLoops(email, TEMPLATE_IDS.team_invite, {
    inviterName,
    companyName,
    inviteUrl,
  });
}

export async function sendUsageAlertEmail(userId: string, alertType: string, threshold: number, limitType: string): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    const isWarning = alertType === 'usage_warning';
    const templateId = isWarning ? TEMPLATE_IDS.usage_warning : TEMPLATE_IDS.usage_limit;

    await sendViaLoops(user.email, templateId, {
      name: user.name,
      firstName: (user.name as string).split(' ')[0],
      threshold,
      limitType,
      billingUrl: `${APP_URL}/billing`,
    });
  } catch (error) {
    console.error('Failed to send usage alert email:', error);
  }
}

export async function sendSubscriptionConfirmationEmail(userId: string, planName: string, planPrice?: number): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    await sendViaLoops(user.email, TEMPLATE_IDS.subscription_confirmed, {
      name: user.name,
      firstName: (user.name as string).split(' ')[0],
      planName,
      planPrice: planPrice ? `£${planPrice}/month` : '',
      dashboardUrl: `${APP_URL}/dashboard`,
    });
  } catch (error) {
    console.error('Failed to send subscription confirmation email:', error);
  }
}

export async function sendNotificationDigest(userId: string, notifications: any[]): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    await sendViaLoops(user.email, TEMPLATE_IDS.notification_digest, {
      name: user.name,
      firstName: (user.name as string).split(' ')[0],
      updateCount: notifications.length,
      dashboardUrl: `${APP_URL}/dashboard`,
    });
  } catch (error) {
    console.error('Failed to send notification digest:', error);
  }
}

export async function sendContentDeliveryEmail(userId: string, content: any[]): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    const contentTypes = content.map(c => c.content_type).join(', ');
    await sendViaLoops(user.email, TEMPLATE_IDS.content_ready, {
      name: user.name,
      firstName: (user.name as string).split(' ')[0],
      pieceCount: content.length,
      contentTypes,
      contentUrl: `${APP_URL}/content`,
    });
  } catch (error) {
    console.error('Failed to send content delivery email:', error);
  }
}

export async function sendContactFormEmail(
  name: string,
  email: string,
  message: string,
): Promise<void> {
  try {
    await addToAudience(email, name, { source: 'contact-form' });

    if (TEMPLATE_IDS.contact_form) {
      await sendViaLoops(email, TEMPLATE_IDS.contact_form, {
        name,
        firstName: name.split(' ')[0],
        message: message.substring(0, 500),
      });
    } else {
      // No template configured -- log for manual follow-up
      console.log('[CONTACT FORM]', { name, email, message: message.substring(0, 200), timestamp: new Date().toISOString() });
    }
  } catch (error) {
    console.error('Failed to send contact form email:', error);
  }
}

export async function scheduleOnboardingDrip(userId: string, email: string, name: string): Promise<void> {
  const firstName = name.split(' ')[0];
  const now = Date.now();
  const dripDays = [2, 5, 12];

  try {
    // Schedule drip emails in DB for the cron job to pick up
    for (const day of dripDays) {
      const scheduledFor = new Date(now + day * 24 * 60 * 60 * 1000).toISOString();
      await sql`
        INSERT INTO onboarding_drip_queue (user_id, drip_day, scheduled_for, email, first_name)
        VALUES (${userId}, ${day}, ${scheduledFor}, ${email}, ${firstName})
        ON CONFLICT (user_id, drip_day) DO NOTHING
      `;
    }
  } catch (error) {
    // Table may not exist yet — non-fatal, migration will create it
    console.error('Failed to schedule onboarding drip:', error);
  }
}

export async function sendOnboardingDripEmail(email: string, firstName: string, dripDay: number): Promise<void> {
  const templateMap: Record<number, string> = {
    2: TEMPLATE_IDS.drip_day2,
    5: TEMPLATE_IDS.drip_day5,
    12: TEMPLATE_IDS.drip_day12,
  };
  const templateId = templateMap[dripDay];
  if (!templateId) return;

  const ctaByDay: Record<number, string> = {
    2: `${APP_URL}/signals`,
    5: `${APP_URL}/content`,
    12: `${APP_URL}/billing`,
  };

  await sendViaLoops(email, templateId, {
    firstName,
    ctaUrl: ctaByDay[dripDay] || `${APP_URL}/signals`,
    dripDay,
  });
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendTeamInviteEmail,
  sendUsageAlertEmail,
  sendSubscriptionConfirmationEmail,
  sendNotificationDigest,
  sendContentDeliveryEmail,
  sendContactFormEmail,
  scheduleOnboardingDrip,
  sendOnboardingDripEmail,
};
