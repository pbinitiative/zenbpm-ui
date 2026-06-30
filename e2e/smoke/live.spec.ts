import { expect, test } from '@playwright/test';

test('frontend loads with a live backend', async ({ page, request }) => {
  const status = await request.get('/system/status');
  expect(status.ok()).toBeTruthy();

  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
