import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';

const { ACTIVE_INSTANCE_KEY } = instanceKeys;

// E2E coverage for the Jobs `Job input/output` column. Renders In/Out key
// counts; opens InputOutputDialog on click.
test.describe('Process Instance Jobs - Job Input/Output Column', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    // Make the default tab explicit so this spec is robust to a future change.
    await page.getByRole('tab', { name: /Jobs/i }).click();
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });
  });

  test('should show "Job input/output" column header', async ({ page }) => {
    await expect(
      page
        .getByTestId('jobs-table')
        .getByRole('columnheader', { name: /job input.*output/i })
    ).toBeVisible();
  });

  test('should render In/Out badges with key counts for each job row', async ({ page }) => {
    const jobsTable = page.getByTestId('jobs-table');
    const variableCells = jobsTable.locator('[data-testid="cell-variables"]');
    await expect(variableCells.first()).toBeVisible();

    const inBadges = jobsTable.locator('[data-testid="variables-in-badge"]');
    const outBadges = jobsTable.locator('[data-testid="variables-out-badge"]');
    expect(await inBadges.count()).toBeGreaterThanOrEqual(1);
    expect(await outBadges.count()).toBeGreaterThanOrEqual(1);

    // Active showcase instance has no `price` in its initial vars, so the
    // task-a input mapping (customerId, customerName, loanAmount, price)
    // resolves to 3 keys. The fixture's inputVariables also has 3 keys
    // (no ZEN_FORM), so the badge shows In 3.
    const taskARow = jobsTable.locator('tbody tr').filter({ hasText: 'task-a' });
    await expect(taskARow).toHaveCount(1);
    await expect(taskARow.locator('[data-testid="variables-in-badge"]')).toHaveText('In 3');
    await expect(taskARow.locator('[data-testid="variables-out-badge"]')).toHaveText('Out 0');
  });

  test('should show a "View Inputs & Outputs" tooltip on hover', async ({ page }) => {
    const jobsTable = page.getByTestId('jobs-table');
    const firstVariableCell = jobsTable
      .locator('[data-testid="cell-variables"] [role="button"]')
      .first();

    await firstVariableCell.hover();
    await expect(page.getByText(/view inputs.*outputs/i)).toBeVisible({ timeout: 3000 });
  });

  test('should open the InputOutputDialog when clicking a variables cell', async ({ page }) => {
    const jobsTable = page.getByTestId('jobs-table');
    const variableCell = jobsTable.locator('[data-testid="cell-variables"] [role="button"]').first();

    await variableCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText('Inputs', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Outputs', { exact: true })).toBeVisible();
  });

  test('should close the dialog when dismissed with Escape', async ({ page }) => {
    const jobsTable = page.getByTestId('jobs-table');
    const variableCell = jobsTable.locator('[data-testid="cell-variables"] [role="button"]').first();
    await variableCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
