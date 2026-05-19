/**
 * Lightweight monitoring: structured error logging + DB persistence.
 * No third-party signup required.
 *
 * Persisted errors are visible at GET /api/admin/errors (admin only).
 *
 * Email alerting is intentionally OFF for now — Steven asked to hold all new
 * email integrations until launch. Re-enable by uncommenting the
 * `fireLoopsAlert` block at the end of `reportError`, and set the
 * LOOPS_ADMIN_ALERT_ID + ADMIN_ALERT_EMAIL env vars when ready.
 */
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  /** Route or job name, e.g. "cron/weekly-brief" or "api/briefing". */
  route: string;
  /** Stable error code for filtering: BILLING, RATE_LIMIT, DB, AI, UNKNOWN, etc. */
  code?: string;
  severity?: ErrorSeverity;
  /** Free-form structured context. User IDs, company IDs, args. No PII bodies. */
  data?: Record<string, unknown>;
}

let tableEnsured = false;
async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS error_events (
        id TEXT PRIMARY KEY,
        route TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'error',
        code TEXT DEFAULT '',
        message TEXT NOT NULL,
        stack TEXT DEFAULT '',
        context TEXT DEFAULT '{}',
        alerted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_error_events_route_severity ON error_events(route, severity, created_at DESC)`;
    tableEnsured = true;
  } catch {
    // If we can't create the table we still want logging to work — swallow.
  }
}

/**
 * Report an error. Logs to console + persists to the error_events table.
 * Critical errors are flagged in the `alerted` column so they're easy to
 * filter at /api/admin/errors. No email is sent — re-enable the email path
 * here when ready to launch.
 */
export async function reportError(err: unknown, ctx: ErrorContext): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err));
  const severity = ctx.severity || 'error';
  const code = ctx.code || extractCode(error.message);

  const payload = {
    route: ctx.route,
    severity,
    code,
    message: error.message,
    stack: error.stack,
    data: ctx.data,
  };

  // Always log to console — Vercel captures these and they're free.
  console.error(`[monitor:${severity}:${ctx.route}]`, payload);

  // Best-effort DB persist.
  try {
    await ensureTable();
    await sql`
      INSERT INTO error_events (id, route, severity, code, message, stack, context, alerted)
      VALUES (
        ${uuidv4()},
        ${ctx.route},
        ${severity},
        ${code},
        ${error.message.slice(0, 2000)},
        ${(error.stack || '').slice(0, 4000)},
        ${JSON.stringify(ctx.data || {})},
        ${severity === 'critical'}
      )
    `;
  } catch {}
}

function extractCode(message: string): string {
  const m = message.match(/^\[([A-Z_]+)\]/);
  if (m) return m[1];
  if (/credit balance|billing|payment|insufficient.*funds/i.test(message)) return 'BILLING';
  if (/authentication|invalid.*api.?key|unauthorized.*api/i.test(message)) return 'AUTH';
  if (/rate limit|too many requests|429/i.test(message)) return 'RATE_LIMIT';
  if (/timeout|timed out/i.test(message)) return 'TIMEOUT';
  if (/database|sql|connection/i.test(message)) return 'DB';
  return 'UNKNOWN';
}

/**
 * Wrap an async handler with monitoring. If the handler throws, the error is
 * reported and re-thrown so caller-level error responses still fire.
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  routeName: string,
  handler: T,
  opts?: { severity?: ErrorSeverity },
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      await reportError(err, {
        route: routeName,
        severity: opts?.severity || 'error',
      });
      throw err;
    }
  }) as T;
}

/**
 * Report a Claude SDK error from a per-call catch block.
 *
 * Why this exists: the news cron + scoring + clustering passes wrap individual
 * Claude calls in try/catch and fall back to dummy data on failure. That's the
 * right behavior — one bad article shouldn't halt the cron — but it meant we
 * went weeks running on fallback scores when the Anthropic account ran out of
 * credits, with nothing surfacing the underlying API error. The cron's outer
 * catch never fired because individual call catches swallowed everything.
 *
 * This helper classifies the error and reports it. Critical severities
 * (BILLING, AUTH) get persisted to error_events. Lower severities are skipped
 * to avoid flooding the table when a single article 500s.
 *
 * Includes a 10-minute dedupe window per route so a billing outage producing
 * thousands of failures in quick succession yields one alert, not thousands.
 */
const BILLING_DEDUPE_MS = 10 * 60 * 1000;
const billingDedupeCache = new Map<string, number>();

export async function reportClaudeError(err: unknown, route: string, data?: Record<string, unknown>): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err));
  const code = extractCode(error.message);

  // Only persist BILLING / AUTH / RATE_LIMIT — these are operator-actionable.
  // Skip transient single-call failures (UNKNOWN, TIMEOUT) — too noisy.
  if (code !== 'BILLING' && code !== 'AUTH' && code !== 'RATE_LIMIT') {
    console.error(`[claude-error:${route}]`, error.message);
    return;
  }

  // Dedupe — billing failures fire on every call. We only need to know once.
  const cacheKey = `${route}:${code}`;
  const last = billingDedupeCache.get(cacheKey) || 0;
  if (Date.now() - last < BILLING_DEDUPE_MS) {
    return;
  }
  billingDedupeCache.set(cacheKey, Date.now());

  await reportError(error, {
    route,
    code,
    severity: 'critical',
    data: {
      ...(data || {}),
      hint:
        code === 'BILLING'
          ? 'Anthropic credit balance exhausted — top up at console.anthropic.com/settings/billing'
          : code === 'AUTH'
            ? 'Anthropic API key invalid or revoked'
            : 'Anthropic rate limit hit — increase tier or back off',
    },
  });
}
