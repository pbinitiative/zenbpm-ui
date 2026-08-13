import { expect, test } from '@playwright/test';

test('frontend loads with a live backend', async ({ page, request }) => {
  const status = await request.get('/system/status');
  expect(status.ok()).toBeTruthy();
  expect(status.headers()['content-type']).toContain('application/json');
  await expect(status.json()).resolves.toMatchObject({
    git: { commitId: expect.any(String) },
    build: { version: expect.any(String) },
  });

  await page.goto('/');
  await expect(page.getByTestId('build-metadata-footer')).toBeVisible();
});
