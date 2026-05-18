/**
 * Conversation feedback — users tell us when a conversation is wrong or not
 * relevant, and we use it to:
 *   1. Mark the conversation archived (it disappears from Market View)
 *   2. Record the signal in a feedback table so future scoring can learn
 *   3. (Future) Feed back to clustering — e.g. split a "wrong cluster"
 *      conversation back into its underlying signals
 *
 * No alert is sent — feedback is silent, just affects the user's view.
 */
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

export type FeedbackType = 'not_relevant' | 'wrong_cluster' | 'low_quality' | 'duplicate' | 'helpful';

const VALID_TYPES: FeedbackType[] = ['not_relevant', 'wrong_cluster', 'low_quality', 'duplicate', 'helpful'];

export interface ConversationFeedback {
  id: string;
  conversationId: string;
  companyId: string;
  userId: string;
  feedbackType: FeedbackType;
  comment: string;
  createdAt: string;
}

export async function recordFeedback(
  conversationId: string,
  companyId: string,
  userId: string,
  feedbackType: FeedbackType,
  comment: string = '',
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!VALID_TYPES.includes(feedbackType)) {
    return { ok: false, reason: 'Invalid feedback type' };
  }
  await getDb();

  // Verify conversation exists + belongs to the user's company
  const conv = await sql`
    SELECT id FROM market_conversations WHERE id = ${conversationId} AND company_id = ${companyId} LIMIT 1
  `;
  if (!conv.rows.length) {
    return { ok: false, reason: 'Conversation not found' };
  }

  // Store the feedback. Reuses user_feedback table if present, otherwise creates one.
  // We add the table here defensively so this works even if schema_meta lags.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS conversation_feedback (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        comment TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversation_feedback_conversation ON conversation_feedback(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversation_feedback_company ON conversation_feedback(company_id, created_at DESC)`;
  } catch {}

  await sql`
    INSERT INTO conversation_feedback (id, conversation_id, company_id, user_id, feedback_type, comment)
    VALUES (${uuidv4()}, ${conversationId}, ${companyId}, ${userId}, ${feedbackType}, ${comment.slice(0, 1000)})
  `;

  // Side-effects per feedback type
  if (feedbackType === 'not_relevant' || feedbackType === 'low_quality' || feedbackType === 'duplicate') {
    // Archive the conversation so it disappears from Market View
    await sql`
      UPDATE market_conversations
      SET archived = true, updated_at = NOW()
      WHERE id = ${conversationId} AND company_id = ${companyId}
    `;
  } else if (feedbackType === 'wrong_cluster') {
    // Detach items from the conversation so the next clustering pass can re-group them.
    // The conversation row stays (for audit), but its items become orphaned signals
    // that the next clustering run will redistribute.
    await sql`DELETE FROM conversation_items WHERE conversation_id = ${conversationId}`;
    await sql`
      UPDATE market_conversations
      SET archived = true, view_status = 'tracked_not_prioritised', updated_at = NOW()
      WHERE id = ${conversationId} AND company_id = ${companyId}
    `;
  }
  // 'helpful' is recorded but no side-effect — just signal we can use to weight
  // similar conversations more highly in the future.

  return { ok: true };
}

export async function getFeedbackHistory(companyId: string, limit = 50): Promise<ConversationFeedback[]> {
  await getDb();
  try {
    const r = await sql`
      SELECT id, conversation_id, company_id, user_id, feedback_type, comment, created_at
      FROM conversation_feedback
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return r.rows.map(row => ({
      id: String(row.id),
      conversationId: String(row.conversation_id),
      companyId: String(row.company_id),
      userId: String(row.user_id),
      feedbackType: String(row.feedback_type) as FeedbackType,
      comment: String(row.comment || ''),
      createdAt: new Date(row.created_at as string).toISOString(),
    }));
  } catch {
    return [];
  }
}
