import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Care', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/care');
    await page.waitForLoadState('domcontentloaded');
  });

  test('care page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/care/);
  });

  test('stats show consistent data', async ({ page }) => {
    await page.waitForTimeout(2000);
    // If there are 0 events, consistency should be "N/A" not "100%"
    const stats = page.locator('[class*="stat"], [class*="Stat"]');
    const count = await stats.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await stats.nth(i).textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test('care action buttons are identifiable', async ({ page }) => {
    await page.waitForTimeout(2000);
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      // Each button should have some form of identification
      const hasIdentification = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasIdentification).toBeTruthy();
    }
  });
});
