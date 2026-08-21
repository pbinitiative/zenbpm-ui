import { expect, test } from '@playwright/test';
import {
  expectAppShell,
  expectManagementActions,
  expectManagementPageHeader,
  expectPagination,
  expectTableHeaders,
} from '../supports/appAssertions.ts';

test('decision instances page shows controls, an empty filter and table structure', async ({ page }) => {
  await page.goto('/decisions/instances');

  await expect(page).toHaveURL(/\/decisions\/instances$/);
  await expectAppShell(page);
  await expectManagementPageHeader(page, 'Decisions');
  await expectManagementActions(page, 'Decisions');

  const table = page.getByTestId('decision-instances-table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('button', { name: 'Filters', exact: true })).toBeEnabled();
  await expect(table.getByLabel('Decision Definition', { exact: true })).toHaveValue('');

  await expectTableHeaders(table, [
    'KEY',
    'DECISION ID',
    'EVALUATED AT',
    'INPUTS',
    'OUTPUTS',
  ]);
  await expectPagination(table, 5);
});
