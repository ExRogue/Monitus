import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidEmail, validatePassword, escapeHtml, sanitizeString, sanitizeName, rateLimit, withTimeout } from '@/lib/validation';

describe('isValidEmail', () => {
  it('accepts valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('accepts email with plus addressing', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects email over 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('rejects non-string input', () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
    expect(isValidEmail(123 as any)).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts valid password', () => {
    expect(validatePassword('Secure123')).toEqual({ valid: true });
  });

  it('rejects password under 8 characters', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/8 characters/);
  });

  it('rejects password over 128 characters', () => {
    const result = validatePassword('A1' + 'a'.repeat(127));
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/128/);
  });

  it('rejects password without uppercase', () => {
    const result = validatePassword('password123');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/uppercase/);
  });

  it('rejects password without lowercase', () => {
    const result = validatePassword('PASSWORD123');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/lowercase/);
  });

  it('rejects password without number', () => {
    const result = validatePassword('Password');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/number/);
  });

  it('rejects null/undefined', () => {
    expect(validatePassword(null as any).valid).toBe(false);
    expect(validatePassword(undefined as any).valid).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('P&C')).toBe('P&amp;C');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('sanitizeString', () => {
  it('strips HTML tags', () => {
    expect(sanitizeString('<b>Bold</b> text')).toBe('Bold text');
  });

  it('strips script tags', () => {
    expect(sanitizeString('<script>alert(1)</script>hello')).toBe('alert(1)hello');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('truncates to maxLength', () => {
    const result = sanitizeString('a'.repeat(600));
    expect(result.length).toBe(500);
  });

  it('respects custom maxLength', () => {
    const result = sanitizeString('a'.repeat(200), 50);
    expect(result.length).toBe(50);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(null as any)).toBe('');
    expect(sanitizeString(undefined as any)).toBe('');
  });

  it('preserves ampersand in P&C style strings', () => {
    expect(sanitizeString('P&C insurance')).toBe('P&C insurance');
  });
});

describe('sanitizeName', () => {
  it('truncates to 100 characters', () => {
    const result = sanitizeName('a'.repeat(200));
    expect(result.length).toBe(100);
  });

  it('strips HTML tags', () => {
    expect(sanitizeName('<b>John</b>')).toBe('John');
  });
});

describe('rateLimit', () => {
  it('allows request within limit', () => {
    const result = rateLimit('test-key-1', 5, 60_000);
    expect(result.allowed).toBe(true);
  });

  it('blocks request after limit exceeded', () => {
    const key = 'test-key-block';
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const result = rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after window expires', async () => {
    const key = 'test-key-reset';
    rateLimit(key, 1, 50); // 50ms window
    rateLimit(key, 1, 50); // should be blocked
    await new Promise(r => setTimeout(r, 60)); // wait for window to expire
    const result = rateLimit(key, 1, 50);
    expect(result.allowed).toBe(true);
  });
});

describe('withTimeout', () => {
  it('returns result when promise resolves within timeout', async () => {
    const result = await withTimeout(Promise.resolve('done'), 1000, 'fallback');
    expect(result).toBe('done');
  });

  it('returns fallback when promise exceeds timeout', async () => {
    const slow = new Promise<string>(resolve => setTimeout(() => resolve('late'), 200));
    const result = await withTimeout(slow, 50, 'fallback');
    expect(result).toBe('fallback');
  });

  it('works with numeric fallback', async () => {
    const result = await withTimeout(new Promise<number>(resolve => setTimeout(() => resolve(99), 200)), 50, -1);
    expect(result).toBe(-1);
  });
});
