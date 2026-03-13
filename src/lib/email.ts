// Email integration stub - ready for integration with SendGrid, AWS SES, or Resend
// For now, all functions log to console for development purposes

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Send a generic email
 * @param to Recipient email address
 * @param subject Email subject
 * @param body Plain text email body
 * @param html Optional HTML body for rich formatting
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  html?: string
): Promise<void> {
  try {
    console.log('[EMAIL STUB] Sending email:', {
      to,
      subject,
      bodyLength: body.length,
      hasHtml: !!html,
    });

    // TODO: Integrate with email service provider (SendGrid, AWS SES, Resend, etc.)
    // Example for Resend:
    // const { Resend } = require('resend');
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: 'noreply@telum.io', to, subject, html: html || body });

    console.log('[EMAIL STUB] Email sent successfully');
  } catch (error) {
    console.error('[EMAIL STUB] Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send welcome email to new user
 * @param userId User ID
 * @param email User email address
 * @param name User name
 */
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  name: string
): Promise<void> {
  const subject = 'Welcome to Telum';
  const body = `Hi ${name},

Welcome to Telum! We're excited to have you on board.

Telum helps regulated industries generate compliant content at scale. Here's what you can do next:

1. Complete your company setup
2. Generate your first piece of content
3. Choose the perfect plan for your needs

If you have any questions, our support team is here to help.

Best regards,
The Telum Team`;

  try {
    console.log('[EMAIL STUB] Sending welcome email:', {
      userId,
      email,
      name,
    });

    await sendEmail(email, subject, body);

    console.log('[EMAIL STUB] Welcome email sent successfully');
  } catch (error) {
    console.error('[EMAIL STUB] Failed to send welcome email:', error);
    // Don't throw - welcome email failures shouldn't block user registration
  }
}

/**
 * Send notification digest email with summary of recent notifications
 * @param userId User ID
 * @param notifications Array of notification objects
 */
export async function sendNotificationDigest(
  userId: string,
  notifications: any[]
): Promise<void> {
  const subject = `Your Telum Digest - ${notifications.length} Updates`;
  const notificationsText = notifications
    .map((n) => `- [${n.type}] ${n.title}: ${n.message}`)
    .join('\n');

  const body = `You have ${notifications.length} new notification(s):

${notificationsText}

Log in to your Telum dashboard to take action on these items.

Best regards,
The Telum Team`;

  try {
    console.log('[EMAIL STUB] Sending notification digest:', {
      userId,
      notificationCount: notifications.length,
    });

    // TODO: Query database to get user email and send
    console.log('[EMAIL STUB] Notification digest prepared');
  } catch (error) {
    console.error('[EMAIL STUB] Failed to send notification digest:', error);
    // Don't throw - digest failures shouldn't block other operations
  }
}

/**
 * Send content delivery email with generated content
 * @param userId User ID
 * @param content Array of generated content objects
 */
export async function sendContentDeliveryEmail(
  userId: string,
  content: any[]
): Promise<void> {
  const subject = `Your Telum Content - ${content.length} Piece(s) Generated`;
  const contentList = content
    .map((c) => `- [${c.content_type}] ${c.title}`)
    .join('\n');

  const body = `Your content has been generated successfully!

${contentList}

Log in to your Telum dashboard to review, edit, and publish your content.

Best regards,
The Telum Team`;

  try {
    console.log('[EMAIL STUB] Sending content delivery email:', {
      userId,
      contentCount: content.length,
      types: content.map((c) => c.content_type),
    });

    // TODO: Query database to get user email and send
    console.log('[EMAIL STUB] Content delivery email prepared');
  } catch (error) {
    console.error('[EMAIL STUB] Failed to send content delivery email:', error);
    // Don't throw - delivery failures shouldn't block content generation
  }
}

/**
 * Send usage alert email when user approaches or exceeds limits
 * @param userId User ID
 * @param alertType Type of alert (usage_warning or limit_reached)
 * @param threshold Percentage or count of limit reached
 * @param limitType Type of limit (articles or content)
 */
export async function sendUsageAlertEmail(
  userId: string,
  alertType: string,
  threshold: number,
  limitType: string
): Promise<void> {
  const isWarning = alertType === 'usage_warning';
  const subject = isWarning
    ? `Usage Alert: ${threshold}% of ${limitType} limit reached`
    : `Limit Reached: ${limitType} limit exceeded`;

  const body = isWarning
    ? `You have used ${threshold}% of your monthly ${limitType} limit.

Consider upgrading your plan to continue using Telum without interruptions.

Log in to your dashboard to view your usage and upgrade options.

Best regards,
The Telum Team`
    : `You have reached your monthly ${limitType} limit.

To continue generating content, please upgrade your subscription plan.

Log in to your dashboard to view upgrade options.

Best regards,
The Telum Team`;

  try {
    console.log('[EMAIL STUB] Sending usage alert email:', {
      userId,
      alertType,
      threshold,
      limitType,
    });

    // TODO: Query database to get user email and send
    console.log('[EMAIL STUB] Usage alert email prepared');
  } catch (error) {
    console.error('[EMAIL STUB] Failed to send usage alert email:', error);
    // Don't throw - alert email failures shouldn't block other operations
  }
}

/**
 * Send subscription confirmation email after plan selection or upgrade
 * @param userId User ID
 * @param planName Name of the selected plan
 * @param planPrice Monthly price of the plan
 */
export async function sendSubscriptionConfirmationEmail(
  userId: string,
  planName: string,
  planPrice?: number
): Promise<void> {
  const priceText = planPrice ? ` at £${(planPrice / 100).toFixed(2)}/month` : '';
  const subject = `Subscription Confirmed: ${planName} Plan`;

  const body = `Your subscription to the ${planName} plan has been confirmed${priceText}.

Your subscription details:
- Plan: ${planName}
${planPrice ? `- Price: £${(planPrice / 100).toFixed(2)}/month` : ''}
- Status: Active

You now have access to all ${planName} plan features. Log in to your dashboard to get started.

If you have any questions about your subscription, please contact our support team.

Best regards,
The Telum Team`;

  try {
    console.log('[EMAIL STUB] Sending subscription confirmation email:', {
      userId,
      planName,
      planPrice,
    });

    // TODO: Query database to get user email and send
    console.log('[EMAIL STUB] Subscription confirmation email prepared');
  } catch (error) {
    console.error('[EMAIL STUB] Failed to send subscription confirmation email:', error);
    // Don't throw - confirmation email failures shouldn't block subscription creation
  }
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendNotificationDigest,
  sendContentDeliveryEmail,
  sendUsageAlertEmail,
  sendSubscriptionConfirmationEmail,
};
