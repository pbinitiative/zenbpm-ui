import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';
import {
  MULTI_INSTANCE_CHILD_B_KEY,
  MULTI_INSTANCE_PARENT_KEY,
  SIMPLE_USER_TASK_DEFAULT_TYPE_INSTANCE_KEY,
} from '../../../src/mocks/data/well-known-keys';

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
    // A tag is displayed verbatim and takes precedence over the numeric version.
    await expect(
      page.getByTestId('process-instance-metadata-panel').getByText('release-1', { exact: true })
    ).toBeVisible();
  });

  test('should fall back to the numeric version when no version tag is present', async ({ page }) => {
    await page.goto(`/process-instances/${SIMPLE_USER_TASK_DEFAULT_TYPE_INSTANCE_KEY}`);

    await expect(
      page.getByTestId('process-instance-metadata-panel').getByText('v1', { exact: true })
    ).toBeVisible();
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

  test('should show and trigger fail job action from three-dot menu', async ({ page }) => {
    // Jobs tab should be active by default
    await expect(page.getByTestId('jobs-table')).toBeVisible();

    // Open the three-dot menu on the first job row
    const menuButton = page.getByTestId('jobs-table').locator('button').filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') });
    await menuButton.first().click();

    // The menu should show the Fail job action
    const failMenuItem = page.getByRole('menuitem', { name: /fail job/i });
    await expect(failMenuItem).toBeVisible();

    // Click Fail job — opens a dialog with optional error code and variables
    await failMenuItem.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Fail Job' })).toBeVisible();
    // Both fields are visible: a text input for the error code, and the JSON editor (Monaco)
    await expect(dialog.getByLabel('Error Code')).toBeVisible();
    await expect(dialog.locator('.monaco-editor').first()).toBeVisible();

    // Fill in the error code and leave the variables at the default "{}".
    // The default is valid JSON, so the Fail job button should be enabled.
    await dialog.getByLabel('Error Code').fill('JOB-TEST-ERROR-001');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/jobs/') && res.url().includes('/fail') && res.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: /fail job/i }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    // The payload should include the error code. Variables default to "{}" which is
    // treated as "no variables" by the dialog, so the key should be absent.
    const requestBody = JSON.parse(response.request().postData() ?? '{}');
    expect(requestBody.errorCode).toBe('JOB-TEST-ERROR-001');
    expect(requestBody.variables).toBeUndefined();

    // Dialog closes and the success notification appears
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Job failed')).toBeVisible();
  });

  test('should fail job with empty body when dialog fields are left blank', async ({ page }) => {
    await expect(page.getByTestId('jobs-table')).toBeVisible();

    const menuButton = page.getByTestId('jobs-table').locator('button').filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') });
    await menuButton.first().click();

    const failMenuItem = page.getByRole('menuitem', { name: /fail job/i });
    await expect(failMenuItem).toBeVisible();
    await failMenuItem.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Leave the error code empty and variables at the default "{}" placeholder
    // — the request body should not contain empty `errorCode` or `variables` keys.
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/jobs/') && res.url().includes('/fail') && res.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: /fail job/i }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const requestBody = JSON.parse(response.request().postData() ?? '{}');
    expect(requestBody.errorCode).toBeUndefined();
    expect(requestBody.variables).toBeUndefined();

    await expect(dialog).not.toBeVisible();
  });

  test('should disable Fail button when variables JSON is invalid', async ({ page }) => {
    await expect(page.getByTestId('jobs-table')).toBeVisible();

    const menuButton = page.getByTestId('jobs-table').locator('button').filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') });
    await menuButton.first().click();
    const failMenuItem = page.getByRole('menuitem', { name: /fail job/i });
    await failMenuItem.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Type invalid JSON into the Monaco editor
    const monacoEditor = dialog.locator('.monaco-editor').first();
    await monacoEditor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('{ not valid json }');

    // The validation error should appear and the Fail button should be disabled
    await expect(dialog.getByText(/invalid json/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /fail job/i })).toBeDisabled();
  });

  test('should close fail job dialog on cancel without firing a request', async ({ page }) => {
    await expect(page.getByTestId('jobs-table')).toBeVisible();

    const menuButton = page.getByTestId('jobs-table').locator('button').filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') });
    await menuButton.first().click();

    const failMenuItem = page.getByRole('menuitem', { name: /fail job/i });
    await expect(failMenuItem).toBeVisible();
    await failMenuItem.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Track that no fail request is made after cancel
    let failRequestFired = false;
    page.on('request', (req) => {
      if (req.url().includes('/jobs/') && req.url().includes('/fail') && req.method() === 'POST') {
        failRequestFired = true;
      }
    });

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).not.toBeVisible();
    // Give the network a beat to make sure nothing fired
    await page.waitForTimeout(200);
    expect(failRequestFired).toBe(false);
  });
});

test.describe('Process Instance Detail - cross-tab focus', () => {
  const historyElementInstanceKey = `${ACTIVE_INSTANCE_KEY}002`;
  const correlatedJobKey = '5000000000000000005';

  test('navigates from a History row action to the exact focused Job row', async ({ page }) => {
    await page.goto(
      `/process-instances/${ACTIVE_INSTANCE_KEY}?tab=history&elementId=task-a`
    );

    const historyTable = page.getByTestId('history-table');
    await expect(historyTable).toBeVisible();
    const historyRow = historyTable.locator('tbody tr').filter({ hasText: historyElementInstanceKey });
    await expect(historyRow).toBeVisible();

    const menuButton = historyRow.getByRole('button').last();
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const viewRelatedJobAction = page.getByRole('menuitem', { name: /view related job/i });
    await expect(viewRelatedJobAction).toBeVisible();
    await viewRelatedJobAction.click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        tab: url.searchParams.get('tab'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
        elementId: url.searchParams.get('elementId'),
      };
    }).toEqual({
      pathname: `/process-instances/${ACTIVE_INSTANCE_KEY}`,
      tab: 'jobs',
      focusElementInstanceKey: historyElementInstanceKey,
      elementId: 'task-a',
    });

    const focusedJobRow = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: correlatedJobKey });
    await expect(focusedJobRow).toHaveAttribute('data-focused', 'true');
  });

  test('navigates from an external Business Rule Task History row to its Job', async ({ page }) => {
    const processInstanceKey = '3100000000000000184';
    const elementInstanceKey = `${processInstanceKey}002`;
    const jobKey = '5000000000000000029';

    await page.goto(`/process-instances/${processInstanceKey}?tab=history`);

    const historyRow = page
      .getByTestId('history-table')
      .locator('tbody tr')
      .filter({ hasText: elementInstanceKey });
    await historyRow.getByRole('button', { name: /row actions/i }).click();
    await page.getByRole('menuitem', { name: /view related job/i }).click();

    const focusedJobRow = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: jobKey });
    await expect(focusedJobRow).toHaveAttribute('data-focused', 'true');
  });

  test('navigates from a Job row action to the exact focused History row', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=jobs`);

    const jobsTable = page.getByTestId('jobs-table');
    await expect(jobsTable).toBeVisible();
    const jobRow = jobsTable.locator('tbody tr').filter({ hasText: correlatedJobKey });
    await expect(jobRow).toBeVisible();

    const menuButton = jobRow.getByRole('button').last();
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const viewInHistoryAction = page.getByRole('menuitem', { name: /view in history/i });
    await expect(viewInHistoryAction).toBeVisible();
    await viewInHistoryAction.click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        tab: url.searchParams.get('tab'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
      };
    }).toEqual({
      pathname: `/process-instances/${ACTIVE_INSTANCE_KEY}`,
      tab: 'history',
      focusElementInstanceKey: historyElementInstanceKey,
    });

    const focusedHistoryRow = page
      .getByTestId('history-table')
      .locator('tbody tr')
      .filter({ hasText: historyElementInstanceKey });
    await expect(focusedHistoryRow).toHaveAttribute('data-focused', 'true');
  });

  test('navigates from History to the first related Event type and highlights all matches', async ({ page }) => {
    const eventElementInstanceKey = `${ACTIVE_INSTANCE_KEY}007`;

    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=history&elementId=messageCatchEvent`);

    const historyTable = page.getByTestId('history-table');
    const startRow = historyTable.locator('tbody tr').filter({ hasText: `${ACTIVE_INSTANCE_KEY}001` });
    await expect(startRow.getByRole('button', { name: /row actions/i })).toHaveCount(0);

    const eventHistoryRow = historyTable
      .locator('tbody tr')
      .filter({ hasText: eventElementInstanceKey });
    await eventHistoryRow.getByRole('button', { name: /row actions/i }).click();
    await expect(page.getByRole('menuitem', { name: /view related job/i })).toHaveCount(0);
    await page.getByRole('menuitem', { name: /view related event/i }).click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        tab: url.searchParams.get('tab'),
        eventType: url.searchParams.get('eventType'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
        elementId: url.searchParams.get('elementId'),
      };
    }).toEqual({
      tab: 'events',
      eventType: 'messages',
      focusElementInstanceKey: eventElementInstanceKey,
      elementId: 'messageCatchEvent',
    });

    const eventTable = page.getByTestId('message-subscriptions-table');
    await expect(eventTable.locator('tbody tr[data-focused="true"]')).toHaveCount(2);
  });

  test('switches the Event state filter to reveal a related subscription', async ({ page }) => {
    const eventElementInstanceKey = `${ACTIVE_INSTANCE_KEY}007`;

    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    const messagesPanel = page.getByTestId('event-subscriptions-messages-panel');
    await messagesPanel.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /completed/i }).click();

    await page.getByRole('tab', { name: /History/i }).click();
    const eventHistoryRow = page
      .getByTestId('history-table')
      .locator('tbody tr')
      .filter({ hasText: eventElementInstanceKey });
    await eventHistoryRow.getByRole('button', { name: /row actions/i }).click();
    await page.getByRole('menuitem', { name: /view related event/i }).click();

    await expect(messagesPanel.getByRole('combobox').first()).toContainText(/active/i);
    await expect(
      page.getByTestId('message-subscriptions-table').locator('tbody tr[data-focused="true"]')
    ).toHaveCount(2);
  });

  test('navigates from an Event row to its exact History row', async ({ page }) => {
    const eventElementInstanceKey = `${ACTIVE_INSTANCE_KEY}007`;
    const messageName = 'OrderConfirmed';

    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);

    const eventRow = page
      .getByTestId('message-subscriptions-table')
      .locator('tbody tr')
      .filter({ hasText: messageName });
    await expect(eventRow).toBeVisible();
    await eventRow.getByRole('button', { name: /row actions/i }).click();
    await page.getByRole('menuitem', { name: /view in history/i }).click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        tab: url.searchParams.get('tab'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
      };
    }).toEqual({
      tab: 'history',
      focusElementInstanceKey: eventElementInstanceKey,
    });

    const focusedHistoryRow = page
      .getByTestId('history-table')
      .locator('tbody tr')
      .filter({ hasText: eventElementInstanceKey });
    await expect(focusedHistoryRow).toHaveAttribute('data-focused', 'true');
  });

  test('browser back and forward resolves a previously focused later Jobs page again', async ({ page }) => {
    const targetJobKey = '7000000000000000011';
    const targetElementInstanceKey = `${MULTI_INSTANCE_CHILD_B_KEY}006`;

    await page.goto(`/process-instances/${MULTI_INSTANCE_PARENT_KEY}?tab=history`);

    const historyRow = page
      .getByTestId('history-table')
      .locator('tbody tr')
      .filter({ hasText: targetElementInstanceKey });
    await historyRow.getByRole('button', { name: /row actions/i }).click();
    await page.getByRole('menuitem', { name: /view related job/i }).click();

    const jobsTable = page.getByTestId('jobs-table');
    const targetRow = jobsTable.locator('tbody tr').filter({ hasText: targetJobKey });
    await expect(targetRow).toHaveAttribute('data-focused', 'true');

    await jobsTable.getByRole('button', { name: /page 1/i }).click();
    await expect(targetRow).toHaveCount(0);

    await page.goBack();
    await expect(page.getByTestId('history-table')).toBeVisible();
    await page.goForward();

    await expect(targetRow).toHaveAttribute('data-focused', 'true');
    await expect(jobsTable.getByRole('button', { name: /page 2/i }))
      .toHaveAttribute('aria-current', 'page');
  });

  test('manual Jobs page-size changes are not overwritten by an in-flight focus scan', async ({ page }) => {
    const targetElementInstanceKey = `${MULTI_INSTANCE_CHILD_B_KEY}006`;
    let page2Requested = false;

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.pathname === `/v1/process-instances/${MULTI_INSTANCE_CHILD_B_KEY}/jobs` &&
        url.searchParams.get('page') === '2'
      ) {
        page2Requested = true;
      }
    });

    await page.goto(`/process-instances/${MULTI_INSTANCE_PARENT_KEY}?tab=history`);
    const devtools = await page.context().newCDPSession(page);
    await devtools.send('Network.enable');
    await devtools.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 300,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    const historyRow = page
      .getByTestId('history-table')
      .locator('tbody tr')
      .filter({ hasText: targetElementInstanceKey });
    await historyRow.getByRole('button', { name: /row actions/i }).click();
    await page.getByRole('menuitem', { name: /view related job/i }).click();

    const jobsTable = page.getByTestId('jobs-table');
    await expect.poll(() => page2Requested).toBe(true);
    await jobsTable.getByRole('combobox').click();
    await page.getByRole('option', { name: '5', exact: true }).click();

    await page.waitForTimeout(700);
    await expect(jobsTable.getByRole('button', { name: 'page 1' }))
      .toHaveAttribute('aria-current', 'page');
  });

  test('direct Jobs focus scans to page 2 and respects later manual navigation', async ({ page }) => {
    const firstJobKey = '7000000000000000001';
    const targetJobKey = '7000000000000000011';
    const targetElementInstanceKey = `${MULTI_INSTANCE_CHILD_B_KEY}006`;
    let page2RequestCount = 0;

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.pathname === `/v1/process-instances/${MULTI_INSTANCE_CHILD_B_KEY}/jobs` &&
        url.searchParams.get('page') === '2'
      ) {
        page2RequestCount++;
      }
    });

    await page.goto(
      `/process-instances/${MULTI_INSTANCE_PARENT_KEY}?tab=jobs&focusElementInstanceKey=${targetElementInstanceKey}`
    );

    const jobsTable = page.getByTestId('jobs-table');
    await expect(jobsTable).toBeVisible({ timeout: 10000 });
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        tab: url.searchParams.get('tab'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
      };
    }).toEqual({
      pathname: `/process-instances/${MULTI_INSTANCE_PARENT_KEY}`,
      tab: 'jobs',
      focusElementInstanceKey: targetElementInstanceKey,
    });

    const targetRow = jobsTable.locator('tbody tr').filter({ hasText: targetJobKey });
    await expect(jobsTable.getByRole('button', { name: /page 2/i }))
      .toHaveAttribute('aria-current', 'page');
    await expect(targetRow).toHaveAttribute('data-focused', 'true');
    expect(page2RequestCount).toBeGreaterThan(0);
    const requestCountAfterInitialScan = page2RequestCount;

    await jobsTable.getByRole('button', { name: /page 1/i }).click();
    await expect(
      jobsTable.locator('tbody tr').filter({ hasText: firstJobKey })
    ).toBeVisible();

    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByTestId('history-table')).toBeVisible();
    await page.getByRole('tab', { name: /Jobs/i }).click();
    await expect(jobsTable).toBeVisible();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        tab: url.searchParams.get('tab'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
      };
    }).toEqual({
      pathname: `/process-instances/${MULTI_INSTANCE_PARENT_KEY}`,
      tab: 'jobs',
      focusElementInstanceKey: targetElementInstanceKey,
    });

    await expect(jobsTable.getByRole('button', { name: 'page 1' }))
      .toHaveAttribute('aria-current', 'page');
    await expect(targetRow).toHaveCount(0);

    // Let tab/query effects settle before asserting that the focus scan did not restart.
    await page.waitForTimeout(500);
    expect(page2RequestCount).toBe(requestCountAfterInitialScan);
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

// Jobs-tab variable-cell coverage lives in jobs-input-output.spec.ts.

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
