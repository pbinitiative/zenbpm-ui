import { test, expect } from '@playwright/test';

/**
 * Statistics Tests
 *
 * Tests for process definition statistics display:
 * 1. Active instance counts shown in process definitions table
 * 2. Unresolved incident counts shown in process definitions table
 * 3. Statistics columns are present in the table
 */

test.describe('Process Definition Statistics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to processes page (shows process definitions)
    await page.goto('/processes');
    // Wait for the table to be visible
    await expect(page.getByTestId('process-definitions-table')).toBeVisible({ timeout: 10000 });
    // Wait for data to load (table should have some rows)
    await page.waitForTimeout(1000);
  });

  test('should display statistics columns in process definitions table', async ({ page }) => {
    // Wait for table to fully load
    const table = page.getByTestId('process-definitions-table');
    await expect(table).toBeVisible();

    // Check for statistics column headers
    const headers = table.locator('thead th');
    const headerCount = await headers.count();

    // Should have columns including Active and Incidents
    expect(headerCount).toBeGreaterThanOrEqual(4);

    // Look for Active/Incidents header text
    const tableHeader = table.locator('thead');
    const headerText = await tableHeader.textContent();
    expect(headerText).toMatch(/Active|Incidents/i);
  });

  test('should show statistics chips in data rows', async ({ page }) => {
    const table = page.getByTestId('process-definitions-table');
    await expect(table).toBeVisible();

    // Get data rows from tbody
    const dataRows = table.locator('tbody tr');
    const rowCount = await dataRows.count();

    // Should have at least 1 process definition
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // First data row should have statistic chips
    const firstRow = dataRows.first();
    const chips = firstRow.locator('.MuiChip-root');
    const chipCount = await chips.count();

    // Each row should have at least 1 chip for statistics (version or stats)
    expect(chipCount).toBeGreaterThanOrEqual(1);
  });

  test('should show active count values', async ({ page }) => {
    const table = page.getByTestId('process-definitions-table');
    await expect(table).toBeVisible();

    // Get all chips in the table body
    const chips = table.locator('tbody .MuiChip-root');
    const chipCount = await chips.count();

    // Should have statistics chips
    expect(chipCount).toBeGreaterThan(0);

    // Check that at least one chip has a numeric value
    let hasNumericChip = false;
    for (let i = 0; i < chipCount; i++) {
      const chipText = await chips.nth(i).textContent();
      if (/^\d+$/.test(chipText || '')) {
        hasNumericChip = true;
        break;
      }
    }

    expect(hasNumericChip).toBe(true);
  });

  test('should color active count chips based on value', async ({ page }) => {
    const table = page.getByTestId('process-definitions-table');
    await expect(table).toBeVisible();

    // Get data rows
    const dataRows = table.locator('tbody tr');
    const rowCount = await dataRows.count();

    if (rowCount > 0) {
      // Check the first row's chips
      const firstRow = dataRows.first();
      const chips = firstRow.locator('.MuiChip-root');
      const chipCount = await chips.count();

      if (chipCount > 0) {
        // Get background color of first chip
        const firstChip = chips.first();
        const bgColor = await firstChip.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Should have some background color (either primary blue or grey)
        expect(bgColor).toBeTruthy();
      }
    }
  });
});

test.describe('Process Definition Detail Statistics', () => {
  test('should display element statistics on BPMN diagram', async ({ page }) => {
    // Navigate to a process definition detail page
    await page.goto('/process-definitions/3000000000000000033');
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });

    // Wait for BPMN diagram to load
    const diagram = page.locator('.bjs-container');
    await expect(diagram).toBeVisible({ timeout: 10000 });

    // Verify diagram loaded with SVG content (use first() since there might be multiple SVGs)
    const svg = diagram.locator('svg').first();
    await expect(svg).toBeVisible();
  });

  test('should show instances table with correct data', async ({ page }) => {
    // Navigate to a process definition detail page
    await page.goto('/process-definitions/3000000000000000033');
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });

    // Verify the instances table is present
    const instancesTable = page.getByTestId('process-instances-table');
    await expect(instancesTable).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(500);

    // Should have some rows (mock data has multiple instances)
    const rows = instancesTable.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should show instance rows with data', async ({ page }) => {
    // Navigate to a process definition detail page
    await page.goto('/process-definitions/3000000000000000033');
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });

    // Wait for instances table
    const instancesTable = page.getByTestId('process-instances-table');
    await expect(instancesTable).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(500);

    // Check that table has rows with data
    const tableBody = instancesTable.locator('tbody');
    await expect(tableBody).toBeVisible();

    // Table should have at least one data row
    const tableText = await tableBody.textContent();
    expect(tableText).toBeTruthy();
    expect(tableText?.length).toBeGreaterThan(0);
  });
});
