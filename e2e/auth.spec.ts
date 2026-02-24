import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Authentication', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('can fill email and password', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="password"]')).toHaveValue('testpassword');
  });

  test('sign in button is full-width', async ({ page }) => {
    await page.goto('/auth/signin');
    const button = page.locator('button[type="submit"]');
    const parent = button.locator('..');
    const buttonBox = await button.boundingBox();
    const parentBox = await parent.boundingBox();
    expect(buttonBox).toBeTruthy();
    expect(parentBox).toBeTruthy();
    // Button width should be at least 90% of parent width
    expect(buttonBox!.width).toBeGreaterThanOrEqual(parentBox!.width * 0.9);
  });

  test('forgot password and sign up links have adequate touch targets', async ({ page }) => {
    await page.goto('/auth/signin');
    const links = page.locator('a[href*="forgot"], a[href*="signup"], a[href*="register"], a[href*="sign-up"]');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    const error = page.locator('[role="alert"], .error, [class*="error"], [class*="Error"]');
    await expect(error.first()).toBeVisible({ timeout: 10000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/dashboard');
  });
});
