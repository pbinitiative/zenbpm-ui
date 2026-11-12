import { test, expect, type Page } from '@playwright/test';
import {
  SIMPLE_TASK_ACTIVE_INSTANCE_KEY,
  SIMPLE_TASK_ACTIVE_JOB_KEY,
  SIMPLE_TASK_FAILED_INSTANCE_KEY,
  SIMPLE_TASK_FAILED_JOB_KEY,
  SIMPLE_TASK_BACKOFF_INSTANCE_KEY,
  SIMPLE_TASK_BACKOFF_JOB_KEY,
  START_LISTENER_FAILED_INSTANCE_KEY,
  START_LISTENER_FAILED_JOB_INCIDENT_KEY,
  START_LISTENER_FAILED_JOB_KEY,
  START_LISTENER_WAITING_INSTANCE_KEY,
  START_LISTENER_WAITING_JOB_KEY,
  TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY,
  TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY,
  TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY,
  TASK_LISTENERS_ELEMENT_INCIDENT_KEY,
  TASK_LISTENERS_ELEMENT_INCIDENT_LISTENER_JOB_KEY,
  TASK_LISTENERS_END_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
  TASK_LISTENERS_START_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_USER_TASK_INSTANCE_KEY,
  TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY,
  TASK_LISTENERS_USER_TASK_OWN_JOB_KEY,
} from '../../../src/mocks/data/well-known-keys';

// E2E coverage for the jobs of execution listeners. The engine runs the start
// listeners of an element, then the element's own job, then its end listeners,
// one job at a time. All of them carry the element's id, type and element
// instance key; `listenerEventType` alone tells a listener's job from the
// element's own. The mock process `task-listeners` has a service task with two
// start and two end listeners and a user task with one start listener; the
// mock process `start-listener` has an end listener on its start event.
test.describe('Process Instance Jobs - Execution listeners', () => {
  test('marks start and end listener jobs with their own chip and tooltip, and no job of an element itself', async ({ page }) => {
    await openJobsTab(page, TASK_LISTENERS_END_LISTENER_INSTANCE_KEY);

    // the four jobs of the service task so far, all on the same element
    await expect(jobRows(page).filter({ hasText: 'ShipOrder' })).toHaveCount(4);

    for (const startListener of ['reserve-stock', 'check-credit']) {
      await expect(jobRowOfType(page, startListener).getByTestId('job-listener-chip')).toHaveText('Start listener');
    }
    await expect(jobRowOfType(page, 'notify-customer').getByTestId('job-listener-chip')).toHaveText('End listener');
    await expect(jobRowOfType(page, 'ship-order')).toHaveCount(1);
    await expect(jobRowOfType(page, 'ship-order').getByTestId('job-listener-chip')).toHaveCount(0);

    await jobRowOfType(page, 'reserve-stock').getByTestId('job-listener-chip').hover();
    await expect(page.getByRole('tooltip')).toContainText(
      "The element's own work begins once the jobs of all its start listeners are completed"
    );
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip')).toHaveCount(0);

    await jobRowOfType(page, 'notify-customer').getByTestId('job-listener-chip').hover();
    await expect(page.getByRole('tooltip')).toContainText(
      'The token leaves the element once the jobs of all its end listeners are completed'
    );
  });

  test('marks the job of a start event listener and no job of a task without listeners', async ({ page }) => {
    await openJobsTab(page, START_LISTENER_WAITING_INSTANCE_KEY);
    await expect(jobRow(page, START_LISTENER_WAITING_JOB_KEY).getByTestId('job-listener-chip')).toHaveText('End listener');

    await openJobsTab(page, SIMPLE_TASK_ACTIVE_INSTANCE_KEY);
    await expect(jobRow(page, SIMPLE_TASK_ACTIVE_JOB_KEY)).toHaveCount(1);
    await expect(page.getByTestId('job-listener-chip')).toHaveCount(0);
  });

  test("offers Assign for a user task's own job and not for the job of its start listener", async ({ page }) => {
    // While the start listener's job waits, the user task has no job of its own yet.
    await openJobsTab(page, TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY);
    await openRowMenu(page, TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY);
    await expect(page.getByRole('menuitem', { name: /update retries/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /assign/i })).toHaveCount(0);

    // Both jobs carry the element type USER_TASK; only the one without a listener event type is assigned.
    await openJobsTab(page, TASK_LISTENERS_USER_TASK_INSTANCE_KEY);
    await expect(jobRowOfType(page, 'prepare-confirmation').getByTestId('job-listener-chip')).toHaveText('Start listener');
    await openRowMenu(page, TASK_LISTENERS_USER_TASK_OWN_JOB_KEY);
    await expect(page.getByRole('menuitem', { name: /assign/i })).toBeVisible();
    await page.keyboard.press('Escape');

    await jobRowOfType(page, 'prepare-confirmation').getByRole('button', { name: 'Row actions' }).click();
    await expect(page.getByRole('menuitem', { name: /view in history/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /assign/i })).toHaveCount(0);
  });

  test('completes a start listener job with the variables entered and says that they stay in its element', async ({ page }) => {
    await openJobsTab(page, TASK_LISTENERS_START_LISTENER_INSTANCE_KEY);
    await jobRow(page, TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByTestId('complete-job-listener-note')).toContainText('stay local to the element');
    await expect(dialog.getByTestId('complete-job-listener-note')).toContainText("the element's own job receive them");
    await expect(dialog.getByText('Variables (JSON)')).toBeVisible();
    await enterVariables(page, '{"creditChecked": true}');

    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/jobs/${TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY}/complete`)
    );
    await dialog.getByRole('button', { name: 'Complete' }).click();

    expect((await request).postDataJSON()).toEqual({ variables: { creditChecked: true } });
    await expect(dialog).not.toBeVisible();
  });

  test('completes an end listener job with the variables entered and says that they never reach the instance', async ({ page }) => {
    await openJobsTab(page, TASK_LISTENERS_END_LISTENER_INSTANCE_KEY);
    await jobRow(page, TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByTestId('complete-job-listener-note')).toContainText('only the later end listeners of the element and never the instance');
    await expect(dialog.getByTestId('complete-job-listener-note')).toContainText('Variables tab');
    await expect(dialog.getByText('Variables (JSON)')).toBeVisible();
    await enterVariables(page, '{"notified": "by-mail"}');

    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/jobs/${TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY}/complete`)
    );
    await dialog.getByRole('button', { name: 'Complete' }).click();

    expect((await request).postDataJSON()).toEqual({ variables: { notified: 'by-mail' } });
    await expect(dialog).not.toBeVisible();
  });

  test('completes the listener job of a start event without variables when none are entered', async ({ page }) => {
    await openJobsTab(page, START_LISTENER_WAITING_INSTANCE_KEY);
    await jobRow(page, START_LISTENER_WAITING_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const dialog = page.getByRole('dialog');

    // a start event takes end listeners only
    await expect(dialog.getByTestId('complete-job-listener-note')).toContainText('never the instance');

    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/jobs/${START_LISTENER_WAITING_JOB_KEY}/complete`)
    );
    await dialog.getByRole('button', { name: 'Complete' }).click();

    expect((await request).postDataJSON()).toEqual({ variables: {} });
    await expect(dialog).not.toBeVisible();
  });

  test('opens no form for a ZEN_FORM the listener job inherits from its instance', async ({ page }) => {
    // The waiting listener job carries the instance's `ZEN_FORM`, which is no form schema.
    await openJobsTab(page, START_LISTENER_WAITING_INSTANCE_KEY);
    await jobRow(page, START_LISTENER_WAITING_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByRole('heading', { name: 'Complete Job' })).toBeVisible();
    await expect(dialog.getByTestId('complete-job-listener-note')).toBeVisible();
    await expect(dialog.getByText('Complete Form')).toHaveCount(0);
    await expect(dialog.getByText('does not contain a valid form schema')).toHaveCount(0);
    await expect(dialog.getByText('Variables (JSON)')).toBeVisible();
  });

  test("opens the form of a user task for the task's own job and not for the job of its start listener", async ({ page }) => {
    // Both jobs carry the `ZEN_FORM` of the user task's input mapping.
    await openJobsTab(page, TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY);
    await jobRow(page, TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const listenerDialog = page.getByRole('dialog');
    await expect(listenerDialog.getByRole('heading', { name: 'Complete Job' })).toBeVisible();
    await expect(listenerDialog.getByTestId('complete-job-listener-note')).toContainText('stay local to the element');
    await expect(listenerDialog.getByText('Complete Form')).toHaveCount(0);

    await openJobsTab(page, TASK_LISTENERS_USER_TASK_INSTANCE_KEY);
    await jobRow(page, TASK_LISTENERS_USER_TASK_OWN_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByRole('dialog', { name: /complete form/i })).toBeVisible();
  });

  test('links an incident to exactly the failed listener job among the jobs of its element', async ({ page }) => {
    await page.goto(`/process-instances/${TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY}?tab=incidents`);
    await expect(page.getByTestId('incidents-tab')).toBeVisible({ timeout: 10000 });

    await page
      .getByTestId('incidents-tab')
      .locator('tbody tr')
      .filter({ hasText: TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY })
      .getByTestId('incident-job-link')
      .click();

    // the element instance alone would name all four jobs of the service task
    await expect.poll(() => focusOf(page)).toEqual({
      tab: 'jobs',
      focusElementInstanceKey: `${TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY}002`,
      focusJobKey: TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
    });
    await expect(jobRows(page).filter({ hasText: 'ShipOrder' })).toHaveCount(4);
    await expect(jobRow(page, TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY)).toHaveAttribute('data-focused', 'true');
    await expect(page.getByTestId('jobs-table').locator('tbody tr[data-focused="true"]')).toHaveCount(1);

    // going on to the history focuses the element again, not one of its jobs
    await openRowMenu(page, TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY);
    await page.getByRole('menuitem', { name: 'View in history' }).click();
    await expect.poll(() => focusOf(page)).toEqual({
      tab: 'history',
      focusElementInstanceKey: `${TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY}002`,
      focusJobKey: null,
    });
  });

  test('focuses every job of an element from its row in the history', async ({ page }) => {
    await page.goto(`/process-instances/${TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY}?tab=history`);
    const historyRow = page.getByTestId('history-table').locator('tbody tr').filter({ hasText: 'ShipOrder' });
    await historyRow.getByRole('button', { name: 'Row actions' }).click();
    await page.getByRole('menuitem', { name: 'View related job' }).click();

    await expect.poll(() => focusOf(page)).toEqual({
      tab: 'jobs',
      focusElementInstanceKey: `${TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY}002`,
      focusJobKey: null,
    });
    // two start listeners, the task's own job and the failed end listener
    await expect(page.getByTestId('jobs-table').locator('tbody tr[data-focused="true"]')).toHaveCount(4);
  });

  test('links the start event in the history to its listener job', async ({ page }) => {
    await page.goto(`/process-instances/${START_LISTENER_WAITING_INSTANCE_KEY}?tab=history`);
    const historyRow = page.getByTestId('history-table').locator('tbody tr').filter({ hasText: 'OrderReceived' });
    await historyRow.getByRole('button', { name: 'Row actions' }).click();
    await page.getByRole('menuitem', { name: 'View related job' }).click();

    await expect(page.getByTestId('jobs-table')).toBeVisible();
    await expect(jobRow(page, START_LISTENER_WAITING_JOB_KEY)).toHaveCount(1);
  });

  test('offers variables without a note when completing the job of an element', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    await jobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Variables (JSON)')).toBeVisible();
    await expect(dialog.getByTestId('complete-job-listener-note')).toHaveCount(0);
  });

  test('fails a listener job without an error code, which spends a retry', async ({ page }) => {
    await openJobsTab(page, START_LISTENER_WAITING_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, START_LISTENER_WAITING_JOB_KEY, /fail job/i);

    await expect(dialog.getByTestId('fail-job-listener-note')).toContainText('cannot throw a BPMN error');
    await expect(dialog.getByLabel('Error Code')).toHaveCount(0);
    await expect(dialog.getByTestId('fail-job-outcome')).toContainText('spends one attempt and leaves 2 retries');
    await dialog.getByLabel('Message').fill('order service unavailable');

    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/jobs/${START_LISTENER_WAITING_JOB_KEY}/fail`)
    );
    await dialog.getByRole('button', { name: /fail job/i }).click();

    expect((await request).postDataJSON()).toEqual({ message: 'order service unavailable' });
    await expect(dialog).not.toBeVisible();
    await expect(jobRow(page, START_LISTENER_WAITING_JOB_KEY).getByTestId('job-retries-cell')).toContainText('1 failed');
  });

  test('retries a failed listener job by resolving the incident on its start event', async ({ page }) => {
    await openJobsTab(page, START_LISTENER_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, START_LISTENER_FAILED_JOB_KEY, /^retry$/i);

    const resolve = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/incidents/${START_LISTENER_FAILED_JOB_INCIDENT_KEY}/resolve`)
    );
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await resolve;
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Job handed back to its workers')).toBeVisible();
    // the listener's retries="3" come back with the resolution
    await expect(jobRow(page, START_LISTENER_FAILED_JOB_KEY).getByTestId('job-retries-cell').locator('p').first()).toHaveText('3');
  });

  test('retries a failed listener job of a task with the retries of its listener, and names the listener', async ({ page }) => {
    await openJobsTab(page, TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY, /^retry$/i);

    await expect(dialog.getByTestId('job-retries-resolve-only-hint')).toContainText('restores the retries of the listener');

    const resolve = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/incidents/${TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY}/resolve`)
    );
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await resolve;
    await expect(dialog).not.toBeVisible();
    // the listener's retries="2", not the one retry of the task's own job
    await expect(
      jobRow(page, TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY).getByTestId('job-retries-cell').locator('p').first()
    ).toHaveText('2');
  });

  test('names the task definition for the retries of an element\'s own job', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    await expect(dialog.getByTestId('job-retries-resolve-only-hint')).toContainText('restores the retries of the task definition');
  });

  test('says where the backoff of a failure comes from: the listener for its job, the task definition otherwise', async ({ page }) => {
    await openJobsTab(page, TASK_LISTENERS_END_LISTENER_INSTANCE_KEY);
    const listenerDialog = await openDialogFromMenu(page, TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY, /fail job/i);
    await expect(listenerDialog.getByText("overriding the listener's backoff")).toBeVisible();

    await openJobsTab(page, SIMPLE_TASK_ACTIVE_INSTANCE_KEY);
    const taskDialog = await openDialogFromMenu(page, SIMPLE_TASK_ACTIVE_JOB_KEY, /fail job/i);
    await expect(taskDialog.getByText("overriding the task definition's backoff")).toBeVisible();
  });

  test('takes no incident of the element itself for the incident of a listener job', async ({ page }) => {
    // The only open incident on the service task names no job. Resolving it would not hand the listener's job out.
    let resolved = false;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes(`/incidents/${TASK_LISTENERS_ELEMENT_INCIDENT_KEY}/resolve`)) {
        resolved = true;
      }
    });
    await openJobsTab(page, TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, TASK_LISTENERS_ELEMENT_INCIDENT_LISTENER_JOB_KEY, /^retry$/i);

    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog.getByTestId('job-retries-error')).toContainText('The job has no open incident');
    expect(resolved, 'the incident of the element').toBe(false);
  });
});

async function openJobsTab(page: Page, processInstanceKey: string) {
  await page.goto(`/process-instances/${processInstanceKey}`);
  await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });
}

function jobRows(page: Page) {
  return page.getByTestId('jobs-table').locator('tbody tr');
}

function jobRow(page: Page, jobKey: string) {
  return jobRows(page).filter({ hasText: jobKey });
}

// What the URL says the page is focused on.
function focusOf(page: Page) {
  const url = new URL(page.url());
  return {
    tab: url.searchParams.get('tab'),
    focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
    focusJobKey: url.searchParams.get('focusJobKey'),
  };
}

// The jobs of one element share its id and name, so a row is told by its job type.
function jobRowOfType(page: Page, jobType: string) {
  return jobRows(page).filter({ has: page.getByText(jobType, { exact: true }) });
}

// Replaces the content of the variables editor of the open dialog.
async function enterVariables(page: Page, json: string) {
  await page.getByRole('dialog').locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  // inserted in one piece, so that the editor closes no bracket or quote of its own
  await page.keyboard.insertText(json);
}

async function openRowMenu(page: Page, jobKey: string) {
  const row = jobRow(page, jobKey);
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Row actions' }).click();
}

async function openDialogFromMenu(page: Page, jobKey: string, menuItem: RegExp) {
  await openRowMenu(page, jobKey);
  await page.getByRole('menuitem', { name: menuItem }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}
