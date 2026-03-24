import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { generateOpportunitiesFromSignals } from '@/lib/opportunities';
import { createNotification } from '@/lib/notifications';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LOOPS_API_KEY = process.env.LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';
const LOOPS_ALERT_ID = process.env.LOOPS_ALERT_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai';

async function sendUrgentOpportunityAlert(
  email: string,
  firstName: string,
  opportunityCount: number,
  topOpportunity: { title: string; urgency_score: number; summary: string },
): Promise<void> {
  if (!LOOPS_API_KEY || !LOOPS_ALERT_ID) {
    console.log('[strategy-review] [DEV] Would send urgent alert to:', email, {
      opportunityCount,
      topOpportunity: topOpportunity.title,
    });
    return;
  }

  await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      transactionalId: LOOPS_ALERT_ID,
      addToAudience: false,
      dataVariables: {
        firstName,
        opportunityCount,
        topOpportunityTitle: topOpportunity.title,
        topOpportunitySummary: topOpportunity.summary.substring(0, 200),
        urgencyScore: topOpportunity.urgency_score,
        opportunitiesUrl: `${APP_URL}/opportunities`,
        dashboardUrl: `${APP_URL}/dashboard`,
      },
    }),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let usersProcessed = 0;
  let totalOpportunitiesGenerated = 0;
  let alertsSent = 0;

  try {
    await getDb();

    // Find all active users with a completed narrative
    const usersResult = await sql`
      SELECT DISTINCT u.id, u.email, u.name, c.id as company_id
      FROM users u
      INNER JOIN companies c ON c.user_id = u.id
      INNER JOIN messaging_bibles mb ON mb.company_id = c.id
      WHERE mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10
    `;

    for (const user of usersResult.rows) {
      usersProcessed++;
      const companyId = user.company_id as string;
      const userId = user.id as string;

      try {
        // Check for high-scoring signals without opportunities
        const highSignals = await sql`
          SELECT sa.id, sa.usefulness_score
          FROM signal_analyses sa
          WHERE sa.company_id = ${companyId}
          AND sa.usefulness_score >= 8
          AND NOT EXISTS (
            SELECT 1 FROM opportunities o
            WHERE o.company_id = ${companyId}
            AND o.source_signal_ids LIKE '%' || sa.id || '%'
          )
          ORDER BY sa.usefulness_score DESC
          LIMIT 5
        `;

        if (highSignals.rows.length === 0) {
          console.log(`[cron/strategy-review] No new high-scoring signals for company ${companyId}`);
          continue;
        }

        // Auto-generate opportunities from those signals
        const result = await generateOpportunitiesFromSignals(companyId, 5);
        totalOpportunitiesGenerated += result.generated;

        console.log(`[cron/strategy-review] Company ${companyId}: generated ${result.generated} opportunities (${result.total} total)`);

        if (result.generated > 0) {
          // Create in-app notification
          await createNotification(
            userId,
            'opportunity_generated',
            'New Opportunities Identified',
            `${result.generated} new content opportunit${result.generated === 1 ? 'y has' : 'ies have'} been identified from high-scoring signals.`,
            '/opportunities'
          );

          // Check for high-urgency opportunities (urgency_score >= 8)
          const urgentOpps = await sql`
            SELECT title, urgency_score, summary
            FROM opportunities
            WHERE company_id = ${companyId}
            AND dismissed = false
            AND urgency_score >= 8
            AND created_at >= NOW() - INTERVAL '1 hour'
            ORDER BY urgency_score DESC
            LIMIT 1
          `;

          if (urgentOpps.rows.length > 0) {
            const topOpp = urgentOpps.rows[0];
            const firstName = ((user.name as string) || 'there').split(' ')[0];

            try {
              await sendUrgentOpportunityAlert(
                user.email as string,
                firstName,
                result.generated,
                {
                  title: topOpp.title as string,
                  urgency_score: Number(topOpp.urgency_score),
                  summary: topOpp.summary as string,
                },
              );
              alertsSent++;
            } catch (emailErr) {
              console.error(`[cron/strategy-review] Failed to send alert to ${user.email}:`, emailErr);
            }
          }
        }
      } catch (userErr) {
        console.error(`[cron/strategy-review] Error processing user ${userId}:`, userErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[cron/strategy-review] Complete: ${usersProcessed} users, ${totalOpportunitiesGenerated} opportunities generated, ${alertsSent} alerts sent in ${duration}ms`);

    return NextResponse.json({
      success: true,
      usersProcessed,
      opportunitiesGenerated: totalOpportunitiesGenerated,
      alertsSent,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cron/strategy-review] Fatal error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Strategy review failed', duration_ms: duration },
      { status: 500 }
    );
  }
}
