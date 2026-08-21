import { expect, test } from '@playwright/test';
import {
  expectAppShell,
  expectManagementActions,
  expectManagementPageHeader,
  expectPagination,
  expectTableHeaders,
} from '../supports/appAssertions.ts';

test('decision definitions page shows controls, filters and table structure', async ({ page }) => {
  await page.goto('/decisions/definitions?onlyLatest=true');

  await expect(page).toHaveURL(/\/decisions\/definitions\?onlyLatest=true$/);
  await expectAppShell(page);
  await expectManagementPageHeader(page, 'Decisions');
  await expectManagementActions(page, 'Decisions');

  const table = page.getByTestId('decision-definitions-table');
  await expect(table).toBeVisible();

  await expect(
    table.getByRole('switch', { name: 'Latest version only', exact: true }),
  ).toBeChecked();
  await expect(table.getByLabel('Search', { exact: true })).toHaveValue('');
  await expect(table.getByLabel('Search', { exact: true })).toHaveAttribute(
    'placeholder',
    'Search by name or ID...',
  );

  await expectTableHeaders(table, ['KEY', 'NAME', 'DMN RESOURCE ID', 'VERSION']);
  await expectPagination(table, 10);
});
