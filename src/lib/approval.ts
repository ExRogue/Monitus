/**
 * Content approval workflow.
 *
 * Regulated buyers (Lloyd's brokers, MGAs, reinsurers) can't publish auto-
 * generated content without compliance sign-off. This module gives each
 * company an opt-in approval queue:
 *
 *   1. Company toggles `require_content_approval = true` in settings
 *   2. All new content is created with approval_status='pending' (instead of
 *      going straight to draft)
 *   3. Distribution endpoints (LinkedIn post, email send, etc.) refuse to
 *      publish anything still in pending or rejected state
 *   4. An approver (initially: the company owner) can approve, reject with
 *      reason, or request changes — every action is logged in
 *      content_approval_events as an immutable audit trail
 *
 * Schema fields (migration v23):
 *   companies.require_content_approval   BOOLEAN DEFAULT false
 *   generated_content.approval_status    TEXT     -- 'not_required'|'pending'|'approved'|'rejected'
 *   generated_content.approved_by        TEXT
 *   generated_content.approved_at        TIMESTAMP
 *   generated_content.rejection_reason   TEXT
 *   generated_content.submitted_at       TIMESTAMP
 *   generated_content.fabrication_check  TEXT (JSON)
 *   content_approval_events              (audit log)
 */
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'request_changes' | 'override';

export interface ApprovalEvent {
  id: string;
  content_id: string;
  action: ApprovalAction;
  actor_user_id: string;
  reason: string;
  created_at: string;
}

/**
 * Does this company require approval before content can be distributed?
 * Defaults to false (back-compat with existing companies).
 */
export async function companyRequiresApproval(companyId: string): Promise<boolean> {
  try {
    const r = await sql`
      SELECT require_content_approval FROM companies WHERE id = ${companyId}
    `;
    return Boolean(r.rows[0]?.require_content_approval);
  } catch {
    return false;
  }
}

/**
 * Determine the initial approval_status for a newly generated piece based on
 * the company's policy. Use this from the generation flow.
 */
export async function initialApprovalStatus(companyId: string): Promise<ApprovalStatus> {
  return (await companyRequiresApproval(companyId)) ? 'pending' : 'not_required';
}

/**
 * Block distribution if content isn't approved (when approval is required).
 * Returns { allowed: false, reason } to send straight back as a 403 in the
 * distribution route, or { allowed: true } to proceed.
 */
export async function checkContentApprovalForDistribution(
  contentId: string,
  companyId: string,
): Promise<{ allowed: true } | { allowed: false; status: number; reason: string }> {
  const requireApproval = await companyRequiresApproval(companyId);
  if (!requireApproval) return { allowed: true };

  const r = await sql`
    SELECT approval_status FROM generated_content
    WHERE id = ${contentId} AND company_id = ${companyId}
  `;
  const status = (r.rows[0]?.approval_status as ApprovalStatus | undefined) || 'pending';

  if (status === 'approved' || status === 'not_required') return { allowed: true };
  if (status === 'pending') {
    return {
      allowed: false,
      status: 403,
      reason: 'This content is awaiting approval. Have an approver review it before distributing.',
    };
  }
  return {
    allowed: false,
    status: 403,
    reason: 'This content was rejected in review and cannot be distributed. Generate a new version.',
  };
}

async function logApprovalEvent(
  contentId: string,
  action: ApprovalAction,
  actorUserId: string,
  reason: string,
): Promise<void> {
  try {
    await sql`
      INSERT INTO content_approval_events (id, content_id, action, actor_user_id, reason, created_at)
      VALUES (${uuidv4()}, ${contentId}, ${action}, ${actorUserId}, ${reason}, NOW())
    `;
  } catch (err) {
    console.error('[approval] Failed to log event:', err);
  }
}

export async function submitForApproval(
  contentId: string,
  companyId: string,
  actorUserId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const r = await sql`
    SELECT approval_status FROM generated_content
    WHERE id = ${contentId} AND company_id = ${companyId}
  `;
  if (!r.rows.length) return { ok: false, reason: 'Content not found' };

  const current = (r.rows[0].approval_status as ApprovalStatus) || 'not_required';
  if (current === 'approved') {
    return { ok: false, reason: 'Already approved' };
  }

  await sql`
    UPDATE generated_content
    SET approval_status = 'pending',
        submitted_at = NOW(),
        approved_by = NULL,
        approved_at = NULL,
        rejection_reason = NULL,
        updated_at = NOW()
    WHERE id = ${contentId}
  `;

  await logApprovalEvent(contentId, 'submit', actorUserId, '');
  return { ok: true };
}

export async function approve(
  contentId: string,
  companyId: string,
  approverUserId: string,
  note: string = '',
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const r = await sql`
    SELECT approval_status FROM generated_content
    WHERE id = ${contentId} AND company_id = ${companyId}
  `;
  if (!r.rows.length) return { ok: false, reason: 'Content not found' };

  await sql`
    UPDATE generated_content
    SET approval_status = 'approved',
        approved_by = ${approverUserId},
        approved_at = NOW(),
        rejection_reason = NULL,
        updated_at = NOW()
    WHERE id = ${contentId}
  `;

  await logApprovalEvent(contentId, 'approve', approverUserId, note);
  return { ok: true };
}

export async function reject(
  contentId: string,
  companyId: string,
  approverUserId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!reason || reason.trim().length < 3) {
    return { ok: false, reason: 'A rejection reason is required for the audit trail.' };
  }

  const r = await sql`
    SELECT approval_status FROM generated_content
    WHERE id = ${contentId} AND company_id = ${companyId}
  `;
  if (!r.rows.length) return { ok: false, reason: 'Content not found' };

  await sql`
    UPDATE generated_content
    SET approval_status = 'rejected',
        rejection_reason = ${reason.slice(0, 1000)},
        approved_by = ${approverUserId},
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = ${contentId}
  `;

  await logApprovalEvent(contentId, 'reject', approverUserId, reason.slice(0, 1000));
  return { ok: true };
}

export async function getApprovalHistory(contentId: string): Promise<ApprovalEvent[]> {
  try {
    const r = await sql`
      SELECT id, content_id, action, actor_user_id, reason, created_at
      FROM content_approval_events
      WHERE content_id = ${contentId}
      ORDER BY created_at ASC
    `;
    return r.rows as unknown as ApprovalEvent[];
  } catch {
    return [];
  }
}

export async function listApprovalQueue(companyId: string): Promise<any[]> {
  try {
    const r = await sql`
      SELECT id, title, content_type, created_at, submitted_at,
             approval_status, rejection_reason, fabrication_check
      FROM generated_content
      WHERE company_id = ${companyId} AND approval_status = 'pending'
      ORDER BY COALESCE(submitted_at, created_at) DESC
      LIMIT 100
    `;
    return r.rows;
  } catch {
    return [];
  }
}
