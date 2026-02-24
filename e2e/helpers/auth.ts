import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/auth/signin');
  // Wait for the form to be ready instead of networkidle (which hangs on long-polling)
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.fill('input[name="email"]', process.env.E2E_USER_EMAIL || 'stefan@bekker.cloud');
  await page.fill('input[name="password"]', process.env.E2E_USER_PASSWORD || 'mh$ydH&Q9aXFc@TWKt@P');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30000 });
}
