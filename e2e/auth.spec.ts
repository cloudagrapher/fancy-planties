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

  test('sign in button is visible and clickable', async ({ page }) => {
    await page.goto('/auth/signin');
    const button = page.getByRole('button', { name: /sign in/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('forgot password and sign up links are present', async ({ page }) => {
    await page.goto('/auth/signin');
    const forgotLink = page.getByRole('link', { name: /forgot/i });
    const signUpLink = page.getByRole('link', { name: /sign up/i });
    await expect(forgotLink).toBeVisible();
    await expect(signUpLink).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Wait for either an alert role, error text, or any visible error indicator
    const error = page.locator('[role="alert"], .error, [class*="error"], [class*="Error"]');
    await expect(error.first()).toBeVisible({ timeout: 10000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/dashboard');
  });
});
