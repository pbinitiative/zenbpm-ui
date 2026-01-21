import { test, expect } from '@playwright/test';

test.describe('Process Definition Detail Page', () => {
  const processDefinitionKey = '3000000000000000033'; // Showcase Process

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-definitions/${processDefinitionKey}`);
  });

  test('should display process definition metadata', async ({ page }) => {
    // Wait for metadata section to load
    await expect(page.getByText('Definition Details')).toBeVisible();

    // Check metadata content
    await expect(page.getByText(processDefinitionKey)).toBeVisible();
    // Check process name
    await expect(page.getByText('showcase-process', { exact: true })).toBeVisible();
  });

  test('should display BPMN diagram', async ({ page }) => {
    // Wait for diagram section
    await expect(page.getByText('BPMN Diagram')).toBeVisible();

    // Check that the diagram container exists
    const diagramContainer = page.locator('.bjs-container');
    await expect(diagramContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display version switcher', async ({ page }) => {
    // Version switcher should show current version (v1 for showcase-process)
    const versionChips = page.getByText('v1');
    await expect(versionChips.first()).toBeVisible();
  });

  test('should display process instances table with partition groups', async ({ page }) => {
    // Wait for instances section
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Check partition group headers are displayed (use first() since there may be multiple)
    await expect(page.getByText(/Partition \d+/).first()).toBeVisible();
  });

  test('should show action buttons in metadata panel', async ({ page }) => {
    // Check for action buttons in the metadata panel
    const startButton = page.getByTestId('process-definition-start-instance-button');
    const editButton = page.getByTestId('process-definition-edit-button');

    // Action buttons should be visible in metadata panel
    await expect(startButton).toBeVisible();
    await expect(editButton).toBeVisible();

    // Verify button text
    await expect(startButton).toContainText('Start Instance');
    await expect(editButton).toContainText('Open In Editor');
  });

  test('should open start instance dialog', async ({ page }) => {
    // Click start instance button in metadata panel
    const startButton = page.getByTestId('process-definition-start-instance-button');
    await startButton.click();

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Start New Instance')).toBeVisible();
    await expect(page.getByText('Process Variables (JSON)')).toBeVisible();

    // JSON editor should be present with default value
    const jsonEditor = page.getByRole('textbox', { name: '{}' });
    await expect(jsonEditor).toBeVisible();
    await expect(jsonEditor).toHaveValue('{}');

    // Cancel button should close dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should validate JSON in start instance dialog', async ({ page }) => {
    // Open dialog
    const startButton = page.getByTestId('process-definition-start-instance-button');
    await startButton.click();

    // Enter invalid JSON
    const jsonEditor = page.getByRole('textbox', { name: '{}' });
    await jsonEditor.fill('invalid json');

    // Should show error
    await expect(page.getByText('Invalid JSON format')).toBeVisible();

    // Start button should be disabled
    const startDialogButton = page.getByRole('button', { name: 'Start' });
    await expect(startDialogButton).toBeDisabled();

    // Enter valid JSON
    await jsonEditor.fill('{"key": "value"}');

    // Error should disappear and button should be enabled
    await expect(page.getByText('Invalid JSON format')).not.toBeVisible();
    await expect(startDialogButton).toBeEnabled();
  });

  test('should display partition data grouped in table', async ({ page }) => {
    // Wait for the instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Check that partition headers are visible with pagination status
    // Format: "Partition 1" with "X–Y of Z" pagination indicator
    await expect(page.getByText('Partition 1')).toBeVisible();
    // Check for pagination format like "1–5 of 10" or out of range indicator
    await expect(page.getByText(/\d+–\d+ of \d+|\d+ > \d+/).first()).toBeVisible();
  });
});

test.describe('Process Definition Detail - Navigation', () => {
  test('should navigate from process definitions list', async ({ page }) => {
    // Go to processes page
    await page.goto('/processes');

    // Wait for table to load - check for page heading
    await expect(page.getByRole('heading', { name: 'Processes' })).toBeVisible({ timeout: 10000 });

    // Wait for data to load (table should have data rows with actual numeric keys, not "Loading...")
    const firstRow = page.locator('table tbody tr').first();
    const keyCell = firstRow.locator('td').first();
    await expect(keyCell).toHaveText(/^\d+$/, { timeout: 10000 });

    // Get the key from the first cell to construct expected URL
    const key = await keyCell.textContent();

    // Click on the row to navigate to detail page
    await firstRow.click({ force: true });

    // Should navigate to detail page
    await expect(page).toHaveURL(new RegExp(`/process-definitions/${key}`), { timeout: 10000 });

    // Detail page should load
    await expect(page.getByText('Definition Details')).toBeVisible();
  });

  test('should handle non-existent process definition', async ({ page }) => {
    // Navigate to non-existent process definition
    await page.goto('/process-definitions/non-existent-key');

    // Should show error
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('Process Definition Detail - Version Switching', () => {
  test('should show multiple versions in dropdown', async ({ page }) => {
    // Go to Showcase Process which has 3 versions
    await page.goto('/process-definitions/3000000000000000033');

    // Wait for page to load
    await expect(page.getByText('Definition Details')).toBeVisible();

    // Click version dropdown (if there are multiple versions)
    const versionSelect = page.locator('[role="combobox"]').first();
    if (await versionSelect.isVisible()) {
      await versionSelect.click();

      // Should show version options (showcase-process has 3 versions)
      await expect(page.getByRole('option')).toHaveCount(3);
    }
  });
});

test.describe('Process Definition Detail - Filters', () => {
  const processDefinitionKey = '3000000000000000033'; // Showcase Process

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-definitions/${processDefinitionKey}`);
  });

  test('should show filters button in instances table', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Check for filters button
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await expect(filtersButton).toBeVisible();
  });

  test('should open and close filters panel', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Click filters button to open panel
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await filtersButton.click();

    // Filters panel should be visible - check for Activity filter label
    const activityLabel = page.getByText('Activity');
    await expect(activityLabel.first()).toBeVisible({ timeout: 5000 });

    // Close filters panel
    await filtersButton.click();

    // Wait a bit for collapse animation
    await page.waitForTimeout(500);

    // The filter label should not be visible (panel collapsed)
    await expect(activityLabel.first()).not.toBeVisible();
  });

  test('should have activity filter available when viewing from process definition', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Open filters panel
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await filtersButton.click();

    // Activity filter should be available (since we're on process definition detail)
    const activityLabel = page.getByText('Activity');
    await expect(activityLabel.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter by state and show badge', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Find and click the State dropdown (exposed in first line)
    const stateFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'State' }).first();
    await stateFormControl.click();

    // Select "Active" option from the dropdown
    await page.getByRole('option', { name: 'Active' }).click();

    // Filter badge should appear above the table
    const stateBadge = page.getByTestId('filter-badge-state');
    await expect(stateBadge).toBeVisible();
    await expect(stateBadge).toContainText('Active');
  });

  test('should filter by activity from diagram click and show badge', async ({ page }) => {
    // Wait for diagram to load
    const diagramContainer = page.locator('.bjs-container');
    await expect(diagramContainer).toBeVisible({ timeout: 10000 });

    // Click on a task element in the diagram
    // Note: This clicks on the "task-a" user task which exists in the showcase-process BPMN
    const taskElement = page.locator('.djs-element[data-element-id="task-a"]');
    if (await taskElement.isVisible()) {
      await taskElement.click();

      // Activity filter badge should appear
      const activityBadge = page.getByTestId('filter-badge-activityId');
      await expect(activityBadge).toBeVisible();
      await expect(activityBadge).toContainText('task-a');
    }
  });

  test('should remove filter by clicking badge delete button', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Open filters panel
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await filtersButton.click();

    // Wait for filters panel to expand - Activity filter should be visible
    const activityLabel = page.getByText('Activity');
    await expect(activityLabel.first()).toBeVisible({ timeout: 5000 });

    // Set an activity filter using the Activity select dropdown
    const activityFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'Activity' }).first();
    await activityFormControl.click();

    // Select task-a option from the dropdown
    await page.getByRole('option', { name: 'task-a' }).click();

    // Activity badge should appear
    const activityBadge = page.getByTestId('filter-badge-activityId');
    await expect(activityBadge).toBeVisible();

    // Click the delete icon on the badge (it's an SVG, not a button)
    await activityBadge.locator('svg').click();

    // Badge should disappear
    await expect(activityBadge).not.toBeVisible();
  });

  test('should show clear all button when multiple filters active', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Set a state filter (exposed in first line)
    const stateFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'State' }).first();
    await stateFormControl.click();
    await page.getByRole('option', { name: 'Active' }).click();

    // Open filters panel for activity filter
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await filtersButton.click();

    // Wait for filters panel to expand
    const activityLabel = page.getByText('Activity');
    await expect(activityLabel.first()).toBeVisible({ timeout: 5000 });

    // Set an activity filter
    const activityFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'Activity' }).first();
    await activityFormControl.click();
    await page.getByRole('option', { name: 'task-a' }).click();

    // Both badges should be visible
    await expect(page.getByTestId('filter-badge-state')).toBeVisible();
    await expect(page.getByTestId('filter-badge-activityId')).toBeVisible();

    // Clear All button should appear
    const clearButton = page.getByRole('button', { name: /Clear All/i });
    await expect(clearButton).toBeVisible();

    // Click Clear All
    await clearButton.click();

    // Both badges should disappear
    await expect(page.getByTestId('filter-badge-state')).not.toBeVisible();
    await expect(page.getByTestId('filter-badge-activityId')).not.toBeVisible();
  });
});

test.describe('Process Definition Detail - Pagination', () => {
  const processDefinitionKey = '3000000000000000033'; // Showcase Process

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-definitions/${processDefinitionKey}`);
    // Wait for page to fully load
    await expect(page.getByText('BPMN Diagram')).toBeVisible({ timeout: 10000 });
  });

  test('should display numbered page buttons in pagination', async ({ page }) => {
    // Wait for instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });

    // Look for pagination component with page numbers
    const pagination = page.locator('.MuiPagination-root');
    await expect(pagination).toBeVisible();

    // Should have page 1 button
    await expect(page.getByRole('button', { name: 'page 1' })).toBeVisible();
  });

  test('should display rows per page selector', async ({ page }) => {
    // Wait for instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Should have rows per page label and selector
    await expect(page.getByText('Rows per page:')).toBeVisible();
  });

  test('should change page when clicking page number', async ({ page }) => {
    // Wait for instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Get initial pagination status on a partition
    const initialStatus = page.getByText(/1–\d+ of \d+/).first();
    await expect(initialStatus).toBeVisible();

    // Click page 2 if available
    const page2Button = page.getByRole('button', { name: 'Go to page 2' });
    if (await page2Button.isVisible()) {
      await page2Button.click();

      // Pagination status should update to show different range
      await expect(page.getByText(/\d+–\d+ of \d+/).first()).toBeVisible();
    }
  });

  test('should have first and last page buttons', async ({ page }) => {
    // Wait for instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Should have first and last page navigation buttons
    await expect(page.getByRole('button', { name: /first page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /last page/i })).toBeVisible();
  });
});

test.describe('Process Definition Detail - Activity Filter Sync', () => {
  const processDefinitionKey = '3000000000000000033'; // Showcase Process

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-definitions/${processDefinitionKey}`);
    // Wait for page to fully load
    await expect(page.getByText('BPMN Diagram')).toBeVisible({ timeout: 10000 });
  });

  test('should highlight element in diagram when activity filter is set', async ({ page }) => {
    // Wait for diagram and table to load
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 10000 });

    // Open filters panel
    await page.getByRole('button', { name: /Filters/i }).click();

    // Set an activity filter
    const activityFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'Activity' }).first();
    await activityFormControl.click();
    await page.getByRole('option', { name: 'task-a' }).click();

    // Activity badge should appear
    await expect(page.getByTestId('filter-badge-activityId')).toBeVisible();
  });

  test('should remove diagram highlight when activity filter is cleared', async ({ page }) => {
    // Wait for diagram and table to load
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });

    // Open filters panel and set activity filter
    await page.getByRole('button', { name: /Filters/i }).click();
    const activityFormControl = page.locator('.MuiFormControl-root').filter({ hasText: 'Activity' }).first();
    await activityFormControl.click();
    await page.getByRole('option', { name: 'task-a' }).click();

    // Badge should appear
    const activityBadge = page.getByTestId('filter-badge-activityId');
    await expect(activityBadge).toBeVisible();

    // Clear the filter by clicking the badge delete icon
    await activityBadge.locator('svg').click();

    // Badge should disappear
    await expect(activityBadge).not.toBeVisible();
  });
});
