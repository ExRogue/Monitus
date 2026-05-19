/**
 * "Active account" filter — used by every cron to make sure we don't burn
 * Claude tokens on dormant accounts.
 *
 * An account is active if ALL of the following are true:
 *   - The owning user exists and is not disabled
 *   - The company has a usable messaging bible (status = 'complete' OR a
 *     full_document longer than ~10 chars)
 *   - AND one of:
 *       - There's a subscription in status active / trialing / past_due, OR
 *       - The trial period hasn't expired (trial_ends_at IS NULL or > NOW())
 *
 * Crons should fetch the company IDs through getActiveCompanyIds() (or the
 * richer variant) and then loop only those. Deleting an account removes the
 * company row entirely, so deleted accounts drop out automatically via the
 * existing INNER JOIN — no extra check needed for that case.
 */
import { sql } from '@vercel/postgres';

export interface ActiveCompany {
  companyId: string;
  userId: string;
  email: string;
  userName: string;
  companyName: string;
}

/**
 * Returns the full set of active companies + owner metadata. Use this when
 * the cron needs the user's email/name (e.g. for sending a digest).
 */
export async function getActiveCompanies(): Promise<ActiveCompany[]> {
  const result = await sql`
    SELECT DISTINCT
      c.id AS company_id,
      u.id AS user_id,
      u.email,
      u.name AS user_name,
      c.name AS company_name
    FROM users u
    INNER JOIN companies c ON c.user_id = u.id
    INNER JOIN messaging_bibles mb ON mb.company_id = c.id
    LEFT JOIN subscriptions s
      ON s.user_id = u.id
     AND s.status IN ('active', 'trialing', 'past_due')
    WHERE COALESCE(u.disabled, false) = false
      AND (mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10
           OR LENGTH(COALESCE(mb.elevator_pitch, '')) > 5)
      AND (
        s.id IS NOT NULL
        OR u.trial_ends_at IS NULL
        OR u.trial_ends_at > NOW()
      )
  `;
  return result.rows.map(r => ({
    companyId: String(r.company_id),
    userId: String(r.user_id),
    email: String(r.email ?? ''),
    userName: String(r.user_name ?? ''),
    companyName: String(r.company_name ?? ''),
  }));
}

/**
 * Returns just the active company IDs as a flat array. Use this when the
 * cron doesn't need the owner's email/name (e.g. signal scoring).
 */
export async function getActiveCompanyIds(): Promise<string[]> {
  const rows = await getActiveCompanies();
  return rows.map(r => r.companyId);
}

/**
 * Returns the COUNT of active accounts. Used by the admin spend dashboard
 * to compute per-account unit economics.
 */
export async function countActiveAccounts(): Promise<number> {
  const result = await sql`
    SELECT COUNT(DISTINCT c.id) AS n
    FROM users u
    INNER JOIN companies c ON c.user_id = u.id
    INNER JOIN messaging_bibles mb ON mb.company_id = c.id
    LEFT JOIN subscriptions s
      ON s.user_id = u.id
     AND s.status IN ('active', 'trialing', 'past_due')
    WHERE COALESCE(u.disabled, false) = false
      AND (mb.status = 'complete' OR LENGTH(COALESCE(mb.full_document, '')) > 10
           OR LENGTH(COALESCE(mb.elevator_pitch, '')) > 5)
      AND (
        s.id IS NOT NULL
        OR u.trial_ends_at IS NULL
        OR u.trial_ends_at > NOW()
      )
  `;
  return Number(result.rows[0]?.n ?? 0);
}
