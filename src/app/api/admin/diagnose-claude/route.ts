/**
 * GET /api/admin/diagnose-claude
 *
 * Admin-only Claude availability check. Reports:
 *   - whether ANTHROPIC_API_KEY is set in the runtime
 *   - whether a minimal Haiku call succeeds (counts to 5)
 *   - the round-trip latency (real Claude calls should be ~1-2s for Haiku)
 *   - any error from the SDK
 *
 * Use case: the bootstrap pipeline returned fast with all fallback scores,
 * suggesting Claude isn't actually being called. This endpoint tells us if
 * that's the case AND in what way.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result: Record<string, unknown> = {
    env: {
      anthropicKeySet: Boolean(process.env.ANTHROPIC_API_KEY),
      anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length ?? 0,
      anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY
        ? process.env.ANTHROPIC_API_KEY.slice(0, 7) + '...'
        : null,
      nodeEnv: process.env.NODE_ENV,
      runtime: 'nodejs',
    },
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    result.claudeCall = { attempted: false, reason: 'ANTHROPIC_API_KEY not set in runtime' };
    return NextResponse.json(result);
  }

  // Make a tiny test call
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const started = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with the JSON: {"ok": true, "test": "passed"}. No other text.' }],
    });
    const elapsedMs = Date.now() - started;
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    result.claudeCall = {
      attempted: true,
      success: true,
      elapsedMs,
      model: response.model,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      responseText: text.slice(0, 200),
    };
  } catch (err: any) {
    const elapsedMs = Date.now() - started;
    result.claudeCall = {
      attempted: true,
      success: false,
      elapsedMs,
      errorMessage: err?.message || String(err),
      errorStatus: err?.status || err?.response?.status,
      errorType: err?.error?.type || err?.constructor?.name,
      errorBody: typeof err?.error === 'object' ? err.error : null,
    };
  }

  return NextResponse.json(result);
}
