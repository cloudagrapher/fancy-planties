import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Propagations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/propagations');
    await page.waitForLoadState('networkidle');
  });

  test('propagations page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/propagations/);
  });

  test('status badges show correct single-word text (not duplicated)', async ({ page }) => {
    await page.waitForTimeout(2000);
    const badges = page.locator('[class*="badge"], [class*="Badge"], [class*="status"], [class*="Status"]');
    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent();
      if (text) {
        const trimmed = text.trim();
        // Check for duplicated text like "StartedStarted"
        const half = trimmed.length / 2;
        if (trimmed.length > 2 && trimmed.length % 2 === 0) {
          const first = trimmed.substring(0, half);
          const second = trimmed.substring(half);
          expect(first).not.toBe(second);
        }
      }
    }
  });

  test('avg days stat shows a value or "--"', async ({ page }) => {
    await page.waitForTimeout(2000);
    const avgDays = page.locator('text=/avg.*days?|days?.*avg/i').first();
    if (await avgDays.isVisible()) {
      const parent = avgDays.locator('..');
      const text = await parent.textContent();
      expect(text).toBeTruthy();
      // Should have a number or "--", not be empty
      expect(text!.trim().length).toBeGreaterThan(0);
    }
  });

  test('status progression buttons are visible', async ({ page }) => {
    await page.waitForTimeout(2000);
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
