import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/auth/signin');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', process.env.E2E_USER_EMAIL || 'stefan@bekker.cloud');
  await page.fill('input[name="password"]', process.env.E2E_USER_PASSWORD || 'mh$ydH&Q9aXFc@TWKt@P');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30000 });
}
