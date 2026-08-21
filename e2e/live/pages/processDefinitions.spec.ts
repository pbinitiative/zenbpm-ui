import { expect, test } from '@playwright/test';
import {
  expectAppShell,
  expectManagementActions,
  expectManagementPageHeader,
  expectPagination,
  expectTableHeaders,
} from '../supports/appAssertions.ts';

test('process definitions page shows controls, filters and table structure', async ({ page }) => {
  await page.goto('/processes/definitions?onlyLatest=true');

  await expect(page).toHaveURL(/\/processes\/definitions\?onlyLatest=true$/);
  await expectAppShell(page);
  await expectManagementPageHeader(page, 'Processes');
  await expectManagementActions(page, 'Processes');

  const table = page.getByTestId('process-definitions-table');
  await expect(table).toBeVisible();

  await expect(
    table.getByRole('switch', { name: 'Show only latest versions', exact: true }),
  ).toBeChecked();
  await expect(table.getByLabel('Search', { exact: true })).toHaveValue('');
  await expect(table.getByLabel('Search', { exact: true })).toHaveAttribute(
    'placeholder',
    'Filter processes...',
  );

  await expectTableHeaders(table, [
    'KEY',
    'NAME',
    'BPMN PROCESS ID',
    'VERSION',
    'ACTIVE',
    'FAILED',
    'WITH INCIDENT',
  ]);
  await expectPagination(table, 10);
});
