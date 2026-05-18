/**
 * Recommended Actions — the weekly priority list shown on the Market Brief.
 *
 * Distinct from `opportunities` (Content Producer territory). Recommended
 * actions are "do these things this week" — sales moves, outbound, PR pitches,
 * monitoring tasks. They carry a status lifecycle and an audit log of
 * transitions.
 */
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

export type ActionCategory =
  | 'sales' | 'outbound' | 'founder_content' | 'website' | 'pr'
  | 'campaign' | 'podcast_webinar' | 'monitor';

export type ActionPriority = 'low' | 'medium' | 'high' | 'critical';

export type ActionUrgency = 'now' | 'this-week' | 'monitor';

export type ActionStatus =
  | 'not_started' | 'in_progress' | 'done'
  | 'ignored' | 'snoozed' | 'assigned';

export type ActionEventType =
  | 'created' | 'status_changed' | 'assigned'
  | 'snoozed' | 'ignored' | 'completed' | 'nudged' | 'reopened' | 'drafted';

export interface RecommendedAction {
  id: string;
  companyId: string;
  marketBriefId?: string | null;
  conversationId?: string | null;
  title: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
  urgency: ActionUrgency;
  status: ActionStatus;
  ownerUserId?: string | null;
  dueDate?: string | null;
  createdFrom: string;
  rank: number;
  createdAt: string;
  updatedAt: string;
}

function rowToAction(row: Record<string, unknown>): RecommendedAction {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    marketBriefId: row.market_brief_id ? String(row.market_brief_id) : null,
    conversationId: row.conversation_id ? String(row.conversation_id) : null,
    title: String(row.title),
    description: String(row.description || ''),
    category: (String(row.category || 'monitor') as ActionCategory),
    priority: (String(row.priority || 'medium') as ActionPriority),
    urgency: (String(row.urgency || 'this-week') as ActionUrgency),
    status: (String(row.status || 'not_started') as ActionStatus),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    dueDate: row.due_date ? new Date(row.due_date as string).toISOString() : null,
    createdFrom: String(row.created_from || 'system_generated'),
    rank: Number(row.rank || 0),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export interface CreateActionInput {
  companyId: string;
  marketBriefId?: string;
  conversationId?: string;
  title: string;
  description?: string;
  category?: ActionCategory;
  priority?: ActionPriority;
  urgency?: ActionUrgency;
  rank?: number;
  createdFrom?: string;
  actorUserId?: string;
}

export async function createAction(input: CreateActionInput): Promise<RecommendedAction> {
  await getDb();
  const id = uuidv4();
  await sql`
    INSERT INTO recommended_actions (
      id, company_id, market_brief_id, conversation_id,
      title, description, category, priority, urgency,
      status, created_from, rank
    ) VALUES (
      ${id}, ${input.companyId}, ${input.marketBriefId || null}, ${input.conversationId || null},
      ${input.title}, ${input.description || ''},
      ${input.category || 'monitor'}, ${input.priority || 'medium'}, ${input.urgency || 'this-week'},
      'not_started', ${input.createdFrom || 'system_generated'}, ${input.rank ?? 0}
    )
  `;

  await logActionEvent({
    actionId: id,
    companyId: input.companyId,
    userId: input.actorUserId,
    eventType: 'created',
    newStatus: 'not_started',
    message: `Created from ${input.createdFrom || 'system_generated'}`,
  });

  const r = await sql`SELECT * FROM recommended_actions WHERE id = ${id}`;
  return rowToAction(r.rows[0]);
}

export async function updateActionStatus(
  actionId: string,
  companyId: string,
  newStatus: ActionStatus,
  opts: { userId?: string; reason?: string; source?: string } = {},
): Promise<RecommendedAction | null> {
  await getDb();

  const current = await sql`
    SELECT status FROM recommended_actions WHERE id = ${actionId} AND company_id = ${companyId}
  `;
  if (!current.rows.length) return null;
  const previousStatus = String(current.rows[0].status);

  const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
  const ignoredReason = newStatus === 'ignored' ? (opts.reason || '').slice(0, 500) : null;

  if (newStatus === 'done') {
    await sql`
      UPDATE recommended_actions
      SET status = ${newStatus}, completed_at = ${completedAt}, updated_at = NOW()
      WHERE id = ${actionId}
    `;
  } else if (newStatus === 'ignored') {
    await sql`
      UPDATE recommended_actions
      SET status = ${newStatus}, ignored_reason = ${ignoredReason}, updated_at = NOW()
      WHERE id = ${actionId}
    `;
  } else {
    await sql`
      UPDATE recommended_actions
      SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${actionId}
    `;
  }

  await logActionEvent({
    actionId,
    companyId,
    userId: opts.userId,
    source: opts.source || 'web_app',
    eventType: newStatus === 'done' ? 'completed' : 'status_changed',
    previousStatus,
    newStatus,
    message: opts.reason || '',
  });

  const r = await sql`SELECT * FROM recommended_actions WHERE id = ${actionId}`;
  return r.rows[0] ? rowToAction(r.rows[0]) : null;
}

export async function snoozeAction(
  actionId: string,
  companyId: string,
  until: Date,
  opts: { userId?: string; reason?: string } = {},
): Promise<RecommendedAction | null> {
  await getDb();
  await sql`
    UPDATE recommended_actions
    SET status = 'snoozed', snoozed_until = ${until.toISOString()}, updated_at = NOW()
    WHERE id = ${actionId} AND company_id = ${companyId}
  `;
  await logActionEvent({
    actionId,
    companyId,
    userId: opts.userId,
    source: 'web_app',
    eventType: 'snoozed',
    newStatus: 'snoozed',
    message: opts.reason || `Snoozed until ${until.toDateString()}`,
  });
  const r = await sql`SELECT * FROM recommended_actions WHERE id = ${actionId}`;
  return r.rows[0] ? rowToAction(r.rows[0]) : null;
}

export async function assignAction(
  actionId: string,
  companyId: string,
  ownerUserId: string,
  opts: { actorUserId?: string } = {},
): Promise<RecommendedAction | null> {
  await getDb();
  await sql`
    UPDATE recommended_actions
    SET owner_user_id = ${ownerUserId}, status = 'assigned', updated_at = NOW()
    WHERE id = ${actionId} AND company_id = ${companyId}
  `;
  await logActionEvent({
    actionId,
    companyId,
    userId: opts.actorUserId,
    source: 'web_app',
    eventType: 'assigned',
    newStatus: 'assigned',
    message: `Assigned to user ${ownerUserId}`,
  });
  const r = await sql`SELECT * FROM recommended_actions WHERE id = ${actionId}`;
  return r.rows[0] ? rowToAction(r.rows[0]) : null;
}

interface ActionEvent {
  actionId: string;
  companyId: string;
  userId?: string;
  source?: string;
  eventType: ActionEventType;
  previousStatus?: string;
  newStatus?: string;
  message?: string;
}

export async function logActionEvent(event: ActionEvent): Promise<void> {
  await sql`
    INSERT INTO action_activity_log (
      id, action_id, company_id, user_id, source,
      event_type, previous_status, new_status, message
    ) VALUES (
      ${uuidv4()}, ${event.actionId}, ${event.companyId}, ${event.userId || null}, ${event.source || 'system'},
      ${event.eventType}, ${event.previousStatus || null}, ${event.newStatus || null}, ${(event.message || '').slice(0, 1000)}
    )
  `;
}

export async function getAction(actionId: string, companyId: string): Promise<RecommendedAction | null> {
  await getDb();
  const r = await sql`SELECT * FROM recommended_actions WHERE id = ${actionId} AND company_id = ${companyId}`;
  return r.rows[0] ? rowToAction(r.rows[0]) : null;
}

export async function listActionsForBrief(briefId: string): Promise<RecommendedAction[]> {
  await getDb();
  const r = await sql`
    SELECT * FROM recommended_actions
    WHERE market_brief_id = ${briefId}
    ORDER BY rank ASC, created_at DESC
  `;
  return r.rows.map(rowToAction);
}

export async function listActiveActions(companyId: string, limit = 50): Promise<RecommendedAction[]> {
  await getDb();
  const r = await sql`
    SELECT * FROM recommended_actions
    WHERE company_id = ${companyId}
      AND status IN ('not_started', 'in_progress', 'assigned', 'snoozed')
    ORDER BY
      CASE urgency WHEN 'now' THEN 0 WHEN 'this-week' THEN 1 ELSE 2 END,
      rank ASC,
      created_at DESC
    LIMIT ${limit}
  `;
  return r.rows.map(rowToAction);
}

export async function getActionHistory(actionId: string, companyId: string) {
  await getDb();
  const r = await sql`
    SELECT id, action_id, company_id, user_id, source, event_type,
           previous_status, new_status, message, created_at
    FROM action_activity_log
    WHERE action_id = ${actionId} AND company_id = ${companyId}
    ORDER BY created_at ASC
  `;
  return r.rows.map(row => ({
    id: String(row.id),
    actionId: String(row.action_id),
    userId: row.user_id ? String(row.user_id) : null,
    source: String(row.source),
    eventType: String(row.event_type),
    previousStatus: row.previous_status ? String(row.previous_status) : null,
    newStatus: row.new_status ? String(row.new_status) : null,
    message: String(row.message || ''),
    createdAt: new Date(row.created_at as string).toISOString(),
  }));
}
