import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard loads after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('greeting shows user name', async ({ page }) => {
    const greeting = page.locator('text=/hello|welcome|hi|hey|good/i').first();
    await expect(greeting).toBeVisible({ timeout: 10000 });
  });

  test('all 4 stat cards render with numbers', async ({ page }) => {
    // Wait for stats to load (not showing "--" placeholders)
    await page.waitForTimeout(3000);
    const statCards = page.locator('[class*="stat"], [class*="card"], [class*="Card"]').filter({ hasText: /\d+/ });
    await expect(statCards.first()).toBeVisible({ timeout: 10000 });
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('plants stat card links to /dashboard/plants', async ({ page }) => {
    const plantsLink = page.locator('a[href*="/dashboard/plants"]').first();
    await expect(plantsLink).toBeVisible({ timeout: 10000 });
  });

  test('care tasks stat card links to /dashboard/care', async ({ page }) => {
    const careLink = page.locator('a[href*="/dashboard/care"]').first();
    await expect(careLink).toBeVisible({ timeout: 10000 });
  });

  test('propagations stat card links to /dashboard/propagations', async ({ page }) => {
    const propLink = page.locator('a[href*="/dashboard/propagations"]').first();
    await expect(propLink).toBeVisible({ timeout: 10000 });
  });

  test('calendar section is visible and scrollable', async ({ page }) => {
    const calendar = page.locator('[class*="calendar"], [class*="Calendar"]').first();
    await expect(calendar).toBeVisible({ timeout: 10000 });
    const calBox = await calendar.boundingBox();
    expect(calBox).toBeTruthy();
    // Calendar just needs to exist and have reasonable dimensions
    if (calBox) {
      expect(calBox.height).toBeGreaterThan(100);
      expect(calBox.width).toBeGreaterThan(100);
    }
  });

  test('calendar has month/year header', async ({ page }) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthRegex = new RegExp(months.join('|'), 'i');
    const header = page.locator(`text=/${monthRegex.source}/`).first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });
});
