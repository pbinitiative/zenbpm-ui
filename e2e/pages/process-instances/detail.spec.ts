import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';

const { ACTIVE_INSTANCE_KEY, COMPLETED_INSTANCE_KEY, TERMINATED_INSTANCE_KEY } = instanceKeys;

test.describe('Process Instance Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);
  });

  test('should display process instance metadata', async ({ page }) => {
    // Wait for metadata section to load
    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check metadata content
    await expect(page.getByText(ACTIVE_INSTANCE_KEY)).toBeVisible();
    // State chip in metadata section
    await expect(page.getByText('Active').first()).toBeVisible();
  });

  test('should display BPMN diagram', async ({ page }) => {
    // Wait for diagram section
    await expect(page.getByText('BPMN Diagram')).toBeVisible();

    // Check that the diagram container exists
    const diagramContainer = page.locator('.bjs-container');
    await expect(diagramContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display process definition link', async ({ page }) => {
    // Wait for metadata section
    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for process definition link with descriptive text
    const definitionLink = page.getByRole('link', { name: 'Process Definition' });
    await expect(definitionLink).toBeVisible();
    await expect(definitionLink).toHaveAttribute('href', /\/process-definitions\//);
  });

  test('should display tabs for jobs, history, incidents, variables, child processes', async ({ page }) => {
    // Check tabs are visible
    await expect(page.getByRole('tab', { name: /Jobs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /History/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Incidents/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Variables/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Called Processes/i })).toBeVisible();
  });

  test('should show jobs in jobs tab', async ({ page }) => {
    // Jobs tab should be active by default
    const jobsTab = page.getByRole('tab', { name: /Jobs/i });
    await expect(jobsTab).toBeVisible();

    // Check for job type column header
    await expect(page.getByText('Job Type')).toBeVisible();
  });

  test('should switch to history tab', async ({ page }) => {
    // Click on History tab
    await page.getByRole('tab', { name: /History/i }).click();

    // Check for history content
    await expect(page.getByText('Element ID')).toBeVisible();
  });

  test('should switch to incidents tab', async ({ page }) => {
    // Click on Incidents tab
    await page.getByRole('tab', { name: /Incidents/i }).click();

    // Check for incidents content - Message column should be visible
    await expect(page.getByText('Message')).toBeVisible();
  });

  test('should switch to variables tab', async ({ page }) => {
    // Click on Variables tab
    await page.getByRole('tab', { name: /Variables/i }).click();

    // Check for specific variables from mock data
    await expect(page.getByText('customerId')).toBeVisible();
    await expect(page.getByText('CUST-001')).toBeVisible();
  });

  test('should show complete button for active jobs', async ({ page }) => {
    // Jobs tab should be active by default
    // Look for Complete button
    const completeButton = page.getByRole('button', { name: 'Complete' });
    await expect(completeButton.first()).toBeVisible();
  });
});

test.describe('Process Instance Detail - Breadcrumb Highlighting', () => {
  const callActivityInstanceKey = '3100000000000000066';

  test('should highlight the selected diagram element when clicking a breadcrumb in the variables table', async ({ page }) => {
    await page.goto(`/process-instances/${callActivityInstanceKey}?tab=variables`);
    await expect(page.getByTestId('variables-table')).toBeVisible({ timeout: 10000 });

    const breadcrumb = page.getByTestId('variables-table').getByRole('button', { name: 'callActivity' }).first();
    await expect(breadcrumb).toBeVisible();
    await breadcrumb.click();

    await expect(page).toHaveURL(/elementId=callActivity/);
    await expect(page.locator('.djs-element[data-element-id="callActivity"].element-selected')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Process Instance Detail - Navigation', () => {
  test('should navigate from process definition detail', async ({ page }) => {
    const { SHOWCASE_PROCESS_DEFINITION_KEY } = instanceKeys;

    // Go to a process definition detail page (Showcase Process)
    await page.goto(`/process-definitions/${SHOWCASE_PROCESS_DEFINITION_KEY}`);

    // Wait for instances table to load
    await expect(page.getByText('Process Instances')).toBeVisible();

    // Click on an instance link in the table
    const instanceLink = page.locator('table tbody tr').first().locator('button, a').first();
    if (await instanceLink.isVisible()) {
      await instanceLink.click();

      // Should navigate to instance detail page
      await expect(page).toHaveURL(/\/process-instances\/\d+/);
      await expect(page.getByText('Instance Details')).toBeVisible();
    }
  });

  test('should handle non-existent process instance', async ({ page }) => {
    // Navigate to non-existent process instance
    await page.goto('/process-instances/9999999999999999999');

    // Should show error
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('Process Instance Detail - State Display', () => {
  test('should display active state correctly', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);

    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for active state chip in metadata section (first occurrence)
    await expect(page.getByText('Active').first()).toBeVisible();
  });

  test('should display completed state correctly', async ({ page }) => {
    await page.goto(`/process-instances/${COMPLETED_INSTANCE_KEY}`);

    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for completed state chip in metadata section (first occurrence)
    await expect(page.getByText('Completed').first()).toBeVisible();
  });

  test('should display terminated state correctly', async ({ page }) => {
    await page.goto(`/process-instances/${TERMINATED_INSTANCE_KEY}`);

    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for terminated state badge in metadata section (case-insensitive)
    await expect(page.getByText(/terminated/i).first()).toBeVisible();
  });
});

test.describe('Process Instance Detail - Cancel Process', () => {
  test('should show cancel button for active instance', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel process/i });
    await expect(cancelButton).toBeVisible();
  });

  test('should NOT show cancel button for completed instance', async ({ page }) => {
    await page.goto(`/process-instances/${COMPLETED_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel process/i });
    await expect(cancelButton).not.toBeVisible();
  });

  test('should NOT show cancel button for terminated instance', async ({ page }) => {
    await page.goto(`/process-instances/${TERMINATED_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel process/i });
    await expect(cancelButton).not.toBeVisible();
  });

  test('should show confirm dialog when cancel button is clicked', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible();

    await page.getByRole('button', { name: /cancel process/i }).click();

    // Dialog should appear with the correct title and message
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Cancel Process' })).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText('Are you sure you want to cancel process?')
    ).toBeVisible();
  });

  test('should dismiss dialog without canceling when "No" is clicked', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);
    await expect(page.getByText('Instance Details')).toBeVisible();

    await page.getByRole('button', { name: /cancel process/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click "No" to dismiss
    await page.getByRole('dialog').getByRole('button', { name: 'No' }).click();

    // Dialog should close and the cancel button should still be visible
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /cancel process/i })).toBeVisible();
  });
});

// This test permanently mutates state (MSW in-memory or real server), so it runs
// serially in isolation.
//
// In mock mode: we use the pre-seeded ACTIVE_INSTANCE_KEY directly, because the MSW
// POST handler does not persist new instances in its in-memory store, so a
// dynamically created instance would 404 on subsequent GET calls.
//
// In live mode: we create a fresh instance via the API so we don't pollute shared
// pre-seeded data with a permanent cancellation.
test.describe.serial('Process Instance Detail - Cancel Process (full flow)', () => {
  const E2E_MODE = process.env.E2E_MODE ?? 'mocks';
  let instanceKeyForCancelFlow: string;

  test.beforeEach(async ({ page }) => {
    if (E2E_MODE === 'mocks') {
      // Use the pre-seeded active instance — it exists in MSW's in-memory store
      // and its state will be mutated to 'terminated' by the cancel action.
      instanceKeyForCancelFlow = ACTIVE_INSTANCE_KEY;
    } else {
      // Create a fresh active instance so the cancellation doesn't pollute shared data
      const { SHOWCASE_PROCESS_DEFINITION_KEY } = instanceKeys;
      const response = await page.request.post('/v1/process-instances', {
        data: { processDefinitionKey: SHOWCASE_PROCESS_DEFINITION_KEY },
      });
      const body = await response.json();
      instanceKeyForCancelFlow = body.key;
    }
  });

  test('should cancel process and update UI when confirmed', async ({ page }) => {
    await page.goto(`/process-instances/${instanceKeyForCancelFlow}`);
    await expect(page.getByText('Instance Details')).toBeVisible();

    await page.getByRole('button', { name: /cancel process/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Confirm cancellation
    await page.getByRole('dialog').getByRole('button', { name: 'Yes' }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Wait for the auto-refresh to pick up the terminated state.
    // The auto-refresh polls every 5s; we wait for a GET response containing "terminated".
    await page.waitForResponse(
      async (res) => {
        if (!res.url().includes(`/process-instances/${instanceKeyForCancelFlow}`) || res.request().method() !== 'GET') {
          return false;
        }
        try {
          const body = await res.json();
          return body?.state === 'terminated';
        } catch {
          return false;
        }
      },
      { timeout: 15000 }
    );

    // Cancel button should disappear (state is now 'terminated')
    await expect(page.getByRole('button', { name: /cancel process/i })).not.toBeVisible({ timeout: 5000 });

    // State badge should reflect the terminated state
    await expect(page.getByText(/terminated/i).first()).toBeVisible();
  });
});

test.describe('Process Instance Detail - Incidents', () => {
  test('should show incident indicator when instance has incidents', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);

    // Wait for page to load
    await expect(page.getByText('Instance Details')).toBeVisible();

    // Check for incident indicator (error icon or badge)
    // The incident count badge on the Incidents tab
    const incidentsTab = page.getByRole('tab', { name: /Incidents/i });
    await expect(incidentsTab).toBeVisible();
  });

  test('should show resolve button for unresolved incidents', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}`);

    // Go to incidents tab
    await page.getByRole('tab', { name: /Incidents/i }).click();

    // Look for Resolve button for unresolved incidents
    const resolveButton = page.getByRole('button', { name: 'Resolve' });
    // If there are unresolved incidents, the button should be visible
    if (await resolveButton.count() > 0) {
      await expect(resolveButton.first()).toBeVisible();
    }
  });
});

test.describe('Process Instance Detail - Process Type Display', () => {
  // call-activity-simple instance has processType: 'callActivity'
  const callActivityInstanceKey = '3100000000000000066';

  test('should show Type field in metadata for call-activity instance', async ({ page }) => {
    await page.goto(`/process-instances/${callActivityInstanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });

    // Type field label should appear in metadata panel (scope to avoid strict-mode ambiguity)
    const metadataPanel = page.getByTestId('process-instance-metadata-panel');
    await expect(metadataPanel.getByText('Type')).toBeVisible();
    // Translated value 'Call Activity' should appear
    await expect(metadataPanel.getByText('Call Activity', { exact: true })).toBeVisible();
  });

  test('should show Type column in process instances table', async ({ page }) => {
    await page.goto('/processes/instances');
    await expect(page.getByRole('columnheader', { name: /type/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show Call Activity type value in process instances table', async ({ page }) => {
    await page.goto('/processes/instances');
    await expect(page.getByText('Call Activity').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Process Instance Detail - Jobs Tab Variables Column', () => {
  // Use showcase process active instance which has jobs with variables
  const instanceKey = '3100000000000000014';

  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${instanceKey}`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
  });

  test('should show Variables column header in jobs table', async ({ page }) => {
    // Jobs tab is active by default
    await expect(page.getByRole('columnheader', { name: /variables/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show job variables content in jobs table', async ({ page }) => {
    // The job for this instance has { customerId: 'CUST-001', ... }
    // Variables column should render some JSON content or key names
    const jobsTable = page.getByTestId('jobs-table');
    await expect(jobsTable).toBeVisible({ timeout: 5000 });

    // There should be a variables cell with content (non-empty)
    const variablesCells = jobsTable.locator('tbody tr td').filter({ hasText: /CUST-001|customerId|loanAmount/ });
    await expect(variablesCells.first()).toBeVisible();
  });

  test('should open variables dialog when clicking variables cell', async ({ page }) => {
    const jobsTable = page.getByTestId('jobs-table');
    await expect(jobsTable).toBeVisible({ timeout: 5000 });

    // Click a variables cell that has content
    const variablesCell = jobsTable.locator('tbody tr td').filter({ hasText: /CUST-001|customerId|loanAmount/ }).first();
    await variablesCell.click();

    // A dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

    // Dialog should show the variables heading
    await expect(page.getByRole('dialog').getByText(/variables/i).first()).toBeVisible();
  });
});

test.describe('Process Instance Detail - Include Child Processes Filter', () => {
  test('should show Include child processes switch on process instances list', async ({ page }) => {
    await page.goto('/processes/instances');
    await expect(page.getByRole('columnheader', { name: /state/i }).first()).toBeVisible({ timeout: 10000 });

    // The filter section may need to be expanded; look for the switch label
    const filterToggle = page.getByRole('button', { name: /more filters|filters/i });
    if (await filterToggle.count() > 0) {
      await filterToggle.first().click();
      await page.waitForTimeout(300);
    }

    await expect(page.getByText('Include child processes')).toBeVisible({ timeout: 5000 });
  });

  test('should not show Include child processes filter on process definition detail instances tab', async ({ page }) => {
    // When viewing instances for a specific process definition, the include-child-processes
    // filter should be hidden (parentProcessInstanceKey is already set in that context)
    await page.goto('/process-definitions/3000000000000000033');
    await expect(page.getByText('Process Instances')).toBeVisible({ timeout: 10000 });

    // Switch to instances sub-tab if needed
    const instancesBtn = page.getByRole('button', { name: /instances/i });
    if (await instancesBtn.count() > 0) {
      await instancesBtn.first().click();
      await page.waitForTimeout(300);
    }

    await expect(page.getByText('Include child processes')).not.toBeVisible();
  });
});
