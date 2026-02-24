import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Plants', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/plants');
    await page.waitForLoadState('networkidle');
  });

  test('plants page loads with plant cards', async ({ page }) => {
    const cards = page.locator('[class*="card"], [class*="Card"], [class*="plant"], [class*="Plant"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('plant cards display plant names', async ({ page }) => {
    const cards = page.locator('[class*="card"] h3, [class*="Card"] h3, [class*="card"] h4, [class*="Card"] h4, [class*="plant"] h3, [class*="Plant"] h3');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const text = await cards.first().textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test('clicking a plant opens the detail modal', async ({ page }) => {
    const card = page.locator('[class*="card"], [class*="Card"], [class*="plant"], [class*="Plant"]').first();
    await card.click();
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"]');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });

  test('detail modal has tabs', async ({ page }) => {
    const card = page.locator('[class*="card"], [class*="Card"], [class*="plant"], [class*="Plant"]').first();
    await card.click();
    const tabs = page.locator('[role="tab"], [class*="tab"], button:has-text("Overview"), button:has-text("Care"), button:has-text("Photos")');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });

  test('modal can be closed with X button', async ({ page }) => {
    const card = page.locator('[class*="card"], [class*="Card"], [class*="plant"], [class*="Plant"]').first();
    await card.click();
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
    const closeButton = page.locator('button[aria-label*="close"], button[aria-label*="Close"], button:has-text("×"), button:has-text("✕"), [class*="close"], [class*="Close"]').first();
    await closeButton.click();
    await expect(modal.first()).not.toBeVisible({ timeout: 5000 });
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    const card = page.locator('[class*="card"], [class*="Card"], [class*="plant"], [class*="Plant"]').first();
    await card.click();
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(modal.first()).not.toBeVisible({ timeout: 5000 });
  });

  test('modal prevents background scroll', async ({ page }) => {
    const card = page.locator('[class*="card"], [class*="Card"], [class*="plant"], [class*="Plant"]').first();
    await card.click();
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(overflow).toBe('hidden');
  });
});
