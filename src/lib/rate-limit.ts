/**
 * Simple in-memory rate limiter for authentication endpoints.
 *
 * Uses a Map to track request counts per key (typically IP-based).
 * In production with multiple serverless instances this is per-instance,
 * but it still provides meaningful protection against brute-force attacks
 * from a single client hitting the same instance repeatedly.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // timestamp (ms) when the window resets
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check and increment the rate limit for a given key.
 *
 * @param key         Unique identifier (e.g. "login:<ip>")
 * @param maxRequests Maximum allowed requests within the window
 * @param windowMs    Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // Window expired or first request -- start a new window
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
  }

  // Within window but under the limit
  if (entry.count < maxRequests) {
    entry.count++;
    return { success: true, remaining: maxRequests - entry.count, reset: entry.resetAt };
  }

  // Over the limit
  return { success: false, remaining: 0, reset: entry.resetAt };
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

// Periodic cleanup to prevent unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 300_000); // every 5 minutes
}
