import { expect, test } from '@playwright/test';
import {
  expectAppShell,
  expectManagementActions,
  expectManagementPageHeader,
  expectPagination,
  expectTableHeaders,
} from '../supports/appAssertions.ts';

test('process instances page shows controls, empty filters and table structure', async ({ page }) => {
  await page.goto('/processes/instances');

  await expect(page).toHaveURL(/\/processes\/instances$/);
  await expectAppShell(page);
  await expectManagementPageHeader(page, 'Processes');
  await expectManagementActions(page, 'Processes');

  const table = page.getByTestId('process-instances-table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('button', { name: 'Filters', exact: true })).toBeEnabled();

  await expect(table.locator('label').filter({ hasText: /^State$/ })).toBeVisible();
  await expect(table.getByLabel('Select Process Definition', { exact: true })).toHaveValue('');

  await expectTableHeaders(table, [
    'KEY',
    'PROCESS',
    'STATE',
    'INCIDENTS',
    'TYPE',
    'CREATED AT',
    'BUSINESS KEY',
    'ACTIVITIES',
  ]);
  await expectPagination(table, 10);
});
