import { test, expect } from '@playwright/test';

test.describe('404 Page', () => {
  test('navigating to /nonexistent shows custom 404 page', async ({ page }) => {
    await page.goto('/nonexistent');
    await expect(page.locator('text=/not found|404/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('404 page has link to dashboard', async ({ page }) => {
    await page.goto('/nonexistent');
    const link = page.locator('a[href*="dashboard"], a:has-text("Dashboard"), a:has-text("Home"), a:has-text("Go")').first();
    await expect(link).toBeVisible({ timeout: 10000 });
  });

  test('404 page uses app branding (not plain white)', async ({ page }) => {
    await page.goto('/nonexistent');
    await page.waitForTimeout(1000);
    // Check that the page has some color/gradient (not plain white background)
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        bg: computed.backgroundColor,
        bgImage: computed.backgroundImage,
      };
    });
    // Either has a non-white background or a gradient
    const isPlainWhite = bgColor.bg === 'rgb(255, 255, 255)' && bgColor.bgImage === 'none';
    // Check deeper - maybe a wrapper div has the styling
    const hasGreenElement = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.backgroundImage.includes('gradient') || style.backgroundColor.includes('rgb(34') || style.backgroundColor.includes('rgb(22')) {
          return true;
        }
      }
      return false;
    });
    // At least one of: non-white body or green/gradient element
    expect(isPlainWhite && !hasGreenElement).toBe(false);
  });
});
