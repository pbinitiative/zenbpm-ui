import { test, expect } from '@playwright/test';

test.describe('Decisions Page - Definitions Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to decisions page
    await page.goto('/decisions');
    // Should redirect to definitions tab
    await expect(page).toHaveURL(/\/decisions\/definitions/);
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
  });

  test('should display decisions page with tabs', async ({ page }) => {
    // Check that tab buttons are visible (SubTabs uses buttons, not role=tab)
    await expect(page.getByRole('button', { name: 'Definitions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Instances' })).toBeVisible();
  });

  test('should display decision definitions table', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Key' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'DMN Resource ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Version' })).toBeVisible();
  });

  test('should display decision definitions data', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Should have table rows with data
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have refresh button', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    const refreshButton = page.getByTestId('refresh-button');
    await expect(refreshButton).toBeVisible();
  });

  test('should have upload button', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    const uploadButton = page.getByTestId('upload-button');
    await expect(uploadButton).toBeVisible();
  });
});

test.describe('Decisions Page - Instances Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to instances tab
    await page.goto('/decisions/instances');
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
  });

  test('should display decision instances table', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Key' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Decision ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Evaluated At' })).toBeVisible();
  });

  test('should display decision instances data', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Should have data rows (not just partition headers)
    const dataRows = page.locator('[data-testid="data-row"]');
    await expect(dataRows.first()).toBeVisible({ timeout: 10000 });
    const count = await dataRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have refresh button', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    const refreshButton = page.getByTestId('refresh-button');
    await expect(refreshButton).toBeVisible();
  });
});

test.describe('Decisions Page - Tab Navigation', () => {
  test('should switch between tabs', async ({ page }) => {
    // Start at definitions tab
    await page.goto('/decisions/definitions');
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click instances tab
    await page.getByRole('button', { name: 'Instances' }).click();
    await expect(page).toHaveURL(/\/decisions\/instances/);
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click back to definitions tab
    await page.getByRole('button', { name: 'Definitions' }).click();
    await expect(page).toHaveURL(/\/decisions\/definitions/);
  });
});

test.describe('Decisions Page - Home Page Navigation', () => {
  test('should navigate to decisions from home page', async ({ page }) => {
    await page.goto('/');
    // Wait for page to load - look for any card on the page
    const decisionsCard = page.getByTestId('quick-access-card-decisions');
    await expect(decisionsCard).toBeVisible({ timeout: 10000 });
    await decisionsCard.click();

    // Should navigate to decisions page
    await expect(page).toHaveURL(/\/decisions\/definitions/);
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible();
  });
});

test.describe('Decision Definition Detail Page', () => {
  test('should navigate to definition detail when clicking a row', async ({ page }) => {
    await page.goto('/decisions/definitions');
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Wait for rows to load
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await page.waitForTimeout(500);

    // Get the key from the first cell to construct expected URL
    const keyCell = firstRow.locator('td').first();
    const key = await keyCell.textContent();

    // Click on the row to navigate to detail page
    await firstRow.click({ force: true });

    // Wait for navigation
    await page.waitForTimeout(1000);

    // Should navigate to detail page
    await expect(page).toHaveURL(new RegExp(`/decision-definitions/${key}`));
  });

  test('should display definition metadata', async ({ page }) => {
    await page.goto('/decision-definitions/4000000000000000001');

    // Wait for page to load
    await expect(page.getByText('Metadata')).toBeVisible({ timeout: 10000 });

    // Check metadata fields are visible using more specific selector
    await expect(page.getByText('DMN Resource ID')).toBeVisible();
    // Use getByRole to be more specific about the metadata Key label
    await expect(page.locator('span').filter({ hasText: /^Key$/ })).toBeVisible();
  });

  test('should display DMN diagram placeholder', async ({ page }) => {
    await page.goto('/decision-definitions/4000000000000000001');

    // Check diagram section - use heading to be specific
    await expect(page.getByRole('heading', { name: 'DMN Diagram' })).toBeVisible({ timeout: 10000 });
  });

  test('should display decision instances table', async ({ page }) => {
    await page.goto('/decision-definitions/4000000000000000001');

    // Wait for instances table section
    await expect(page.getByRole('heading', { name: 'Decision Instances' })).toBeVisible({ timeout: 10000 });

    // Check table is visible
    await expect(page.locator('table')).toBeVisible();
  });

  test('should show version selector when multiple versions exist', async ({ page }) => {
    await page.goto('/decision-definitions/4000000000000000001');
    await expect(page.getByText('Metadata')).toBeVisible({ timeout: 10000 });

    // Version field should be visible
    await expect(page.getByText('Version')).toBeVisible();
  });
});

test.describe('Decision Instance Detail Page', () => {
  test('should navigate to instance detail when clicking a row', async ({ page }) => {
    await page.goto('/decisions/instances');
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Wait for data rows to load (skip partition headers)
    const firstDataRow = page.locator('[data-testid="data-row"]').first();
    await expect(firstDataRow).toBeVisible();
    await page.waitForTimeout(500);

    // Get the key from the first cell to construct expected URL
    const keyCell = firstDataRow.locator('td').first();
    const key = await keyCell.textContent();

    // Click on the row to navigate to detail page
    await firstDataRow.click({ force: true });

    // Wait for navigation
    await page.waitForTimeout(1000);

    // Should navigate to detail page
    await expect(page).toHaveURL(new RegExp(`/decision-instances/${key}`));
  });

  test('should display instance metadata panel', async ({ page }) => {
    await page.goto('/decision-instances/4100000000000000001');

    // Wait for page to load - check for the Metadata heading (same layout as other detail pages)
    await expect(page.getByRole('heading', { name: 'Metadata' })).toBeVisible({ timeout: 10000 });
  });

  test('should display DMN diagram section', async ({ page }) => {
    await page.goto('/decision-instances/4100000000000000001');

    // Wait for diagram section
    await expect(page.getByRole('heading', { name: 'Diagram' })).toBeVisible({ timeout: 10000 });
  });

  test('should display output in metadata', async ({ page }) => {
    await page.goto('/decision-instances/4100000000000000001');
    await expect(page.getByRole('heading', { name: 'Metadata' })).toBeVisible({ timeout: 10000 });

    // Should show output value in metadata panel (the green code block with the JSON output)
    await expect(page.locator('code').filter({ hasText: 'sport' })).toBeVisible();
  });

  test('should display decision definition chip', async ({ page }) => {
    await page.goto('/decision-instances/4100000000000000001');
    await expect(page.getByRole('heading', { name: 'Metadata' })).toBeVisible({ timeout: 10000 });

    // Should show the DMN resource definition ID as a chip
    const chips = page.locator('.MuiChip-root');
    await expect(chips.first()).toBeVisible();
  });
});
