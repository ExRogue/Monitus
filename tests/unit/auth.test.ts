import { describe, it, expect, vi, beforeAll } from 'vitest';
import { verifyToken } from '@/lib/auth';

// Mock next/headers and @vercel/postgres — auth functions that hit the DB
// are tested via API route tests; here we only test pure functions
vi.mock('@vercel/postgres', () => ({
  sql: vi.fn().mockResolvedValue({ rows: [] }),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: () => null }),
}));
vi.mock('@/lib/db', () => ({
  getDb: vi.fn().mockResolvedValue(undefined),
}));

// Use the dev secret (no JWT_SECRET set in test env)
process.env.JWT_SECRET = 'test-secret-for-unit-tests';

// We need the actual jwt to sign tokens for testing verifyToken
import * as jwt from 'jsonwebtoken';
const jwtSign = (jwt as any).default?.sign || jwt.sign;

describe('verifyToken', () => {
  const secret = 'test-secret-for-unit-tests';

  it('returns payload for a valid token', () => {
    const token = jwtSign({ userId: 'user-123', email: 'test@example.com' }, secret, { expiresIn: '7d' });
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('user-123');
    expect(result?.email).toBe('test@example.com');
  });

  it('returns null for an expired token', () => {
    const token = jwtSign({ userId: 'user-123', email: 'test@example.com' }, secret, { expiresIn: '-1s' });
    const result = verifyToken(token);
    expect(result).toBeNull();
  });

  it('returns null for a token signed with wrong secret', () => {
    const token = jwtSign({ userId: 'user-123', email: 'test@example.com' }, 'wrong-secret', { expiresIn: '7d' });
    const result = verifyToken(token);
    expect(result).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(verifyToken('not.a.token')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
  });

  it('returns null for a tampered token', () => {
    const token = jwtSign({ userId: 'user-123', email: 'test@example.com' }, secret, { expiresIn: '7d' });
    const [header, , sig] = token.split('.');
    // Replace payload with tampered data
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'admin', email: 'admin@example.com' })).toString('base64url');
    const tampered = `${header}.${tamperedPayload}.${sig}`;
    expect(verifyToken(tampered)).toBeNull();
  });
});
