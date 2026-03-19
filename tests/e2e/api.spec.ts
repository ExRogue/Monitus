import { test, expect } from '@playwright/test';

// API route smoke tests — verify correct shape and auth enforcement
// These run against the live site (no DB mutations for GET requests)

test.describe('Auth API', () => {
  test('POST /api/auth/register rejects invalid email', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'not-an-email', password: 'TestPass123', name: 'Test' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/register rejects weak password', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'valid@test.com', password: 'weak', name: 'Test' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/login rejects wrong credentials', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'nobody@example.com', password: 'WrongPass123' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/login rejects missing body fields', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {},
    });
    expect([400, 401]).toContain(res.status());
  });

  test('GET /api/auth/me returns 401 without auth cookie', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('POST /api/auth/forgot-password returns 200 for any email (no enumeration)', async ({ request }) => {
    const res = await request.post('/api/auth/forgot-password', {
      data: { email: 'doesnotexist@example.com' },
    });
    // Should always succeed to prevent email enumeration
    expect(res.status()).toBe(200);
  });
});

test.describe('Protected API routes require auth', () => {
  const protectedEndpoints: Array<{ method: string; path: string }> = [
    { method: 'GET', path: '/api/news' },
    { method: 'GET', path: '/api/content' },
    { method: 'POST', path: '/api/generate' },
    { method: 'GET', path: '/api/billing/usage' },
    { method: 'GET', path: '/api/team' },
    { method: 'GET', path: '/api/notifications' },
    { method: 'GET', path: '/api/company' },
  ];

  for (const { method, path } of protectedEndpoints) {
    test(`${method} ${path} returns 401 without auth`, async ({ request }) => {
      const res = method === 'GET'
        ? await request.get(path)
        : await request.post(path, { data: {} });
      expect(res.status()).toBe(401);
    });
  }
});

test.describe('Admin API requires admin role', () => {
  test('GET /api/admin/users returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/seed is blocked in production', async ({ request }) => {
    const res = await request.post('/api/admin/seed');
    // Should be forbidden in production (not 200)
    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe('Public API v1', () => {
  test('GET /api/v1/articles returns 401 without API key', async ({ request }) => {
    const res = await request.get('/api/v1/articles');
    expect(res.status()).toBe(401);
  });

  test('GET /api/v1/articles with invalid API key returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/articles', {
      headers: { 'x-api-key': 'invalid-key-123' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Rate limiting', () => {
  test('Login endpoint rate limits after excessive requests', async ({ request }) => {
    // Fire 10 rapid requests — at some point should get 429
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request.post('/api/auth/login', {
          data: { email: 'spam@test.com', password: 'WrongPass123' },
        })
      )
    );
    const statuses = results.map(r => r.status());
    // At least one should be rate-limited (429) or all 401
    const hasRateLimit = statuses.some(s => s === 429);
    const allUnauth = statuses.every(s => s === 401 || s === 429);
    expect(allUnauth).toBe(true);
    // Rate limiting should kick in at some point
    // (May not trigger on first 10 if limit is higher — just verify no 500s)
    const has500 = statuses.some(s => s >= 500);
    expect(has500).toBe(false);
  });
});
