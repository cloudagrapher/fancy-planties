import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('bottom nav is visible on dashboard', async ({ page }) => {
    const nav = page.locator('nav').last();
    await expect(nav).toBeVisible();
  });

  test('active tab is visually distinct', async ({ page }) => {
    const activeItem = page.locator('nav a[class*="active"], nav a[aria-current="page"], nav [class*="Active"]').first();
    await expect(activeItem).toBeVisible({ timeout: 5000 });
  });

  test('plants nav item navigates to /dashboard/plants', async ({ page }) => {
    await page.click('nav >> text=/plant/i');
    await expect(page).toHaveURL(/\/dashboard\/plants/);
  });

  test('care nav item navigates to /dashboard/care', async ({ page }) => {
    await page.click('nav >> text=/care/i');
    await expect(page).toHaveURL(/\/dashboard\/care/);
  });

  test('dashboard nav item navigates to /dashboard', async ({ page }) => {
    // First navigate away
    await page.goto('/dashboard/plants');
    await page.waitForLoadState('networkidle');
    const dashLink = page.locator('nav a[href="/dashboard"], nav a[href="/dashboard/"]').first();
    if (await dashLink.count() > 0) {
      await dashLink.click();
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test('props nav item navigates to /dashboard/propagations', async ({ page }) => {
    await page.click('nav >> text=/prop/i');
    await expect(page).toHaveURL(/\/dashboard\/propagations/);
  });

  test('more overflow menu opens and shows items', async ({ page }) => {
    const moreButton = page.locator('nav >> text=/more/i').first();
    if (await moreButton.isVisible()) {
      await moreButton.click();
      // Should show some menu items
      await page.waitForTimeout(500);
      const menuItems = page.locator('[role="menu"] a, [role="menuitem"], [class*="menu"] a, [class*="Menu"] a');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
