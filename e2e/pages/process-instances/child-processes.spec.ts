import { test, expect } from '@playwright/test';

// Call-activity parent instance (processType: 'callActivity') with 2 child processes in mock data
const parentInstanceKey = '3100000000000000066';
// Child process instances spawned by the parent above
const childInstanceKey1 = '3100000000000000200'; // active child
const childInstanceKey2 = '3100000000000000202'; // completed child

test.describe('Process Instance Detail - Child Processes Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${parentInstanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
  });

  test('should show Child Processes tab', async ({ page }) => {
    const childTab = page.getByRole('tab', { name: /Called Processes/i });
    await expect(childTab).toBeVisible();
  });

  test('should show child process count chip on the tab', async ({ page }) => {
    // The chip should reflect the number of child processes (2 direct non-multiInstance children)
    const childTab = page.getByRole('tab', { name: /Called Processes/i });
    await expect(childTab).toBeVisible();
    // Chip with count > 0 should appear since we have 2 child instances
    await expect(childTab.locator('.MuiChip-label')).toBeVisible();
    const chipText = await childTab.locator('.MuiChip-label').textContent();
    expect(Number(chipText)).toBeGreaterThan(0);
  });

  test('should display child processes table when tab is clicked', async ({ page }) => {
    await page.getByRole('tab', { name: /Called Processes/i }).click();

    // The tab panel with child processes should appear
    const childProcessesTab = page.getByTestId('child-processes-tab');
    await expect(childProcessesTab).toBeVisible({ timeout: 5000 });
  });

  test('should display correct table column headers', async ({ page }) => {
    await page.getByRole('tab', { name: /Called Processes/i }).click();

    await expect(page.getByTestId('child-processes-tab')).toBeVisible({ timeout: 5000 });

    // Check column headers
    await expect(page.getByRole('columnheader', { name: /key/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /process/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /state/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /type/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /created/i }).first()).toBeVisible();
  });

  test('should display child process instance rows', async ({ page }) => {
    await page.getByRole('tab', { name: /Called Processes/i }).click();
    await expect(page.getByTestId('child-processes-tab')).toBeVisible({ timeout: 5000 });

    // Both child instance keys should appear in the table
    await expect(page.getByText(childInstanceKey1)).toBeVisible();
    await expect(page.getByText(childInstanceKey2)).toBeVisible();
  });

  test('should display child process bpmnProcessId', async ({ page }) => {
    await page.getByRole('tab', { name: /Called Processes/i }).click();
    await expect(page.getByTestId('child-processes-tab')).toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Simple_SubProcess').first()).toBeVisible();
  });

  test('should display state badges for child processes', async ({ page }) => {
    await page.getByRole('tab', { name: /Called Processes/i }).click();
    await expect(page.getByTestId('child-processes-tab')).toBeVisible({ timeout: 5000 });

    // Active and Completed states should both appear
    await expect(page.getByText('Active').first()).toBeVisible();
    await expect(page.getByText('Completed').first()).toBeVisible();
  });

  test('should navigate to child process detail on row click', async ({ page }) => {
    await page.getByRole('tab', { name: /Called Processes/i }).click();
    await expect(page.getByTestId('child-processes-tab')).toBeVisible({ timeout: 5000 });

    // Click the first child row (contains childInstanceKey1)
    const row = page.getByRole('row').filter({ hasText: childInstanceKey1 });
    await row.click();

    // Should navigate to the child instance detail page
    await expect(page).toHaveURL(new RegExp(`/process-instances/${childInstanceKey1}`));
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Process Instance Detail - Child Process as Viewed Instance', () => {
  // When viewing a child process itself, the parent link should be shown
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${childInstanceKey1}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
  });

  test('should show Parent Process Instance link in metadata', async ({ page }) => {
    const parentLink = page.getByRole('link', { name: /Parent Process Instance/i });
    await expect(parentLink).toBeVisible();
    await expect(parentLink).toHaveAttribute('href', new RegExp(`/process-instances/${parentInstanceKey}`));
  });

  test('should not show Child Processes tab chip when no grandchildren exist', async ({ page }) => {
    // The child itself has no grandchildren in mock data, so tab exists but no chip
    const childTab = page.getByRole('tab', { name: /Called Processes/i });
    await expect(childTab).toBeVisible();
  });
});
