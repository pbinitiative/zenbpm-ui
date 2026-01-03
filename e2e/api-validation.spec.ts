import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * API Validation Tests
 *
 * These tests verify that all API responses match the OpenAPI schema.
 * They navigate to each page and check for validation errors in the console.
 *
 * Validation is performed by the OpenAPI validator which logs warnings
 * to the console when responses don't match the schema.
 */

// Helper to collect validation errors from console
function createValidationErrorCollector(page: import('@playwright/test').Page) {
  const errors: string[] = [];

  const handler = (msg: ConsoleMessage) => {
    const text = msg.text();
    // Capture MSW Validator errors (now logged via console.error)
    if (text.includes('[MSW Validator]') && text.includes('Invalid')) {
      errors.push(text);
    }
  };

  page.on('console', handler);
  page.on('pageerror', (err) => {
    if (err.message.includes('[MSW Validator]')) {
      errors.push(err.message);
    }
  });

  return {
    errors,
    cleanup: () => page.off('console', handler),
  };
}

// Wait for network to be idle (all API calls completed)
async function waitForApiCalls(page: import('@playwright/test').Page) {
  // Wait for network idle
  await page.waitForLoadState('networkidle');
  // Additional wait to ensure all responses are processed
  await page.waitForTimeout(500);
}

test.describe('API Response Validation', () => {

  test('Home page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/');
    await waitForApiCalls(page);

    // Wait for content to load
    await expect(page.getByText('Process Definitions')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Processes page (definitions tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/processes');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Processes' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Processes page (instances tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/processes/instances');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Processes' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Definition Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use showcase-process which has rich data
    await page.goto('/process-definitions/3000000000000000033');
    await waitForApiCalls(page);

    // Wait for page content
    await expect(page.getByText('Definition Details')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use an instance from showcase-process
    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Wait for page content
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - Variables tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click Variables tab
    await page.getByRole('tab', { name: 'Variables' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - Jobs tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click Jobs tab
    await page.getByRole('tab', { name: 'Jobs' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - Incidents tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click Incidents tab
    await page.getByRole('tab', { name: 'Incidents' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance Detail - History tab - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/process-instances/3100000000000000164');
    await waitForApiCalls(page);

    // Click History tab
    await page.getByRole('tab', { name: 'History' }).click();
    await waitForApiCalls(page);

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decisions page (definitions tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/decisions');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decisions page (instances tab) - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/decisions/instances');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decision Definition Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a decision definition key
    await page.goto('/decision-definitions/3000000000000000001');
    await waitForApiCalls(page);

    // Wait for page content (look for DMN diagram or definition info)
    await page.waitForTimeout(2000); // Give time for API calls

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decision Instance Detail page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a decision instance key
    await page.goto('/decision-instances/4000000000000000001');
    await waitForApiCalls(page);

    // Wait for page content
    await page.waitForTimeout(2000); // Give time for API calls

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Incidents page - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    await page.goto('/incidents');
    await waitForApiCalls(page);

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('API Validation - Edge Cases', () => {

  test('Process with incidents - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a process that has incidents (simple-intermediate-message-catch-event-broken)
    await page.goto('/process-definitions/3000000000000000040');
    await waitForApiCalls(page);

    await expect(page.getByText('Definition Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Completed process instance - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a completed instance
    await page.goto('/process-instances/3100000000000000166');
    await waitForApiCalls(page);

    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Failed process instance - no validation errors', async ({ page }) => {
    const collector = createValidationErrorCollector(page);

    // Use a failed instance from broken process
    await page.goto('/process-instances/3100000000000000198');
    await waitForApiCalls(page);

    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Validation errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});
