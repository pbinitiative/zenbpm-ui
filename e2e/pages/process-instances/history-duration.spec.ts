import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';
import { MULTI_INSTANCE_CHILD_A_KEY } from '../../../src/mocks/data/well-known-keys';

const { ACTIVE_INSTANCE_KEY, COMPLETED_INSTANCE_KEY } = instanceKeys;

/**
 * E2E coverage for the FlowElementHistory `duration` column on the
 * Process Instance History tab.
 *
 * The history table is expected to render a `Duration` column (in place of the
 * previous `Completed At` column) that shows the elapsed time between an
 * element's `createdAt` and `completedAt` timestamps in a compact,
 * human-readable format like `1h 33m 15d 12ms` (largest non-zero unit first).
 *
 * Active (in-flight) elements that have not been completed yet have no
 * `completedAt` and must render a single `-` character in this column.
 *
 * Test fixtures used:
 *  - `COMPLETED_INSTANCE_KEY` (showcase-process, completed, high-value path) —
 *    every history element is completed and carries both `createdAt` and
 *    `completedAt`, giving us the richest possible assertions.
 *  - `ACTIVE_INSTANCE_KEY` (showcase-process, active, stopped at task-a) —
 *    the in-flight task-a has no `completedAt`, so we can verify the `-`
 *    fallback.
 *  - Multi-instance pagination fixture — used to verify that the duration
 *    column does NOT depend on a `createdAt`/`completedAt` of zero and that
 *    sub-hour durations render correctly.
 */
test.describe('Process Instance History - Duration Column', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${COMPLETED_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });
  });

  test('should expose a Duration column header (not Completed At)', async ({ page }) => {
    const historyTable = page.getByTestId('history-table');
    // The new header text is "Duration" (lives in processInstance:fields.duration)
    await expect(
      historyTable.getByRole('columnheader', { name: /^duration$/i })
    ).toBeVisible();
    // The old "Completed At" header must be gone — this protects against
    // accidental regression if someone re-adds the completedAt column.
    await expect(
      historyTable.getByRole('columnheader', { name: /completed at/i })
    ).toHaveCount(0);
  });

  test('should render a non-empty duration for every completed history row', async ({ page }) => {
    // The completed showcase instance has 6 elements (StartEvent_1, task-a,
    // Gateway_01wr5g0, task-b, Gateway_1dkelqq, Event_196zxhe). Every one of
    // them has both createdAt and completedAt populated, so every Duration
    // cell must be non-empty and not a dash.
    const historyTable = page.getByTestId('history-table');
    const rows = historyTable.locator('tbody tr');
    await expect(rows).toHaveCount(6);

    // Collect the Duration column text from every row and assert none of
    // them is the empty-state dash. The Duration column is the 6th cell in
    // our column order: Key, Variables, Element ID, State, Created At, Duration.
    const durationCells = historyTable.locator('tbody tr td:nth-child(6)');
    await expect(durationCells).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      const text = (await durationCells.nth(i).innerText()).trim();
      expect(text).not.toBe('');
      expect(text).not.toBe('-');
    }
  });

  test('should format the longest duration in the completed instance as `1h`', async ({ page }) => {
    // The mock data seeds task-b with a 60-minute span (started at +31min,
    // completed at +91min). That's the longest duration in the completed
    // showcase instance, and the formatter must surface it as "1h".
    //
    // The other 5 elements all complete within 29 minutes, so `1h` must
    // appear exactly once in the Duration column for this instance.
    const historyTable = page.getByTestId('history-table');
    const durationCells = historyTable.locator('tbody tr td:nth-child(6)');
    const texts = await durationCells.allInnerTexts();
    const normalized = texts.map((t) => t.trim());
    const oneHourCells = normalized.filter((t) => t === '1h');
    expect(oneHourCells).toHaveLength(1);
  });

  test('should use the compact `<unit><value> <unit><value>...` format', async ({ page }) => {
    // The formatter must use the documented unit suffixes: d, h, m, s, ms.
    // We assert that the Duration column never contains a colon, comma, slash,
    // or `am`/`pm` marker — those would indicate that the previous
    // completedAt formatter (Intl.DateTimeFormat) leaked in.
    const historyTable = page.getByTestId('history-table');
    const durationCells = historyTable.locator('tbody tr td:nth-child(6)');
    const texts = await durationCells.allInnerTexts();

    for (const text of texts) {
      const trimmed = text.trim();
      // Either "-" or matches the unit-suffix pattern (e.g. "1h", "29m",
      // "1h 30m 5s", "15d 1h 33m 12ms").
      const isEmpty = trimmed === '-';
      const isValid = isEmpty || /^(?:\d+(?:d|h|m|s|ms)\s*)+$/.test(trimmed);
      expect(isValid, `Unexpected duration cell content: "${trimmed}"`).toBe(true);
      // The old formatDate() output contained `:`, `,`, and `am`/`pm` markers.
      // The new duration format must not contain any of those characters.
      expect(trimmed).not.toMatch(/[:/]/);
      expect(trimmed.toLowerCase()).not.toMatch(/\b(am|pm)\b/);
    }
  });
});

test.describe('Process Instance History - Duration Column (active instance)', () => {
  // For an instance still in flight (stopped at task-a), task-a has no
  // `completedAt` and the Duration cell must render a single `-`.
  const instanceKey = ACTIVE_INSTANCE_KEY;

  test('should render `-` in the Duration cell for the in-flight task', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    const taskARow = historyTable.locator('tbody tr').filter({ hasText: 'task-a' });
    await expect(taskARow).toHaveCount(1);

    // 6th cell is the Duration column (Key, Variables, Element ID, State,
    // Created At, Duration).
    const durationCell = taskARow.locator('td:nth-child(6)');
    await expect(durationCell).toHaveText('-');
  });

  test('should still render a duration for the completed StartEvent in the active instance', async ({ page }) => {
    // Even in an active instance, the StartEvent has already completed.
    // The Duration cell for StartEvent_1 must therefore be a non-empty
    // duration (typically `1m` based on the mock's addMinutes offset).
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    const startRow = historyTable.locator('tbody tr').filter({ hasText: 'StartEvent_1' });
    await expect(startRow).toHaveCount(1);

    const durationCell = startRow.locator('td:nth-child(6)');
    const text = (await durationCell.innerText()).trim();
    expect(text).not.toBe('-');
    expect(text).not.toBe('');
  });
});

test.describe('Process Instance History - Duration Column (multi-instance fixture)', () => {
  // The multi-instance pagination fixture has 8 elements per child. Every
  // element completes after a 4-minute span (startedAt = base + 5*index,
  // completedAt = base + 5*index + 4). Every Duration cell must render `4m`.
  //
  // This fixture is also the regression net for the
  // `formatDuration(createdAt, completedAt)` call — it makes sure the
  // formatter doesn't accidentally use a different "start" timestamp.
  const instanceKey = MULTI_INSTANCE_CHILD_A_KEY;

  test('should render `4m` in every Duration cell of the child instance', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 });

    const historyTable = page.getByTestId('history-table');
    const durationCells = historyTable.locator('tbody tr td:nth-child(6)');
    await expect(durationCells).toHaveCount(8);

    const texts = (await durationCells.allInnerTexts()).map((t) => t.trim());
    expect(texts).toEqual([
      '4m',
      '4m',
      '4m',
      '4m',
      '4m',
      '4m',
      '4m',
      '4m',
    ]);
  });
});
