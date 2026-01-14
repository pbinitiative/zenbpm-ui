import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Comprehensive Console Error Detection Tests
 *
 * These tests navigate through all pages of the application and capture
 * any console errors or warnings that occur.
 */

interface ErrorCollector {
  errors: string[];
  warnings: string[];
  cleanup: () => void;
}

// Helper to collect ALL console errors and warnings
function createErrorCollector(page: Page): ErrorCollector {
  const errors: string[] = [];
  const warnings: string[] = [];

  const handler = (msg: ConsoleMessage) => {
    const type = msg.type();
    const text = msg.text();

    // Skip known benign messages
    if (text.includes('Download the React DevTools')) return;
    if (text.includes('Vite')) return;
    if (text.includes('[HMR]')) return;
    if (text.includes('punycode')) return; // Node deprecation warning
    if (text.includes('ExperimentalWarning')) return;

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  };

  const errorHandler = (err: Error) => {
    errors.push(`Page error: ${err.message}`);
  };

  page.on('console', handler);
  page.on('pageerror', errorHandler);

  return {
    errors,
    warnings,
    cleanup: () => {
      page.off('console', handler);
      page.off('pageerror', errorHandler);
    },
  };
}

// Wait for page to stabilize
async function waitForStable(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Extra time for React to render
}

// Get all valid process definition keys from the mock data
const _processDefinitionKeys = [
  '3000000000000000001', // call-activity-simple
  '3000000000000000002', // call-activity-with-boundary-simple
  '3000000000000000003', // call-activity-with-multiple-boundary-user-task-end
  '3000000000000000004', // call-activity-with-multiple-boundary
  '3000000000000000005', // exclusive-gateway-multiple-tasks-no-default
  '3000000000000000006', // exclusive-gateway-multiple-tasks
  '3000000000000000007', // exclusive-gateway-with-condition-and-default
  '3000000000000000008', // exclusive-gateway-with-condition
  '3000000000000000033', // showcase-process
];

// Get process instance keys
const _processInstanceKeys = [
  '3100000000000000164', // showcase-process instance
  '3100000000000000014', // showcase-process instance
  '3100000000000000066', // call-activity-simple instance
];

test.describe('Console Error Detection - Process Definitions', () => {
  test('Process Definitions list page - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/processes');
    await waitForStable(page);

    // Check for table content
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Definition detail - showcase-process - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/3000000000000000033');
    await waitForStable(page);

    // Wait for BPMN diagram
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Definition detail - call-activity-simple - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/3000000000000000001');
    await waitForStable(page);

    // Wait for BPMN diagram
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Definition detail - exclusive-gateway - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/3000000000000000006');
    await waitForStable(page);

    // Wait for BPMN diagram
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Definition - non-existent key - handles gracefully', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/9999999999999999999');
    await waitForStable(page);

    // Should show error alert, not crash
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });

    collector.cleanup();
    // May have console errors for 404, but shouldn't have React errors
    const reactErrors = collector.errors.filter(e =>
      e.includes('Cannot read properties') ||
      e.includes('undefined') ||
      e.includes('null')
    );
    expect(reactErrors, `React errors found:\n${reactErrors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Console Error Detection - Process Instances', () => {
  test('Process Instances list page - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/processes/instances');
    await waitForStable(page);

    // Check for table content
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance detail - showcase instance - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-instances/3100000000000000014');
    await waitForStable(page);

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance detail - all tabs - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-instances/3100000000000000014');
    await waitForStable(page);

    // Click through all tabs
    const tabs = ['Variables', 'Jobs', 'Incidents', 'History'];
    for (const tab of tabs) {
      const tabButton = page.getByRole('tab', { name: tab });
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(500);
      }
    }

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Process Instance - non-existent key - handles gracefully', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-instances/9999999999999999999');
    await waitForStable(page);

    collector.cleanup();
    // Filter for React-specific errors (null/undefined access)
    const reactErrors = collector.errors.filter(e =>
      e.includes('Cannot read properties') ||
      (e.includes('undefined') && !e.includes('404')) ||
      (e.includes('null') && !e.includes('404'))
    );
    expect(reactErrors, `React errors found:\n${reactErrors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Console Error Detection - Decisions', () => {
  test('Decisions list page - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/decisions');
    await waitForStable(page);

    // Check for table content
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Decision Instances list page - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/decisions/instances');
    await waitForStable(page);

    // Check for table content
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Console Error Detection - Other Pages', () => {
  test('Home page - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/');
    await waitForStable(page);

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Incidents page - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/incidents');
    await waitForStable(page);

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Console Error Detection - Interactive Features', () => {
  test('Open Start Instance dialog - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/3000000000000000033');
    await waitForStable(page);

    // Click start instance FAB
    const startButton = page.locator('button').filter({
      has: page.locator('svg[data-testid="PlayArrowIcon"]')
    }).first();

    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);

      // Close dialog
      await page.getByRole('button', { name: 'Cancel' }).click();
    }

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Use filters on Process Definition - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/3000000000000000033');
    await waitForStable(page);

    // Open filters
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await page.waitForTimeout(500);
    }

    // Set state filter
    const stateFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'State' }).first();
    if (await stateFormControl.isVisible()) {
      await stateFormControl.click();
      const activeOption = page.getByRole('option', { name: 'Active' });
      if (await activeOption.isVisible()) {
        await activeOption.click();
        await page.waitForTimeout(500);
      }
    }

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });

  test('Click on BPMN diagram element - no errors', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/process-definitions/3000000000000000033');
    await waitForStable(page);

    // Wait for diagram
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Click on an element in the diagram
    const taskElement = page.locator('.djs-element[data-element-id="task-a"]');
    if (await taskElement.isVisible()) {
      await taskElement.click();
      await page.waitForTimeout(500);
    }

    collector.cleanup();
    expect(collector.errors, `Errors found:\n${collector.errors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Console Warning Detection', () => {
  test('No React key warnings on Process Definitions list', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/processes');
    await waitForStable(page);

    collector.cleanup();
    const keyWarnings = collector.warnings.filter(w => w.includes('same key'));
    expect(keyWarnings, `Key warnings found:\n${keyWarnings.join('\n')}`).toHaveLength(0);
  });

  test('No React key warnings on Process Instances list', async ({ page }) => {
    const collector = createErrorCollector(page);

    await page.goto('/processes/instances');
    await waitForStable(page);

    collector.cleanup();
    const keyWarnings = collector.warnings.filter(w => w.includes('same key'));
    expect(keyWarnings, `Key warnings found:\n${keyWarnings.join('\n')}`).toHaveLength(0);
  });
});
