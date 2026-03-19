import { test, expect } from '@playwright/test';

const TIMESTAMP = Date.now();
const TEST_EMAIL = `test+${TIMESTAMP}@mailinator.com`;
const TEST_PASSWORD = 'TestPass123';
const TEST_NAME = 'E2E Tester';

test.describe('Registration', () => {
  test('shows registration page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /sign up|create account|get started|register/i })).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).first().fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page.getByText(/invalid|valid email/i)).toBeVisible();
  });

  test('shows validation error for weak password', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).first().fill('weak');
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    // Should show password requirements error
    await expect(page.getByText(/password|8 character/i)).toBeVisible();
  });

  test('shows error for duplicate email', async ({ page }) => {
    // Try to register with the known admin email (already exists)
    await page.goto('/register');
    await page.getByLabel(/name/i).fill('Duplicate User');
    await page.getByLabel(/email/i).fill('stevenkong1994@gmail.com');
    await page.getByLabel(/password/i).first().fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page.getByText(/already registered|already exists|in use/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Login', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome back/i })).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nobody@example.com');
    await page.getByLabel(/password/i).fill('WrongPass123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({ timeout: 10_000 });
  });

  test('shows error for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Either HTML5 validation or JS error message
    const emailInput = page.getByLabel(/email/i);
    const isRequired = await emailInput.evaluate(el => (el as HTMLInputElement).validity.valueMissing);
    if (!isRequired) {
      await expect(page.getByText(/required|email|password/i)).toBeVisible();
    }
  });

  test('has forgot password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible();
  });
});

test.describe('Forgot Password', () => {
  test('shows forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('shows success message after submitting email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    // Should show confirmation — not leak whether account exists
    await expect(page.getByText(/sent|check your email|if.*account/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Protected routes redirect unauthenticated users', () => {
  const protectedRoutes = [
    '/dashboard',
    '/pipeline',
    '/calendar',
    '/billing',
    '/settings',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/login|sign-in/, { timeout: 10_000 });
    });
  }
});
