import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('homepage loads and shows key sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/monitus/i);
    // Hero CTA
    await expect(page.getByRole('link', { name: /start|sign up|free/i }).first()).toBeVisible();
  });

  test('homepage nav links work', async ({ page }) => {
    await page.goto('/');
    const navLinks = ['Pricing', 'About', 'Blog'];
    for (const link of navLinks) {
      await expect(page.getByRole('link', { name: link }).first()).toBeVisible();
    }
  });

  test('pricing page loads with tier cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/pricing|monitus/i);
    // Should show at least one plan name
    await expect(page.getByText(/starter|growth|intelligence/i).first()).toBeVisible();
  });

  test('pricing page shows prices in GBP', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/£/)).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('contact page loads with form', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('health endpoint returns ok status', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toMatch(/ok|degraded/);
  });

  test('/status returns 404 (not yet implemented)', async ({ page }) => {
    const response = await page.request.get('/status');
    // This should 404 — confirms it's not built yet
    expect(response.status()).toBe(404);
  });
});

test.describe('SEO and meta', () => {
  test('homepage has meta description', async ({ page }) => {
    await page.goto('/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(10);
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('monitus.ai');
  });

  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent');
  });
});

test.describe('Security headers', () => {
  test('homepage has X-Frame-Options or CSP frame-ancestors header', async ({ page }) => {
    const response = await page.goto('/');
    const xFrameOptions = response!.headers()['x-frame-options'];
    const csp = response!.headers()['content-security-policy'];
    // Should have at least one clickjacking protection
    expect(xFrameOptions || (csp && csp.includes('frame-ancestors'))).toBeTruthy();
  });

  test('homepage has X-Content-Type-Options header', async ({ page }) => {
    const response = await page.goto('/');
    expect(response!.headers()['x-content-type-options']).toBe('nosniff');
  });
});
