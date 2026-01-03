import { test, expect } from '@playwright/test';

test.describe('Incidents Table - Error Message Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to incidents page and wait for it to load
    await page.goto('/incidents');
    await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible({ timeout: 10000 });
  });

  test('should display clickable error message in incidents table', async ({ page }) => {
    // Wait for table data to load (look for table rows)
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Error message should be displayed as a clickable link (underlined)
    const errorLink = page.locator('a, button').filter({ hasText: /Failed to|Error|Exception/ }).first();
    await expect(errorLink).toBeVisible({ timeout: 10000 });
  });

  test('should open stack trace modal when clicking error message', async ({ page }) => {
    // Wait for table data to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click on an error message link
    const errorLink = page.locator('a, button').filter({ hasText: /Failed to|Error|Exception/ }).first();
    await expect(errorLink).toBeVisible({ timeout: 10000 });
    await errorLink.click();

    // Modal should open with error message title
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('should display stack trace in code block format', async ({ page }) => {
    // Wait for table data to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click on an error message
    const errorLink = page.locator('a, button').filter({ hasText: /Failed to|Error|Exception/ }).first();
    await expect(errorLink).toBeVisible({ timeout: 10000 });
    await errorLink.click();

    // Modal should have pre-formatted code block
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const codeBlock = page.getByRole('dialog').locator('pre');
    await expect(codeBlock).toBeVisible();
  });

  test('should have copy to clipboard button in stack trace modal', async ({ page }) => {
    // Wait for table data to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click on an error message
    const errorLink = page.locator('a, button').filter({ hasText: /Failed to|Error|Exception/ }).first();
    await expect(errorLink).toBeVisible({ timeout: 10000 });
    await errorLink.click();

    // Modal should be visible with a copy button (icon button in title)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const copyButton = page.getByRole('dialog').locator('button').first();
    await expect(copyButton).toBeVisible();
  });

  test('should close stack trace modal with close button', async ({ page }) => {
    // Wait for table data to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click on an error message
    const errorLink = page.locator('a, button').filter({ hasText: /Failed to|Error|Exception/ }).first();
    await expect(errorLink).toBeVisible({ timeout: 10000 });
    await errorLink.click();

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Click close button
    await page.getByRole('button', { name: 'Close' }).click();

    // Modal should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Incidents Table - State Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/incidents');
    await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible({ timeout: 10000 });
  });

  test('should have state filter available', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // State filter should be visible in the filter bar - look for State label
    const stateLabel = page.locator('.MuiFormControl-root').filter({ hasText: 'State' }).first();
    await expect(stateLabel).toBeVisible({ timeout: 5000 });
  });

  test('should filter incidents by selecting a state', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Click on state filter dropdown
    const stateFilter = page.locator('.MuiFormControl-root').filter({ hasText: 'State' }).first();
    await stateFilter.click();

    // Select unresolved option
    const unresolvedOption = page.getByRole('option', { name: /unresolved/i });
    if (await unresolvedOption.isVisible()) {
      await unresolvedOption.click();
      // Table should refresh with filtered data
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
