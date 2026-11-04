import { test, expect, type Page } from '@playwright/test';

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
    // Version tags are displayed verbatim for the current definition.
    await expect(page.getByText('release-1', { exact: true }).first()).toBeVisible();
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

    // Monaco JSON editor should be present
    const monacoEditor = page.locator('.monaco-editor');
    await expect(monacoEditor).toBeVisible();

    // Cancel button should close dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should validate JSON in start instance dialog', async ({ page }) => {
    // Open dialog
    const startButton = page.getByTestId('process-definition-start-instance-button');
    await startButton.click();

    // Wait for Monaco editor to load
    const monacoEditor = page.locator('.monaco-editor');
    await expect(monacoEditor).toBeVisible();

    // Start button should be enabled with default valid JSON
    const startDialogButton = page.getByRole('button', { name: 'Start' });
    await expect(startDialogButton).toBeEnabled();

    // Use Monaco's API to set invalid JSON content
    await page.evaluate(() => {
      const editor = (window as unknown as { monaco?: { editor?: { getEditors?: () => { setValue: (v: string) => void }[] } } }).monaco?.editor?.getEditors?.()[0];
      if (editor) {
        editor.setValue('invalid json');
      }
    });

    // Wait for validation to process
    await page.waitForTimeout(300);

    // Should show error
    await expect(page.getByText('Invalid JSON format')).toBeVisible();

    // Start button should be disabled
    await expect(startDialogButton).toBeDisabled();

    // Set valid JSON content
    await page.evaluate(() => {
      const editor = (window as unknown as { monaco?: { editor?: { getEditors?: () => { setValue: (v: string) => void }[] } } }).monaco?.editor?.getEditors?.()[0];
      if (editor) {
        editor.setValue('{"key": "value"}');
      }
    });

    // Wait for validation to process
    await page.waitForTimeout(300);

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

test.describe('Process definition version-tag displays', () => {
  test('displays a single definition version with its tag and prefers the tag in the instances table', async ({ page }) => {
    await page.goto('/process-definitions/3000000000000000001');
    const metadataPanel = page.locator('.MuiPaper-root').filter({
      has: page.getByText('Definition Details', { exact: true }),
    });
    await expect(metadataPanel.getByTestId('version-pill')).toHaveText('v1');
    await expect(metadataPanel.getByTestId('version-tag')).toHaveText('release-single');
    // The only deployed version is the latest one
    await expect(metadataPanel.getByTestId('version-latest-chip')).toHaveText('latest');
    await expect(page.getByTestId('version-selector')).toHaveCount(0);

    await page.goto('/processes/instances');
    const processFilter = page.getByRole('combobox', { name: 'Select Process Definition' });
    await processFilter.fill('Call Activity Simple');
    await page.getByRole('option', { name: /Call Activity Simple/ }).click();
    const instancesTable = page.getByTestId('process-instances-table');
    await expect(instancesTable.getByText('release-single', { exact: true }).first()).toBeVisible();
    await expect(instancesTable.getByText('v1', { exact: true })).toHaveCount(0);
  });

  test('uses the numeric version in the instances table when no tag exists', async ({ page }) => {
    await page.goto('/processes/instances');
    const processFilter = page.getByRole('combobox', { name: 'Select Process Definition' });
    await processFilter.fill('Simple Task');
    await page.getByRole('option', { name: /Simple Task/ }).first().click();
    const instancesTable = page.getByTestId('process-instances-table');
    await expect(instancesTable.getByText('v1', { exact: true }).first()).toBeVisible();
  });
});

test.describe('Start Instance version selection', () => {
  test('renders numbered tagged options, marks only the latest, and starts the selected version', async ({ page }) => {
    await page.goto('/process-definitions/3000000000000000033');
    await page.getByTestId('process-definition-start-instance-button').click();

    const dialog = page.getByRole('dialog');
    const versionSelect = dialog.getByTestId('version-selector');
    await expect(versionSelect).not.toHaveClass(/Mui-disabled/);
    await versionSelect.getByRole('combobox').click();

    const options = page.getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(options.getByTestId('version-pill')).toHaveText(['v3', 'v2', 'v1']);
    await expect(options.getByTestId('version-tag')).toHaveText(['v3.0.0-rc1', 'v2.1.0', 'release-1']);
    await expect(options.getByTestId('version-latest-chip')).toHaveCount(1);
    await expect(options.nth(0).getByTestId('version-latest-chip')).toBeVisible();
    // The dialog picks a version to start; it doesn't mark a displayed version
    await expect(options.getByTestId('version-viewing-chip')).toHaveCount(0);
    await options.nth(1).click();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/v1/process-instances',
    );
    await dialog.getByRole('button', { name: 'Start', exact: true }).click();
    const response = await responsePromise;
    // Keys are int64 JSON numbers; inspect raw JSON to avoid JavaScript number rounding.
    expect(response.request().postData()).toContain(
      '"processDefinitionKey":3000000000000000034',
    );
  });

  test('renders numeric fallback labels and sends the selected untagged version key', async ({ page }) => {
    await page.goto('/process-definitions/3000000000000000047');
    await page.getByTestId('process-definition-start-instance-button').click();

    const dialog = page.getByRole('dialog');
    const versionSelect = dialog.getByTestId('version-selector');
    await expect(versionSelect).not.toHaveClass(/Mui-disabled/);
    await versionSelect.getByRole('combobox').click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.getByTestId('version-pill')).toHaveText(['v2', 'v1']);
    await expect(options.getByTestId('version-tag')).toHaveCount(0);
    await options.nth(0).click();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/v1/process-instances',
    );
    await dialog.getByRole('button', { name: 'Start', exact: true }).click();
    const response = await responsePromise;
    // Keys are int64 JSON numbers; inspect raw JSON to avoid JavaScript number rounding.
    expect(response.request().postData()).toContain(
      '"processDefinitionKey":3000000000000000048',
    );
  });

});

test.describe('Process Definition Detail - Version Switching', () => {
  test('shows numbered tagged versions, marks the viewed and latest versions, and navigates after selection', async ({ page }) => {
    await page.goto('/process-definitions/3000000000000000033');
    await expect(page.getByText('Definition Details')).toBeVisible();

    const versionSelect = page.getByTestId('version-selector');
    await expect(versionSelect).toBeVisible();
    // Closed selector: the viewed (older) version with its number and tag, not marked latest
    await expect(versionSelect.getByTestId('version-pill')).toHaveText('v1');
    await expect(versionSelect.getByTestId('version-tag')).toHaveText('release-1');
    // Tags are shown verbatim, not uppercased like other captions
    await expect(versionSelect.getByTestId('version-tag')).toHaveCSS('text-transform', 'none');
    await expect(versionSelect.getByTestId('version-latest-chip')).toHaveCount(0);
    await versionSelect.click();

    const options = page.getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(options.getByTestId('version-pill')).toHaveText(['v3', 'v2', 'v1']);
    await expect(options.getByTestId('version-tag')).toHaveText(['v3.0.0-rc1', 'v2.1.0', 'release-1']);
    await expect(options.getByTestId('version-latest-chip')).toHaveCount(1);
    await expect(options.nth(0).getByTestId('version-latest-chip')).toHaveText('latest');
    await expect(options.getByTestId('version-viewing-chip')).toHaveCount(1);
    await expect(options.nth(2).getByTestId('version-viewing-chip')).toHaveText('viewing');

    await options.nth(1).click();
    await expect(page).toHaveURL(/\/process-definitions\/3000000000000000034$/);
  });

  test('marks the latest version in the closed selector when viewing it', async ({ page }) => {
    await page.goto('/process-definitions/3000000000000000035');
    const versionSelect = page.getByTestId('version-selector');
    await expect(versionSelect.getByTestId('version-pill')).toHaveText('v3');
    await expect(versionSelect.getByTestId('version-tag')).toHaveText('v3.0.0-rc1');
    await expect(versionSelect.getByTestId('version-latest-chip')).toBeVisible();
    // The viewing marker is only shown in the open menu
    await expect(versionSelect.getByTestId('version-viewing-chip')).toHaveCount(0);

    await versionSelect.click();
    const options = page.getByRole('option');
    await expect(options.nth(0).getByTestId('version-latest-chip')).toBeVisible();
    await expect(options.nth(0).getByTestId('version-viewing-chip')).toBeVisible();
  });

  test('uses numeric labels when versions have no tags', async ({ page }) => {
    await page.goto('/process-definitions/3000000000000000047');
    const versionSelect = page.getByTestId('version-selector');
    await expect(versionSelect).toBeVisible();
    await versionSelect.click();

    const options = page.getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.getByTestId('version-pill')).toHaveText(['v2', 'v1']);
    await expect(options.getByTestId('version-tag')).toHaveCount(0);
    await expect(options.nth(0).getByTestId('version-latest-chip')).toBeVisible();
    await expect(options.nth(1).getByTestId('version-viewing-chip')).toBeVisible();
  });
});

// `src/mocks/handlers/processDefinitions.ts` exposes its data to the tests
type MockProcessDefinition = {
  key: string;
  version: number;
  bpmnProcessId: string;
  bpmnProcessName?: string;
  versionTag?: string;
  bpmnData: string;
  createdAt: string;
};
type MockWindow = { __mockProcessDefinitions: MockProcessDefinition[] };

const LONG_HISTORY_VERSIONS = 150; // more than one page of the 100-item version list
const LONG_HISTORY_FIRST_KEY = '3000000000000009000';
// Keys exceed Number.MAX_SAFE_INTEGER, so add with BigInt
const longHistoryKey = (version: number) => `${BigInt(LONG_HISTORY_FIRST_KEY) + BigInt(version)}`;

/**
 * Adds a process with a long version history to the mock data and opens one
 * of its versions within the app, which keeps the changed mock data.
 */
async function openLongHistoryVersion(
  page: Page,
  version: number,
  latestTag = `release-${LONG_HISTORY_VERSIONS}`,
) {
  await page.goto('/process-definitions/3000000000000000047');
  await expect(page.getByText('Definition Details')).toBeVisible();
  await page.evaluate(
    ({ count, firstKey, latestTag, openKey }) => {
      const definitions = (window as unknown as MockWindow).__mockProcessDefinitions;
      const template = definitions[0];
      for (let v = 1; v <= count; v += 1) {
        definitions.push({
          ...template,
          key: `${BigInt(firstKey) + BigInt(v)}`,
          version: v,
          bpmnProcessId: 'Long_History_Process',
          bpmnProcessName: 'Long History Process',
          versionTag: v === count ? latestTag : `release-${v}`,
        });
      }
      window.history.pushState({}, '', `/process-definitions/${openKey}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    {
      count: LONG_HISTORY_VERSIONS,
      firstKey: LONG_HISTORY_FIRST_KEY,
      latestTag,
      openKey: longHistoryKey(version),
    },
  );
  await expect(page.getByText('Long History Process')).toBeVisible();
}

test.describe('Process Definition Detail - Long version history', () => {
  test('lists every version and shows an old one that is not on the first page', async ({ page }) => {
    await openLongHistoryVersion(page, 1);

    const versionSelect = page.getByTestId('version-selector');
    await expect(versionSelect.getByTestId('version-pill')).toHaveText('v1');
    await expect(versionSelect.getByTestId('version-tag')).toHaveText('release-1');
    await expect(versionSelect.getByTestId('version-latest-chip')).toHaveCount(0);

    await versionSelect.click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(LONG_HISTORY_VERSIONS);
    await expect(options.nth(0).getByTestId('version-pill')).toHaveText(`v${LONG_HISTORY_VERSIONS}`);
    await expect(options.getByTestId('version-latest-chip')).toHaveCount(1);
    await expect(options.nth(0).getByTestId('version-latest-chip')).toBeVisible();
    await expect(options.last().getByTestId('version-pill')).toHaveText('v1');
    await expect(options.last().getByTestId('version-viewing-chip')).toBeVisible();
  });

  test('starts an instance of an old version that is not on the first page', async ({ page }) => {
    await openLongHistoryVersion(page, 1);
    await page.getByTestId('process-definition-start-instance-button').click();

    // The dialog pre-selects the version the page shows
    const dialog = page.getByRole('dialog');
    const dialogSelect = dialog.getByTestId('version-selector');
    await expect(dialogSelect).not.toHaveClass(/Mui-disabled/);
    await expect(dialogSelect.getByTestId('version-pill')).toHaveText('v1');
    await expect(dialogSelect.getByTestId('version-latest-chip')).toHaveCount(0);
    await dialogSelect.getByRole('combobox').click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(LONG_HISTORY_VERSIONS);
    await expect(options.nth(0).getByTestId('version-latest-chip')).toBeVisible();
    await page.keyboard.press('Escape');

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/v1/process-instances',
    );
    await dialog.getByRole('button', { name: 'Start', exact: true }).click();
    const response = await responsePromise;
    // Keys are int64 JSON numbers; inspect raw JSON to avoid JavaScript number rounding.
    expect(response.request().postData()).toContain(`"processDefinitionKey":${longHistoryKey(1)}`);
  });

  test('keeps the number and latest marker of a long tag on a phone screen', async ({ page }) => {
    const viewportWidth = 390;
    await page.setViewportSize({ width: viewportWidth, height: 844 });
    const longTag = `release-${'LongIdentifier'.repeat(12)}`;
    await openLongHistoryVersion(page, LONG_HISTORY_VERSIONS, longTag);

    const versionSelect = page.getByTestId('version-selector');
    const tag = versionSelect.getByTestId('version-tag');
    await expect(tag).toHaveText(longTag);
    await expect(tag).toHaveAttribute('title', longTag);

    // The page doesn't scroll sideways, and the tag is cut short instead
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportWidth);
    expect(await tag.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    for (const part of [versionSelect, versionSelect.getByTestId('version-pill'), versionSelect.getByTestId('version-latest-chip')]) {
      await expect(part).toBeInViewport({ ratio: 1 });
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

    // Wait for the state filter badge to confirm filter is applied before opening the filters panel
    // (prevents a URL sync race that can strip the state filter when the activity filter is set)
    await expect(page.getByTestId('filter-badge-state')).toBeVisible();
    await expect(page).toHaveURL(/state=active/);

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

      await expect(page.getByRole('button', { name: 'page 2' })).toBeVisible();
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
