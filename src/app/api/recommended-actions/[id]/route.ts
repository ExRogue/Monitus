import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson, sanitizeString } from '@/lib/validation';
import {
  getAction,
  updateActionStatus,
  snoozeAction,
  assignAction,
  getActionHistory,
  type ActionStatus,
} from '@/lib/recommended-actions';

export const runtime = 'nodejs';

const VALID_STATUSES: ActionStatus[] = ['not_started', 'in_progress', 'done', 'ignored', 'snoozed', 'assigned'];

/**
 * GET   /api/recommended-actions/[id]               → full action + history
 * PATCH /api/recommended-actions/[id]               → update status, snooze, assign
 *
 * PATCH body shapes (each is exclusive):
 *   { status: 'done' | 'in_progress' | ... }
 *   { snoozeUntil: <ISO date>, reason?: string }
 *   { assignTo: <userId> }
 *   { status: 'ignored', reason: <required string> }
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actionId = params.id;
  if (!actionId) return NextResponse.json({ error: 'Action ID required' }, { status: 400 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 });

  const action = await getAction(actionId, company.id as string);
  if (!action) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const history = await getActionHistory(actionId, company.id as string);
  return NextResponse.json({ action, history });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`recommended-action:${user.id}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const actionId = params.id;
  if (!actionId) return NextResponse.json({ error: 'Action ID required' }, { status: 400 });

  await getDb();
  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 });
  const companyId = company.id as string;

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  // Snooze takes precedence — has its own dedicated path
  const snoozeUntil = (body as any)?.snoozeUntil;
  if (typeof snoozeUntil === 'string') {
    const until = new Date(snoozeUntil);
    if (Number.isNaN(until.getTime())) {
      return NextResponse.json({ error: 'snoozeUntil must be a valid ISO date' }, { status: 400 });
    }
    const reason = sanitizeString(String((body as any)?.reason || ''), 500);
    const updated = await snoozeAction(actionId, companyId, until, { userId: user.id, reason });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ action: updated });
  }

  // Assignment
  const assignTo = (body as any)?.assignTo;
  if (typeof assignTo === 'string' && assignTo.trim()) {
    const updated = await assignAction(actionId, companyId, assignTo.trim(), { actorUserId: user.id });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ action: updated });
  }

  // Status change
  const status = (body as any)?.status;
  if (typeof status === 'string') {
    if (!VALID_STATUSES.includes(status as ActionStatus)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    const reason = sanitizeString(String((body as any)?.reason || ''), 500);
    if (status === 'ignored' && reason.length < 3) {
      return NextResponse.json({ error: 'A reason of at least 3 characters is required when marking an action as ignored' }, { status: 400 });
    }
    const updated = await updateActionStatus(actionId, companyId, status as ActionStatus, {
      userId: user.id,
      reason,
      source: 'web_app',
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ action: updated });
  }

  return NextResponse.json({ error: 'No valid fields to update — provide status, snoozeUntil, or assignTo' }, { status: 400 });
}
