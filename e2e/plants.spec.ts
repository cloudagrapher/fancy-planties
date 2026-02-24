import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Plants', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/plants');
    await page.waitForLoadState('networkidle');
  });

  test('plants page loads with plant cards', async ({ page }) => {
    const cards = page.locator('[aria-label^="Plant card for"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test('plant cards display plant names', async ({ page }) => {
    const cards = page.locator('[aria-label^="Plant card for"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const name = cards.first().locator('h3');
    await expect(name).toBeVisible();
    const text = await name.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test('clicking a plant card opens the detail modal', async ({ page }) => {
    const card = page.locator('[aria-label^="Plant card for"]').first();
    await card.click();
    // Modal uses .modal-overlay > .modal-content (role="dialog" may or may not be present)
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal.first()).toBeVisible({ timeout: 10000 });
  });

  test('detail modal has tabs', async ({ page }) => {
    const card = page.locator('[aria-label^="Plant card for"]').first();
    await card.click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const tabs = modal.locator('button:has-text("Overview"), button:has-text("Care History"), button:has-text("Notes"), button:has-text("Lineage")');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });

  test('modal can be closed with X button', async ({ page }) => {
    const card = page.locator('[aria-label^="Plant card for"]').first();
    await card.click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const closeButton = page.locator('button[aria-label="Close modal"], button.modal-close').first();
    await closeButton.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('modal can be closed with Escape key', async ({ page }) => {
    const card = page.locator('[aria-label^="Plant card for"]').first();
    await card.click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('modal prevents background scroll', async ({ page }) => {
    const card = page.locator('[aria-label^="Plant card for"]').first();
    await card.click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const overflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(overflow).toBe('hidden');
  });
});
