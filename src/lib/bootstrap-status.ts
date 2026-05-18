/**
 * Bootstrap status tracking.
 *
 * The /api/onboarding/bootstrap pipeline takes 2-4 min. Without progress
 * tracking the user lands on an empty Market Brief and has no idea the
 * system is working. This module records progress on the companies row so
 * the frontend can poll and show "Scoring 30 days of coverage..." /
 * "Clustering conversations..." / etc.
 *
 * Status values:
 *   pending             — bootstrap has not run yet
 *   enriching_profile   — extracting rich CompanyProfile fields
 *   scoring_signals     — scoring 30 days of news_articles
 *   clustering          — grouping signals into market_conversations
 *   interpreting        — running Claude per conversation
 *   generating_brief    — synthesising the first Market Brief
 *   complete            — all done, Market Brief is ready
 *   failed              — something errored mid-pipeline (see bootstrap_error)
 */
import { sql } from '@vercel/postgres';
import { getDb } from './db';

export type BootstrapStatus =
  | 'pending'
  | 'enriching_profile'
  | 'scoring_signals'
  | 'clustering'
  | 'interpreting'
  | 'generating_brief'
  | 'complete'
  | 'failed';

export const BOOTSTRAP_STEP_LABELS: Record<BootstrapStatus, string> = {
  pending: 'Waiting to start...',
  enriching_profile: 'Building your full Company Profile...',
  scoring_signals: 'Scoring the last 30 days of coverage against your narrative...',
  clustering: 'Clustering coverage into market conversations...',
  interpreting: 'Producing strategic analysis on each conversation...',
  generating_brief: 'Synthesising your first Market Brief...',
  complete: 'Ready',
  failed: 'Something went wrong — please contact support',
};

export interface BootstrapProgress {
  status: BootstrapStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string;
  /** Per-step counts as they accumulate */
  progress: {
    signalsScored?: number;
    conversationsCreated?: number;
    conversationsInterpreted?: number;
    briefGenerated?: boolean;
  };
}

export async function markBootstrapStarted(companyId: string): Promise<void> {
  await getDb();
  await sql`
    UPDATE companies
    SET bootstrap_status = 'enriching_profile',
        bootstrap_started_at = NOW(),
        bootstrap_completed_at = NULL,
        bootstrap_error = '',
        bootstrap_progress = '{}',
        updated_at = NOW()
    WHERE id = ${companyId}
  `;
}

export async function setBootstrapStatus(
  companyId: string,
  status: BootstrapStatus,
  progress?: BootstrapProgress['progress'],
): Promise<void> {
  await getDb();
  if (progress) {
    // Merge with existing progress
    const existing = await sql`SELECT bootstrap_progress FROM companies WHERE id = ${companyId} LIMIT 1`;
    let merged: Record<string, unknown> = {};
    try { merged = JSON.parse(String(existing.rows[0]?.bootstrap_progress || '{}')); } catch {}
    merged = { ...merged, ...progress };
    await sql`
      UPDATE companies
      SET bootstrap_status = ${status},
          bootstrap_progress = ${JSON.stringify(merged)},
          updated_at = NOW()
      WHERE id = ${companyId}
    `;
  } else {
    await sql`
      UPDATE companies
      SET bootstrap_status = ${status}, updated_at = NOW()
      WHERE id = ${companyId}
    `;
  }
}

export async function markBootstrapComplete(companyId: string): Promise<void> {
  await getDb();
  await sql`
    UPDATE companies
    SET bootstrap_status = 'complete',
        bootstrap_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${companyId}
  `;
}

export async function markBootstrapFailed(companyId: string, error: string): Promise<void> {
  await getDb();
  await sql`
    UPDATE companies
    SET bootstrap_status = 'failed',
        bootstrap_error = ${error.slice(0, 1000)},
        bootstrap_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${companyId}
  `;
}

export async function getBootstrapProgress(companyId: string): Promise<BootstrapProgress | null> {
  await getDb();
  const r = await sql`
    SELECT bootstrap_status, bootstrap_started_at, bootstrap_completed_at,
           bootstrap_error, bootstrap_progress
    FROM companies WHERE id = ${companyId} LIMIT 1
  `;
  if (!r.rows.length) return null;
  const row = r.rows[0];
  let progress: BootstrapProgress['progress'] = {};
  try { progress = JSON.parse(String(row.bootstrap_progress || '{}')); } catch {}
  return {
    status: String(row.bootstrap_status || 'pending') as BootstrapStatus,
    startedAt: row.bootstrap_started_at ? new Date(row.bootstrap_started_at as string).toISOString() : null,
    completedAt: row.bootstrap_completed_at ? new Date(row.bootstrap_completed_at as string).toISOString() : null,
    error: String(row.bootstrap_error || ''),
    progress,
  };
}
