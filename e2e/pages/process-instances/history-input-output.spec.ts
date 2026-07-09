import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';
import { MULTI_INSTANCE_CHILD_A_KEY } from '../../../src/mocks/data/well-known-keys';

const { ACTIVE_INSTANCE_KEY, COMPLETED_INSTANCE_KEY } = instanceKeys;

// E2E coverage for the History `Activity input/output` column. Renders
// In/Out key counts; opens InputOutputDialog on click.
test.describe('Process Instance History - Activity Input/Output Column', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${COMPLETED_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Element ID')).toBeVisible();
  });

  test('should show "Activity input/output" column header', async ({ page }) => {
    await expect(
      page
        .getByTestId('history-table')
        .getByRole('columnheader', { name: /activity input.*output/i })
    ).toBeVisible();
  });

  test('should render In/Out badges with key counts for every history row', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const variableCells = historyTable.locator('[data-testid="cell-variables"]');
    // 6 completed elements (StartEvent, task-a, Gateway, task-b, JoinGateway, EndEvent).
    await expect(variableCells).toHaveCount(6);

    const inBadges = historyTable.locator('[data-testid="variables-in-badge"]');
    const outBadges = historyTable.locator('[data-testid="variables-out-badge"]');
    expect(await inBadges.count()).toBe(6);
    expect(await outBadges.count()).toBe(6);

    // Per-element input mappings (see showcase-process.ts INPUT_MAPPING).
    const expectedInCounts: Record<string, number> = {
      StartEvent_1: 5,
      'task-a': 4,
      Gateway_01wr5g0: 1,
      'task-b': 6,
      Gateway_1dkelqq: 7,
      Event_196zxhe: 1,
    };
    const rows = historyTable.locator('tbody tr');
    for (const [elementId, expectedIn] of Object.entries(expectedInCounts)) {
      const row = rows.filter({ hasText: elementId });
      await expect(row).toHaveCount(1);
      await expect(row.locator('[data-testid="variables-in-badge"]')).toHaveText(`In ${expectedIn}`);
    }

    const expectedOutCounts: Record<string, number> = {
      StartEvent_1: 0,
      'task-a': 6,
      Gateway_01wr5g0: 7,
      'task-b': 7,
      Gateway_1dkelqq: 0,
      Event_196zxhe: 0,
    };
    for (const [elementId, expectedOut] of Object.entries(expectedOutCounts)) {
      const row = rows.filter({ hasText: elementId });
      await expect(row.locator('[data-testid="variables-out-badge"]')).toHaveText(`Out ${expectedOut}`);
    }
  });

  test('should show a "View Inputs & Outputs" tooltip on hover', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    // Tooltip's interactive child is the badge cell itself.
    const firstVariableCell = historyTable
      .locator('[data-testid="cell-variables"] [role="button"]')
      .first();

    await firstVariableCell.hover();
    await expect(page.getByText(/view inputs.*outputs/i)).toBeVisible({ timeout: 3000 });
  });

  test('should open the InputOutputDialog when clicking a variables cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const variableCell = historyTable.locator('[data-testid="cell-variables"] [role="button"]').first();

    await variableCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText('Inputs', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Outputs', { exact: true })).toBeVisible();
  });

  test('should display the completed task output variables inside the dialog', async ({ page }) => {
    // task-a produces `baseApproved: true` on completion — not in inputs.
    const historyTable = page.getByTestId('history-table');
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    await expect(taskARow).toHaveCount(1);

    const taskAVariablesCell = taskARow.locator('[data-testid="cell-variables"] [role="button"]');
    await taskAVariablesCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Pretty-printed JSON form: "baseApproved": true (with quotes around the key).
    const preBlocks = dialog.locator('pre');
    await expect(preBlocks).toHaveCount(2);
    await expect(preBlocks.nth(1)).toContainText('"baseApproved": true');
    await expect(preBlocks.nth(0)).not.toContainText('baseApproved');
  });

  test('should close the dialog when dismissed', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const variableCell = historyTable.locator('[data-testid="cell-variables"] [role="button"]').first();
    await variableCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Process Instance History - Activity Input/Output (active instance)', () => {
  // In-flight task-a: inputs present, outputs empty.
  const instanceKey = ACTIVE_INSTANCE_KEY;

  test('should render In N and Out 0 badges for the in-flight task', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    await expect(taskARow).toHaveCount(1);

    const inBadge = taskARow.locator('[data-testid="variables-in-badge"]');
    const outBadge = taskARow.locator('[data-testid="variables-out-badge"]');
    await expect(inBadge).toBeVisible();
    // Active fixture has no `price` → task-a mapping resolves to 3 keys.
    await expect(inBadge).toHaveText('In 3');
    await expect(outBadge).toBeVisible();
    await expect(outBadge).toHaveText('Out 0');
  });

  test('should open dialog with inputs but no outputs for the in-flight task', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    const variableCell = taskARow.locator('[data-testid="cell-variables"] [role="button"]');

    await variableCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toContainText('customerId');
    await expect(dialog.getByText(/no outputs/i)).toBeVisible();
  });
});

test.describe('Process Instance History - Empty Activity Input/Output Cell', () => {
  // Multi-instance child has history entries with no variables at all.
  const instanceKey = MULTI_INSTANCE_CHILD_A_KEY;

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });
  });

  test('should render `-` in every cell when no variables are present', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const emptyCells = historyTable.locator('[data-testid="cell-variables"] [data-testid="variables-empty"]');
    await expect(emptyCells).toHaveCount(8);

    await expect(historyTable.locator('[data-testid="variables-in-badge"]')).toHaveCount(0);
    await expect(historyTable.locator('[data-testid="variables-out-badge"]')).toHaveCount(0);
  });

  test('should NOT open the InputOutputDialog when clicking an empty cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const firstRow = historyTable.locator('tbody tr').first();
    const variablesCell = firstRow.locator('[data-testid="cell-variables"] [data-testid="variables-empty"]');
    await expect(variablesCell).toHaveText('-');

    // Click the whole td — no clickable element is rendered when the cell is empty.
    const td = firstRow.locator('[data-testid="cell-variables"]');
    await td.click();

    await page.waitForTimeout(300);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('should NOT show a hover tooltip on an empty cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const firstRow = historyTable.locator('tbody tr').first();
    const variablesCell = firstRow.locator('[data-testid="cell-variables"]');
    await expect(variablesCell).toHaveText('-');

    await variablesCell.hover();
    await page.waitForTimeout(300);
    await expect(page.getByText(/view inputs.*outputs/i)).toHaveCount(0);
  });
});
