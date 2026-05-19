/**
 * Claude API spend tracking.
 *
 * Every anthropic.messages.create() call should be followed by a fire-and-forget
 * `void logClaudeUsage(response, { route, companyId })` so we can see daily $
 * spend per route/model/company and project month-end cost without depending
 * on the Anthropic billing console.
 *
 * Pricing source: https://platform.claude.com/docs/en/about-claude/pricing
 * (snapshotted 2026-05). Update PRICING when Anthropic re-prices a model.
 */
import { v4 as uuidv4 } from 'uuid';
import type Anthropic from '@anthropic-ai/sdk';
import { getDb } from './db';

interface ModelPrice {
  /** USD per 1M base input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M tokens written to the 5-minute prompt cache (1.25× base input) */
  cacheWrite: number;
  /** USD per 1M tokens read from the prompt cache (0.10× base input) */
  cacheRead: number;
}

/**
 * Per-model pricing. Add new model IDs here when we adopt them.
 * Unknown models fall through to the Sonnet 4.x tier as a safe upper bound.
 */
const PRICING: Record<string, ModelPrice> = {
  // Claude Haiku 4.5
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 },
  // Claude Sonnet 4 (deprecated but still in use across the codebase)
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  // Claude Sonnet 4.5 / 4.6 — same pricing as Sonnet 4
  'claude-sonnet-4-5': { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  // Claude Opus 4.5/4.6/4.7 (we don't use Opus yet but keep priced for safety)
  'claude-opus-4-5': { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-opus-4-6': { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-opus-4-7': { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 },
};

const FALLBACK_PRICE: ModelPrice = { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 };

/**
 * Compute cost in USD micro-dollars (USD × 1,000,000) for an Anthropic response.
 * Integer math at the per-call level avoids float drift across millions of rows.
 */
export function calcCostUsdMicros(
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  }
): number {
  const price = PRICING[model] ?? FALLBACK_PRICE;
  const dollars =
    (usage.input_tokens / 1_000_000) * price.input +
    (usage.output_tokens / 1_000_000) * price.output +
    ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * price.cacheWrite +
    ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * price.cacheRead;
  return Math.round(dollars * 1_000_000);
}

/**
 * Fire-and-forget: write a row to claude_usage. Never throws — logging must
 * not break the calling code. Called after every anthropic.messages.create().
 *
 * Pass the route as a stable string ("signals.score", "generate.linkedin",
 * etc.) so the admin spend page can group by it. Pass companyId when known
 * so we can attribute cost per customer.
 */
export async function logClaudeUsage(
  response: Anthropic.Messages.Message,
  opts: { route: string; companyId?: string | null; modelOverride?: string }
): Promise<void> {
  try {
    const sql = await getDb();
    const model = opts.modelOverride ?? response.model ?? 'unknown';
    const usage = response.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    } | undefined;
    if (!usage) return;
    const costMicros = calcCostUsdMicros(model, usage);
    await sql`
      INSERT INTO claude_usage (
        id, route, model, company_id,
        input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
        cost_usd_micros
      ) VALUES (
        ${uuidv4()},
        ${opts.route},
        ${model},
        ${opts.companyId ?? null},
        ${usage.input_tokens ?? 0},
        ${usage.output_tokens ?? 0},
        ${usage.cache_creation_input_tokens ?? 0},
        ${usage.cache_read_input_tokens ?? 0},
        ${costMicros}
      )
    `;
  } catch (err) {
    // Logging must never break the caller. Log to console only.
    console.error('[claude-cost] Failed to log usage:', err);
  }
}

export const __TESTING_ONLY__ = { PRICING, FALLBACK_PRICE };
