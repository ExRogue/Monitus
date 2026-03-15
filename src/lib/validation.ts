/**
 * Input validation utilities for Monitus API routes
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}

export interface PasswordValidation {
  valid: boolean;
  message?: string;
}

export function validatePassword(password: string): PasswordValidation {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must be fewer than 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';
  // Strip dangerous HTML tags but preserve normal characters like & in "P&C"
  // React handles output escaping; we only strip actual tags here
  const stripped = input.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
  return stripped;
}

export function sanitizeName(name: string): string {
  return sanitizeString(name, 100);
}

export async function safeParseJson(request: Request): Promise<{ data: any; error: string | null }> {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch {
    return { data: null, error: 'Invalid request body. Please send valid JSON.' };
  }
}

/**
 * Simple in-memory rate limiter.
 * In production with multiple serverless instances this is per-instance,
 * but it still provides meaningful protection against abuse from a single
 * client hitting the same instance repeatedly.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Wraps an async operation with a timeout. Returns the result if it completes
 * within the deadline, otherwise returns the fallback value.
 * Useful for keeping Vercel Hobby plan responses under the 10s limit.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Fire-and-forget: call an internal API endpoint without awaiting the response.
 * Used to offload non-critical work (pillar tagging, sentiment analysis) so the
 * primary response can be returned within the Vercel timeout window.
 *
 * @param url  Absolute URL or path (path will be resolved against NEXT_PUBLIC_APP_URL / VERCEL_URL)
 * @param body JSON-serialisable payload
 */
export function fireAndForget(url: string, body: Record<string, unknown>): void {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error(`fireAndForget to ${fullUrl} failed:`, err);
  });
}

// Periodic cleanup to prevent unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 300_000); // every 5 minutes
}
