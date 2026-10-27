import { test, expect } from '@playwright/test';

/**
 * PocketFlow End-to-End User Journeys & Security Audit Test
 */
test.describe('PocketFlow Security & UX Workflows', () => {
  test('Protected routes redirect unauthenticated visitor to /login', async ({ page }) => {
    // Attempt to directly visit protected dashboard
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    // Attempt to visit transactions ledger
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login/);

    // Attempt to visit categories
    await page.goto('/categories');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Login page renders correctly with Vietnamese labels', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2, div')).toContainText(['Đăng nhập']);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Registration page renders with required validation inputs', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
