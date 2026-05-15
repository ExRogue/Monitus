import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

/**
 * GET /api/admin/errors
 *
 * Admin-only view of recent error_events. Supports filters:
 *   - severity=critical|error|warning|info
 *   - route=cron/weekly-brief (substring match)
 *   - limit=50 (max 200)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await getDb();
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const routeFilter = searchParams.get('route');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Tolerate missing table — first cron failure will create it.
    let rows: any[] = [];
    try {
      if (severity && routeFilter) {
        const r = await sql`
          SELECT id, route, severity, code, message, context, alerted, created_at
          FROM error_events
          WHERE severity = ${severity} AND route LIKE ${'%' + routeFilter + '%'}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        rows = r.rows;
      } else if (severity) {
        const r = await sql`
          SELECT id, route, severity, code, message, context, alerted, created_at
          FROM error_events
          WHERE severity = ${severity}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        rows = r.rows;
      } else if (routeFilter) {
        const r = await sql`
          SELECT id, route, severity, code, message, context, alerted, created_at
          FROM error_events
          WHERE route LIKE ${'%' + routeFilter + '%'}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        rows = r.rows;
      } else {
        const r = await sql`
          SELECT id, route, severity, code, message, context, alerted, created_at
          FROM error_events
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        rows = r.rows;
      }
    } catch {
      // Table doesn't exist yet — that's fine.
      rows = [];
    }

    // Aggregate counts for the dashboard summary card
    let summary = { critical_24h: 0, error_24h: 0, total_24h: 0 };
    try {
      const counts = await sql`
        SELECT severity, COUNT(*)::int as n
        FROM error_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY severity
      `;
      for (const row of counts.rows) {
        const sev = String(row.severity);
        const n = Number(row.n);
        summary.total_24h += n;
        if (sev === 'critical') summary.critical_24h = n;
        if (sev === 'error') summary.error_24h = n;
      }
    } catch {}

    return NextResponse.json({ errors: rows, summary });
  } catch (error) {
    console.error('Admin errors endpoint failed:', error);
    return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 });
  }
}
