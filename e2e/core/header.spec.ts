import { expect, test } from '@playwright/test';

test('hides global search while preserving its desktop header spacing', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder('Search...')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Design', exact: true })).toBeVisible();
  await expect(page.getByTestId('header-search-spacer')).toHaveCSS('width', '280px');

  await page.setViewportSize({ width: 899, height: 900 });
  await expect(page.getByTestId('header-search-spacer')).toBeHidden();

  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(page).toHaveURL(/\/designer$/);
});
