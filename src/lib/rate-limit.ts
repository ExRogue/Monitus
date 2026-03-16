/**
 * Rate limiter facade for authentication endpoints.
 *
 * Wraps the canonical rate limiter in validation.ts to provide
 * the {success, remaining, reset} interface that auth routes expect.
 */

import { rateLimit as coreRateLimit } from './validation';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // timestamp (ms) when the window resets
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const result = coreRateLimit(key, maxRequests, windowMs);
  const reset = Date.now() + (result.retryAfterMs ?? 0);
  return {
    success: result.allowed,
    remaining: result.allowed ? Math.max(0, maxRequests - 1) : 0,
    reset,
  };
}

/**
 * Extract the client IP address from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
