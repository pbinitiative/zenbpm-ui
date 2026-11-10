import { test, expect, type Page } from '@playwright/test';
import {
  SIMPLE_TASK_ACTIVE_INSTANCE_KEY,
  SIMPLE_TASK_ACTIVE_JOB_KEY,
  SIMPLE_TASK_BACKOFF_INSTANCE_KEY,
  SIMPLE_TASK_BACKOFF_JOB_KEY,
  START_LISTENER_FAILED_INSTANCE_KEY,
  START_LISTENER_FAILED_JOB_INCIDENT_KEY,
  START_LISTENER_FAILED_JOB_KEY,
  START_LISTENER_WAITING_INSTANCE_KEY,
  START_LISTENER_WAITING_JOB_KEY,
} from '../../../src/mocks/data/well-known-keys';

// E2E coverage for the job of a start event's end execution listener: the
// engine marks it with `listenerEventType`, refuses a BPMN error for it and
// keeps the variables of its completion on the job only.
test.describe('Process Instance Jobs - Start event listener', () => {
  test('marks the job of a start event listener and no job of a task', async ({ page }) => {
    await openJobsTab(page, START_LISTENER_WAITING_INSTANCE_KEY);

    const chip = jobRow(page, START_LISTENER_WAITING_JOB_KEY).getByTestId('job-listener-chip');
    await expect(chip).toHaveText('End listener');
    await chip.hover();
    await expect(page.getByRole('tooltip')).toContainText('The token leaves the element when this job is completed');

    await openJobsTab(page, SIMPLE_TASK_ACTIVE_INSTANCE_KEY);
    await expect(jobRow(page, SIMPLE_TASK_ACTIVE_JOB_KEY)).toHaveCount(1);
    await expect(page.getByTestId('job-listener-chip')).toHaveCount(0);
  });

  test('completes a listener job without variables and says where to change them', async ({ page }) => {
    await openJobsTab(page, START_LISTENER_WAITING_INSTANCE_KEY);
    await jobRow(page, START_LISTENER_WAITING_JOB_KEY).getByRole('button', { name: 'Complete' }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByTestId('complete-job-listener-note')).toContainText('Variables tab');
    await expect(dialog.getByText('Variables (JSON)')).toHaveCount(0);

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
    await expect(dialog.getByText('Variables (JSON)')).toHaveCount(0);

    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/jobs/${START_LISTENER_WAITING_JOB_KEY}/complete`)
    );
    await dialog.getByRole('button', { name: 'Complete' }).click();
    expect((await request).postDataJSON()).toEqual({ variables: {} });
  });

  test('links the start event in the history to its listener job', async ({ page }) => {
    await page.goto(`/process-instances/${START_LISTENER_WAITING_INSTANCE_KEY}?tab=history`);
    const historyRow = page.getByTestId('history-table').locator('tbody tr').filter({ hasText: 'OrderReceived' });
    await historyRow.getByRole('button', { name: 'Row actions' }).click();
    await page.getByRole('menuitem', { name: 'View related job' }).click();

    await expect(page.getByTestId('jobs-table')).toBeVisible();
    await expect(jobRow(page, START_LISTENER_WAITING_JOB_KEY)).toHaveCount(1);
  });

  test('still offers variables when completing the job of a task', async ({ page }) => {
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
});

async function openJobsTab(page: Page, processInstanceKey: string) {
  await page.goto(`/process-instances/${processInstanceKey}`);
  await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });
}

function jobRow(page: Page, jobKey: string) {
  return page.getByTestId('jobs-table').locator('tbody tr').filter({ hasText: jobKey });
}

async function openDialogFromMenu(page: Page, jobKey: string, menuItem: RegExp) {
  const row = jobRow(page, jobKey);
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Row actions' }).click();
  await page.getByRole('menuitem', { name: menuItem }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}
