import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';
const LOOPS_SHARE_ITEM_ID = process.env.LOOPS_SHARE_ITEM_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`share:${user.id}`, 20, 86_400_000); // 20 per day
  if (!rl.allowed) return NextResponse.json({ error: 'Daily share limit reached (20/day)' }, { status: 429 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, id, recipients, note } = body;

  // Validate inputs
  if (!type || !['signal', 'content'].includes(type)) {
    return NextResponse.json({ error: 'type must be "signal" or "content"' }, { status: 400 });
  }
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (!Array.isArray(recipients) || recipients.length === 0 || recipients.length > 10) {
    return NextResponse.json({ error: 'recipients must be 1-10 email addresses' }, { status: 400 });
  }
  for (const email of recipients) {
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
    }
  }

  await getDb();

  // Get company
  const companyResult = await sql`SELECT id, name FROM companies WHERE user_id = ${user.id} LIMIT 1`;
  if (!companyResult.rows[0]) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  const company = companyResult.rows[0];

  // Fetch the item to share
  let itemTitle = '';
  let previewText = '';

  if (type === 'signal') {
    const result = await sql`
      SELECT sa.why_it_matters, sa.usefulness_score, sa.strongest_stakeholder, na.title, na.source_url
      FROM signal_analyses sa
      JOIN news_articles na ON sa.article_id = na.id
      WHERE sa.id = ${id} AND sa.company_id = ${company.id}
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }
    itemTitle = result.rows[0].title as string;
    previewText = result.rows[0].why_it_matters as string;
  } else {
    const result = await sql`
      SELECT title, content FROM generated_content WHERE id = ${id} AND company_id = ${company.id}
    `;
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    itemTitle = result.rows[0].title as string;
    previewText = (result.rows[0].content as string || '').slice(0, 300);
  }

  const personalNote = typeof note === 'string' ? note.slice(0, 200) : '';
  const senderName = (user as any).name || (user as any).email || 'A colleague';

  // Create shared items and send emails
  let sent = 0;
  for (const recipientEmail of recipients) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const shareId = uuidv4();

      await sql`
        INSERT INTO shared_items (id, token, user_id, company_id, item_type, item_id, recipient_email, personal_note)
        VALUES (${shareId}, ${token}, ${user.id}, ${company.id as string}, ${type}, ${id}, ${recipientEmail}, ${personalNote})
      `;

      // Send email
      const viewUrl = `${APP_URL}/shared/${token}`;

      if (LOOPS_API_KEY && LOOPS_SHARE_ITEM_ID) {
        await fetch(LOOPS_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOOPS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: recipientEmail,
            transactionalId: LOOPS_SHARE_ITEM_ID,
            dataVariables: {
              senderName,
              companyName: company.name || 'Monitus',
              itemTitle: itemTitle.slice(0, 200),
              personalNote,
              viewUrl,
              previewText: previewText.slice(0, 300),
            },
          }),
        });
      } else {
        console.log('[share] Would send email to:', recipientEmail, 'viewUrl:', viewUrl);
      }

      sent++;
    } catch (err) {
      console.error(`[share] Failed to share with ${recipientEmail}:`, err);
    }
  }

  // Track usage event
  try {
    await sql`
      INSERT INTO usage_events (id, user_id, company_id, event_type, metadata)
      VALUES (${uuidv4()}, ${user.id}, ${company.id as string}, 'share_item', ${JSON.stringify({ item_type: type, item_id: id, recipient_count: sent })})
    `;
  } catch (err) {
    console.error('[share] Usage event tracking failed:', err);
  }

  return NextResponse.json({ success: true, shared: sent });
}
