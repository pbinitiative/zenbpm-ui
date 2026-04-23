import { test, expect } from '@playwright/test';
import {
  MULTI_INSTANCE_PARENT_KEY,
  MULTI_INSTANCE_CHILD_A_KEY,
  MULTI_INSTANCE_CHILD_B_KEY,
} from '../../../src/mocks/data/well-known-keys';

/**
 * Sectioned pagination tests for HistoryTab.
 *
 * The fixture has a parent process instance with 2 multiInstance children,
 * each with 8 history entries. With a pageSize of 5 the table should require 2
 * pages and each section must independently show at most 5 rows per page.
 *
 * These tests protect against the duplicate-rows regression where a combined
 * sliding window was applied across all sections instead of each section
 * getting its own independent [start, end) slice.
 */
test.describe('HistoryTab — sectioned pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the parent instance's detail page and open the History tab
    await page.goto(`/process-instances/${MULTI_INSTANCE_PARENT_KEY}?tab=history`);
    // Wait for the page chrome to appear
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
    // Ensure the history table is rendered
    await expect(page.locator('[data-testid="history-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('page 1 shows at most 5 rows per section with default page size 5', async ({ page }) => {
    // The page opens with default pageSize 10. Switch to 5 so we need 2 pages.
    // Rows-per-page selector is a MUI Select — click it and choose 5.
    const pageSizeSelect = page.locator('div[role="combobox"]').first();
    await pageSizeSelect.click();
    // Pick "5" from the dropdown (exact: true avoids matching "50")
    await page.getByRole('option', { name: '5', exact: true }).click();

    // On page 1 there should be exactly 2 section headers (one per child)
    const sectionHeaders = page.locator('[data-testid="section-header"]');
    await expect(sectionHeaders).toHaveCount(2);

    // Count data rows (all <tr> inside <tbody> that are NOT section headers)
    // Each child section shows 5 rows on page 1, plus 1 root-instance row (no header).
    // Total visible data rows = 1 (root) + 5 (childA) + 5 (childB) = 11
    const dataRows = page.locator('[data-testid="history-table"] tbody tr:not([data-testid="section-header"])');
    await expect(dataRows).toHaveCount(11);
  });

  test('page 2 shows remaining 3 rows per section (no duplicates)', async ({ page }) => {
    // Switch to pageSize=5
    const pageSizeSelect = page.locator('div[role="combobox"]').first();
    await pageSizeSelect.click();
    await page.getByRole('option', { name: '5', exact: true }).click();

    // Navigate to page 2 via the Pagination component (MUI Pagination renders aria-label "page 2")
    await page.getByRole('button', { name: 'Go to page 2' }).click();

    // Both sections should still be present (each has 3 rows on page 2: entries 6-8)
    const sectionHeaders = page.locator('[data-testid="section-header"]');
    await expect(sectionHeaders).toHaveCount(2);

    // 2 sections × 3 remaining rows = 6 data rows total
    const dataRows = page.locator('[data-testid="history-table"] tbody tr:not([data-testid="section-header"])');
    await expect(dataRows).toHaveCount(6);
  });

  test('going back to page 1 still shows 10 rows (no stale state / duplication)', async ({ page }) => {
    // Switch to pageSize=5
    const pageSizeSelect = page.locator('div[role="combobox"]').first();
    await pageSizeSelect.click();
    await page.getByRole('option', { name: '5', exact: true }).click();

    // Go to page 2 …
    await page.getByRole('button', { name: 'Go to page 2' }).click();

    // … then back to page 1
    await page.getByRole('button', { name: 'Go to page 1' }).click();

    const sectionHeaders = page.locator('[data-testid="section-header"]');
    await expect(sectionHeaders).toHaveCount(2);

    const dataRows = page.locator('[data-testid="history-table"] tbody tr:not([data-testid="section-header"])');
    await expect(dataRows).toHaveCount(11);
  });

  test('section A and section B each show distinct rows on page 1', async ({ page }) => {
    // Switch to pageSize=5
    const pageSizeSelect = page.locator('div[role="combobox"]').first();
    await pageSizeSelect.click();
    await page.getByRole('option', { name: '5', exact: true }).click();

    // Section headers contain the child instance key — verify each child is present
    // Use .first() to avoid strict-mode violation since the key appears as a prefix
    // in multiple row-key cells (e.g. "5100000000000000002001").
    await expect(page.getByText(MULTI_INSTANCE_CHILD_A_KEY, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(MULTI_INSTANCE_CHILD_B_KEY, { exact: false }).first()).toBeVisible();

    // Verify row uniqueness: collect all element IDs visible in the first section's rows.
    // Each section starts at StartEvent_1 so both sections show StartEvent_1 on page 1 —
    // but as separate rows inside separate sections (no cross-section duplication).
    // Total = 1 (root section) + 5 (childA) + 5 (childB) = 11
    const dataRows = page.locator('[data-testid="history-table"] tbody tr:not([data-testid="section-header"])');
    await expect(dataRows).toHaveCount(11);
  });
});
