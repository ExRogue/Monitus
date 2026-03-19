import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit, sanitizeString } from '@/lib/validation';

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

/**
 * POST /api/distribution/email
 * Send a newsletter/email content piece to specified recipients via Loops transactional email.
 * Falls back to logging if Loops is not configured.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`email-dist:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before sending again.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content_id, recipients } = body;

  if (!content_id || typeof content_id !== 'string') {
    return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
  }

  // recipients: array of email strings, or omit to send to the user themselves
  const recipientList: string[] = Array.isArray(recipients) && recipients.length > 0
    ? recipients.map((r: string) => sanitizeString(String(r), 320)).filter(Boolean).slice(0, 50)
    : [user.email];

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validRecipients = recipientList.filter(e => emailRegex.test(e));
  if (validRecipients.length === 0) {
    return NextResponse.json({ error: 'No valid recipient email addresses provided' }, { status: 400 });
  }

  try {
    await getDb();

    // Get company
    const companyResult = await sql`SELECT id, name FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    // Get the content
    const contentResult = await sql`
      SELECT id, title, content, content_type, compliance_status
      FROM generated_content
      WHERE id = ${content_id} AND company_id = ${company.id}
    `;
    const contentRow = contentResult.rows[0];
    if (!contentRow) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const contentType = contentRow.content_type as string;
    if (!['newsletter', 'email'].includes(contentType)) {
      return NextResponse.json(
        { error: `Only newsletter and email content can be sent via email. This content is type: ${contentType}` },
        { status: 400 }
      );
    }

    const sent: string[] = [];
    const failed: string[] = [];

    // Send via Loops if configured, otherwise just log
    if (LOOPS_API_KEY) {
      const loopsContentReadyId = process.env.LOOPS_CONTENT_READY_ID || '';

      for (const email of validRecipients) {
        try {
          const res = await fetch('https://app.loops.so/api/v1/transactional', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOOPS_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              transactionalId: loopsContentReadyId || 'newsletter-delivery',
              addToAudience: false,
              dataVariables: {
                name: email.split('@')[0],
                firstName: email.split('@')[0],
                companyName: company.name || 'Monitus',
                contentTitle: contentRow.title || 'Newsletter',
                contentType: contentType,
                contentUrl: `${APP_URL}/content`,
                pieceCount: 1,
                contentTypes: contentType,
              },
            }),
          });
          if (res.ok) {
            sent.push(email);
          } else {
            failed.push(email);
          }
        } catch {
          failed.push(email);
        }
      }
    } else {
      // Dev mode: log and mark all as sent
      console.log('[EMAIL DISTRIBUTION]', {
        from: user.email,
        to: validRecipients,
        subject: contentRow.title,
        contentType,
        contentLength: (contentRow.content as string).length,
        timestamp: new Date().toISOString(),
      });
      sent.push(...validRecipients);
    }

    // Record distribution
    const distId = uuidv4();
    await sql`
      INSERT INTO content_distributions (
        id, content_id, company_id, channel, status, published_at, notes
      ) VALUES (
        ${distId}, ${content_id}, ${company.id}, 'email', 'published', NOW(),
        ${`Sent to ${sent.length} recipient(s): ${sent.join(', ')}`}
      )
      ON CONFLICT DO NOTHING
    `;

    // Track usage event
    const eventId = uuidv4();
    await sql`
      INSERT INTO usage_events (id, user_id, event_type, metadata, created_at)
      VALUES (
        ${eventId},
        ${user.id},
        'email_newsletter_sent',
        ${JSON.stringify({ content_id, recipients: sent, failed, sent_at: new Date().toISOString() })},
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      sent: sent.length,
      failed: failed.length,
      recipients: sent,
    });
  } catch (error: any) {
    console.error('Email distribution error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
