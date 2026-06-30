import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';
import { MULTI_INSTANCE_CHILD_A_KEY } from '../../../src/mocks/data/well-known-keys';

const { ACTIVE_INSTANCE_KEY, COMPLETED_INSTANCE_KEY } = instanceKeys;

/**
 * E2E coverage for the FlowElementHistory `variables` column on the
 * Process Instance History tab.
 *
 * The history table is now expected to render a `Variables` column (between
 * `Key` and `Element ID`) that shows JSON-stringified input + output variables
 * for each flow element, mirroring the Jobs tab. Clicking the cell opens the
 * `InputOutputDialog` with the inputs (blue) and outputs (green) split.
 *
 * Test fixtures used:
 *  - `COMPLETED_INSTANCE_KEY` (showcase-process, completed, high-value path) —
 *    every history element is completed and carries both input and output
 *    variables, giving us the richest possible assertions.
 *  - `ACTIVE_INSTANCE_KEY` (showcase-process, active, stopped at task-a) —
 *    task-a is still running, so it has input variables but no output
 *    variables. This verifies the "inputs only" case.
 */
test.describe('Process Instance History - Variables Column', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${COMPLETED_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });
    // Element ID column header confirms the table has finished rendering
    await expect(page.getByText('Element ID')).toBeVisible();
  });

  test('should show a Variables column header in the history table', async ({ page }) => {
    // The header text is the same label used in the jobs table ("Variables").
    await expect(
      page.getByTestId('history-table').getByRole('columnheader', { name: /variables/i })
    ).toBeVisible();
  });

  test('should render input variables JSON for each history row', async ({ page }) => {
    // The completed showcase instance runs: StartEvent_1 -> task-a -> Gateway_01wr5g0
    // -> task-b -> Gateway_1dkelqq -> Event_196zxhe. The mock data seeds the same
    // process variables (customerId, customerName, loanAmount, price, approved)
    // into every element's inputVariables. The variables cell renders them as
    // a single JSON string, so the customerId key (present in every row) must
    // appear in each row's variables cell.
    const historyTable = page.getByTestId('history-table');
    const variableCells = historyTable.locator('tbody tr td').filter({
      hasText: /CUST-003|customerId|loanAmount/,
    });

    // 6 completed elements × 1 variables cell each = 6 cells.
    await expect(variableCells.first()).toBeVisible();
    expect(await variableCells.count()).toBeGreaterThanOrEqual(6);
  });

  test('should show a hover tooltip on the variables cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const firstVariableCell = historyTable
      .locator('tbody tr td')
      .filter({ hasText: /customerId|loanAmount/ })
      .first();

    // Hovering should reveal the "View Inputs & Outputs" tooltip that the
    // history column shares with the jobs column.
    await firstVariableCell.hover();
    await expect(page.getByText(/view inputs.*outputs/i)).toBeVisible({ timeout: 3000 });
  });

  test('should open the InputOutputDialog when clicking a variables cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const variableCell = historyTable
      .locator('tbody tr td')
      .filter({ hasText: /customerId|loanAmount/ })
      .first();

    await variableCell.click();

    // The dialog is shared with the jobs tab and renders Inputs / Outputs panes
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText('Inputs', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Outputs', { exact: true })).toBeVisible();
  });

  test('should display a completed task output variables inside the dialog', async ({ page }) => {
    // For the completed showcase instance, task-a (Base approval) produces the
    // `baseApproved: true` output variable when it completes. This key is not
    // present in the process's input variables, so its presence in the dialog
    // proves that the output pane is being rendered with the right content.
    //
    // Note: end events don't produce their own output variables in the engine,
    // so we test against a real work-doing element (task-a) instead.
    const historyTable = page.getByTestId('history-table');
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    await expect(taskARow).toHaveCount(1);

    // Click the variables cell in the task-a row.
    const taskAVariablesCell = taskARow.locator('td').filter({
      hasText: /CUST-003|customerId|loanAmount/,
    });
    await taskAVariablesCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // The dialog renders inputs first, outputs second inside <pre> blocks.
    // `baseApproved` is only in the outputs, so we assert against the second
    // pre block to make sure we're not accidentally matching the inputs pane.
    const preBlocks = dialog.locator('pre');
    await expect(preBlocks).toHaveCount(2);
    // Pretty-printed JSON uses the form `"baseApproved": true` (with quotes
    // around the key and a colon-space before the value).
    await expect(preBlocks.nth(1)).toContainText('"baseApproved": true');
    // Sanity-check the inputs pane does NOT contain baseApproved.
    await expect(preBlocks.nth(0)).not.toContainText('baseApproved');
  });

  test('should close the dialog when dismissed', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const variableCell = historyTable
      .locator('tbody tr td')
      .filter({ hasText: /customerId|loanAmount/ })
      .first();
    await variableCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Press Escape to dismiss — same dialog component used by the jobs tab.
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Process Instance History - Variables Column (active instance)', () => {
  // For an instance still in flight (stopped at task-a), task-a has input
  // variables but no output variables yet. The variables cell should still
  // render the inputs and remain clickable.
  const instanceKey = ACTIVE_INSTANCE_KEY;

  test('should render input variables for the in-flight task', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    // task-a's input variables come from the active instance's process variables
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    await expect(taskARow).toHaveCount(1);

    const variablesCell = taskARow.locator('td').filter({
      hasText: /CUST-001|customerId|loanAmount/,
    });
    await expect(variablesCell).toBeVisible();
  });

  test('should open dialog with inputs but no outputs for the in-flight task', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    const variablesCell = taskARow.locator('td').filter({
      hasText: /CUST-001|customerId|loanAmount/,
    });
    await variablesCell.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    // Inputs pane should still render the input variables
    await expect(dialog).toContainText('customerId');
    // Outputs pane should show the "No outputs" placeholder
    await expect(dialog.getByText(/no outputs/i)).toBeVisible();
  });
});

test.describe('Process Instance History - Empty Variables Cell', () => {
  // When a flow element has neither input nor output variables, the Variables
  // cell must render a single `-` character and must NOT open the
  // InputOutputDialog on click. The multi-instance pagination fixture is
  // perfect for this: its history entries don't carry any variables, so
  // every row should fall into the empty branch.
  const instanceKey = MULTI_INSTANCE_CHILD_A_KEY;

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });
  });

  test('should render `-` in every Variables cell when no variables are present', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    // The Variables column is the 2nd cell in our column order
    // (Key, Variables, Element ID, State, Created At, Duration).
    const variablesCells = historyTable.locator('tbody tr td:nth-child(2)');
    await expect(variablesCells).toHaveCount(8);

    const texts = (await variablesCells.allInnerTexts()).map((t) => t.trim());
    expect(texts).toEqual(Array(8).fill('-'));
  });

  test('should NOT open the InputOutputDialog when clicking an empty Variables cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    // The first row is StartEvent_1, which has no variables in this fixture.
    const firstRow = historyTable.locator('tbody tr').first();
    const variablesCell = firstRow.locator('td:nth-child(2)');
    await expect(variablesCell).toHaveText('-');

    await variablesCell.click();

    // The dialog must stay closed. We give it a beat so any animation could
    // start, then assert it's still not in the DOM as a [role="dialog"].
    await page.waitForTimeout(300);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('should NOT show a hover tooltip on an empty Variables cell', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    const firstRow = historyTable.locator('tbody tr').first();
    const variablesCell = firstRow.locator('td:nth-child(2)');
    await expect(variablesCell).toHaveText('-');

    // Hovering an empty cell must not surface the "View Inputs & Outputs"
    // tooltip that the populated cells use.
    await variablesCell.hover();
    await page.waitForTimeout(300);
    await expect(page.getByText(/view inputs.*outputs/i)).toHaveCount(0);
  });
});
