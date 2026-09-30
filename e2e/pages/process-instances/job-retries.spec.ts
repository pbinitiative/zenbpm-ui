import { test, expect, type Locator, type Page, type Request } from '@playwright/test';
import {
  SIMPLE_TASK_ACTIVE_INSTANCE_KEY,
  SIMPLE_TASK_BACKOFF_INSTANCE_KEY,
  SIMPLE_TASK_BACKOFF_JOB_KEY,
  SIMPLE_TASK_FAILED_INSTANCE_KEY,
  SIMPLE_TASK_FAILED_JOB_KEY,
  SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY,
  SIMPLE_TASK_FAILED_JOB_EARLIER_INCIDENT_KEY,
} from '../../../src/mocks/data/well-known-keys';

// E2E coverage for job retries: the backoff and failed attempts in the Jobs
// table, Update Retries on an active job, Retry on a failed job (set retries,
// then resolve the incident), the failure history and the Fail job outcome.
test.describe('Process Instance Jobs - Retries', () => {
  test('shows the backoff and the failed attempts of a job waiting to be retried', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);

    const row = jobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY);
    await expect(row.getByTestId('job-retry-at')).toContainText('Retrying at');
    const retries = row.getByTestId('job-retries-cell');
    await expect(retries).toContainText('2');
    await expect(retries).toContainText('1 failed');
  });

  test('shows no backoff for an active job which never failed', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_ACTIVE_INSTANCE_KEY);

    await expect(page.getByTestId('jobs-table').getByTestId('job-retry-at')).toHaveCount(0);
  });

  test('offers Update Retries but not Retry for an active job', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);

    await openRowMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY);
    await expect(page.getByRole('menuitem', { name: /update retries/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /^retry$/i })).toHaveCount(0);
  });

  test('keeps the current backoff unless the operator chooses otherwise', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await expect(dialog.getByTestId('job-retries-last-failure')).toContainText('payment service unavailable');
    await expect(dialog.getByRole('radio', { name: /when the current backoff ends/i })).toBeChecked();
    await dialog.getByLabel('Retries left from now on').fill('5');

    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'retries');
    await dialog.getByRole('button', { name: 'Update' }).click();
    const body = (await request).postDataJSON() as { retries: number; retryAt?: string };

    expect(body.retries).toBe(5);
    expect(body.retryAt).toBeDefined();
    expect(Date.parse(body.retryAt ?? '')).toBeGreaterThan(Date.now());
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Retries updated successfully')).toBeVisible();
  });

  test('hands a job waiting out its backoff out at once when asked to', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await dialog.getByRole('radio', { name: /cutting the current backoff short/i }).check();

    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'retries');
    await dialog.getByRole('button', { name: 'Update' }).click();
    const body = (await request).postDataJSON() as { retries: number; retryAt?: string };

    expect(body.retries).toBe(2);
    expect(body.retryAt).toBeUndefined();
  });

  test('hands the job out after the chosen delay', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await chooseDelay(page, dialog, '2', 'Hours');

    const twoHours = 2 * 60 * 60 * 1000;
    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'retries');
    const clickedAt = Date.now();
    await dialog.getByRole('button', { name: 'Update' }).click();
    const body = (await request).postDataJSON() as { retries: number; retryAt?: string };
    const sentAt = Date.now();

    const retryAt = Date.parse(body.retryAt ?? '');
    expect(retryAt).toBeGreaterThanOrEqual(clickedAt + twoHours);
    expect(retryAt).toBeLessThanOrEqual(sentAt + twoHours);
  });

  test('refuses retries below one before sending them', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await dialog.getByLabel('Retries left from now on').fill('0');

    await expect(dialog.getByText('Enter a whole number of at least 1')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  test('shows the reason the engine refused the retries and keeps the dialog open', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    // The mock refuses retries above the engine default of jobs.maxRetries (100) as the engine does.
    await dialog.getByLabel('Retries left from now on').fill('150');
    await dialog.getByRole('button', { name: 'Update' }).click();

    await expect(dialog.getByTestId('job-retries-error')).toHaveText(
      `retries of job ${SIMPLE_TASK_BACKOFF_JOB_KEY} must be between 1 and 100 (jobs.maxRetries), got 150`
    );
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Retries updated successfully')).toHaveCount(0);
  });

  test('offers Retry but not Update Retries or Fail job for a failed job', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);

    await openRowMenu(page, SIMPLE_TASK_FAILED_JOB_KEY);
    await expect(page.getByRole('menuitem', { name: /^retry$/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /update retries/i })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /fail job/i })).toHaveCount(0);
  });

  test('retries a failed job by resolving its incident, which restores the retries of its task definition', async ({ page }) => {
    const retriesRequests: Request[] = [];
    page.on('request', (request) => {
      if (request.url().includes(`/jobs/${SIMPLE_TASK_FAILED_JOB_KEY}/retries`)) retriesRequests.push(request);
    });
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    await expect(dialog.getByRole('radio', { name: /resolve the incident only/i })).toBeChecked();
    await expect(dialog.getByTestId('job-retries-resolve-only-hint')).toContainText(
      'Retries set for this job since it failed are kept instead'
    );
    await expect(dialog.getByLabel('Retries left from now on')).toHaveCount(0);

    const resolve = waitForResolve(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await resolve;

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Job handed back to its workers')).toBeVisible();
    expect(retriesRequests).toHaveLength(0);
    // the task definition gives the job 3 retries, handed out at once
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '3', waiting: false });
  });

  test('retries a failed job with the retries the operator sets, then resolves its incident', async ({ page }) => {
    const order: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      if (request.url().includes(`/jobs/${SIMPLE_TASK_FAILED_JOB_KEY}/retries`)) order.push('retries');
      if (request.url().includes(`/incidents/${SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY}/resolve`)) order.push('resolve');
    });
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    await dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i }).check();
    await dialog.getByLabel('Retries left from now on').fill('7');
    await chooseDelay(page, dialog, '10', 'Minutes');

    const retries = waitForJobRequest(page, SIMPLE_TASK_FAILED_JOB_KEY, 'retries');
    await dialog.getByRole('button', { name: 'Retry' }).click();
    const body = (await retries).postDataJSON() as { retries: number; retryAt?: string };

    expect(body.retries).toBe(7);
    expect(Date.parse(body.retryAt ?? '')).toBeGreaterThan(Date.now());
    await expect(dialog).not.toBeVisible();
    expect(order).toEqual(['retries', 'resolve']);
    // the resolution keeps the operator's retries and the delivery still ahead
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '7', waiting: true });
  });

  test('only resolves the incident once retries were saved but the resolution failed', async ({ page }) => {
    const order: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      if (request.url().includes(`/jobs/${SIMPLE_TASK_FAILED_JOB_KEY}/retries`)) order.push('retries');
      if (request.url().includes(`/incidents/${SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY}/resolve`)) order.push('resolve');
    });
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY, 'resolveIncidentFailsOnce');
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    await dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i }).check();
    await dialog.getByLabel('Retries left from now on').fill('9');
    await chooseDelay(page, dialog, '10', 'Minutes');
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog.getByTestId('job-retries-error')).toContainText('The retries were set, but resolving the incident failed');
    const saved = dialog.getByTestId('job-retries-saved');
    await expect(saved).toContainText('9 retries were saved for this job, with its next delivery not before');
    // the summary shows the saved retries, not the 0 the failed job was opened with
    await expect(dialog.getByTestId('job-retries-summary')).toContainText('Retries left9');
    // the choice between the definition's and new retries is gone: resolving keeps the saved ones
    await expect(dialog.getByRole('radio', { name: /resolve the incident only/i })).toHaveCount(0);
    await expect(dialog.getByLabel('Retries left from now on')).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog).not.toBeVisible();
    expect(order).toEqual(['retries', 'resolve', 'resolve']);
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '9', waiting: true });
  });

  test('hands the job back and reports the error which followed a resolution that succeeded', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY, 'resolutionSavedThenInstanceFails');
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    const resolve = waitForResolve(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await resolve;

    await expect(dialog).not.toBeVisible();
    const warning = page.getByRole('alert').filter({ hasText: 'Job handed back to its workers: its incident is resolved' });
    await expect(warning).toContainText(
      `failed to resolve incident ${SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY}: failed to continue process instance`
    );
    await expect(warning).not.toContainText('client call to');
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '3', waiting: false });
  });

  test('does not claim the incident stayed open when an error followed the resolution of set retries', async ({ page }) => {
    const order: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      if (request.url().includes(`/jobs/${SIMPLE_TASK_FAILED_JOB_KEY}/retries`)) order.push('retries');
      if (request.url().includes(`/incidents/${SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY}/resolve`)) order.push('resolve');
    });
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY, 'resolutionSavedThenInstanceFails');
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);
    await dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i }).check();
    await dialog.getByLabel('Retries left from now on').fill('7');
    await chooseDelay(page, dialog, '10', 'Minutes');

    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Job handed back to its workers: its incident is resolved' })).toBeVisible();
    await expect(page.getByText('The retries were set, but resolving the incident failed')).toHaveCount(0);
    expect(order).toEqual(['retries', 'resolve']);
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '7', waiting: true });
  });

  test('keeps retries saved before when a reopened dialog only resolves the incident', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY, 'resolveIncidentFailsOnce');
    let dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);
    await dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i }).check();
    await dialog.getByLabel('Retries left from now on').fill('9');
    await chooseDelay(page, dialog, '10', 'Minutes');
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await expect(dialog.getByTestId('job-retries-saved')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).not.toBeVisible();

    dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);
    await expect(dialog.getByRole('radio', { name: /resolve the incident only/i })).toBeChecked();
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog).not.toBeVisible();
    // the engine keeps the retries set since the job failed, not the definition's 3
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '9', waiting: true });
  });

  test('lists the failures of a job newest first across its series of attempts', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /failure history/i);

    const rows = dialog.getByTestId('job-failures-table').locator('tbody tr');
    await expect(rows).toHaveCount(6);
    // attempts restart with the series which followed the earlier incident's resolution
    const attempts = await rows.evaluateAll((elements) =>
      elements.map((element) => element.querySelector('td')?.textContent?.trim())
    );
    expect(attempts).toEqual(['3', '2', '1', '3', '2', '1']);
    await expect(rows.nth(0)).toContainText(SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await expect(rows.nth(3)).toContainText(SIMPLE_TASK_FAILED_JOB_EARLIER_INCIDENT_KEY);
    await expect(rows.nth(2)).toContainText('Backoff until');
  });

  test('explains that a failure without an error code spends a retry and sends its message', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /fail job/i);

    await expect(dialog.getByTestId('fail-job-outcome')).toContainText('spends one attempt and leaves 1 retries');
    await expect(dialog.getByTestId('fail-job-outcome')).toContainText("not before that worker's lock lapses");
    await dialog.getByLabel('Error Code').fill('ORDER_FAILED');
    await expect(dialog.getByTestId('fail-job-outcome')).toContainText('throws a BPMN error');
    await dialog.getByLabel('Error Code').fill('');
    await dialog.getByLabel('Message').fill('payment service unavailable');

    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'fail');
    await dialog.getByRole('button', { name: /fail job/i }).click();
    const body = (await request).postDataJSON() as { errorCode?: string; message?: string };

    expect(body).toEqual({ message: 'payment service unavailable' });
  });

  test('spends a retry on a failure without an error code and shows it in a reopened failure history', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    // Opened twice, each time until its read completed, so that a completed
    // read is cached: the first mount's read is cancelled by the development
    // double mount and would not stay fresh.
    let history = page.getByRole('dialog');
    for (let open = 0; open < 2; open++) {
      const read = page.waitForResponse((response) =>
        response.url().includes(`/jobs/${SIMPLE_TASK_BACKOFF_JOB_KEY}/failures`)
      );
      history = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /failure history/i);
      await read;
      await expect(history.getByTestId('job-failures-table').locator('tbody tr')).toHaveCount(1);
      await history.getByRole('button', { name: 'Close' }).click();
      await expect(history).not.toBeVisible();
    }

    const fail = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /fail job/i);
    await fail.getByLabel('Message').fill('second failure');
    await fail.getByRole('button', { name: /fail job/i }).click();
    await expect(fail).not.toBeVisible();

    // the second entry of the policy PT30M,PT1H applies
    await expectJobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY, { state: 'Active', retries: '1', waiting: true });
    await expect(jobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY).getByTestId('job-retries-cell')).toContainText('2 failed');

    history = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /failure history/i);
    const rows = history.getByTestId('job-failures-table').locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('second failure');
  });

  test('fails the job with an incident linked to it when a failure exhausts its retries', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);

    for (const message of ['second failure', 'third failure']) {
      const fail = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /fail job/i);
      await fail.getByLabel('Message').fill(message);
      await fail.getByRole('button', { name: /fail job/i }).click();
      await expect(fail).not.toBeVisible();
    }

    await expectJobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY, { state: 'Failed', retries: '0', waiting: false });
    await openRowMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY);
    await expect(page.getByRole('menuitem', { name: /^retry$/i })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: /Incidents/i }).click();
    const incident = page
      .getByTestId('incidents-tab')
      .locator('tbody tr')
      .filter({ hasText: 'third failure' });
    await expect(incident.getByTestId('incident-job-link')).toHaveText(SIMPLE_TASK_BACKOFF_JOB_KEY);
  });

  test('updates the retries of an active job and hands it out at once', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await dialog.getByLabel('Retries left from now on').fill('5');
    await dialog.getByRole('radio', { name: /cutting the current backoff short/i }).check();
    await dialog.getByRole('button', { name: 'Update' }).click();

    await expect(dialog).not.toBeVisible();
    await expectJobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY, { state: 'Active', retries: '5', waiting: false });
  });

  test('refuses a delay beyond what a date can represent without a page error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await chooseDelay(page, dialog, '999999999999', 'Minutes');

    await expect(dialog.getByText('The delay is too long')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Update' })).toBeDisabled();
    expect(pageErrors).toEqual([]);
  });

  test('refuses retries beyond the API range before sending them', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);

    await dialog.getByLabel('Retries left from now on').fill('99999999999');

    await expect(
      dialog.getByText('Enter at most 2,147,483,647; the engine refuses more than jobs.maxRetries')
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  test('reads the failure history again on refresh', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /failure history/i);
    await expect(dialog.getByTestId('job-failures-table').locator('tbody tr')).toHaveCount(1);

    const refetch = page.waitForRequest(
      (request) => request.method() === 'GET' && request.url().includes(`/jobs/${SIMPLE_TASK_BACKOFF_JOB_KEY}/failures`)
    );
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    await refetch;
  });

  test('fails a job with the retries and backoff the operator names', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /fail job/i);

    await dialog.getByLabel('Retries left after this failure').fill('5');
    await expect(dialog.getByTestId('fail-job-outcome')).toContainText('leaves 5 retries');
    await dialog.getByLabel('Backoff').fill('P1Y');
    await expect(dialog.getByText('Enter an ISO-8601 duration in weeks, days, hours, minutes or seconds')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /fail job/i })).toBeDisabled();
    await dialog.getByLabel('Backoff').fill('P1D');

    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'fail');
    await dialog.getByRole('button', { name: /fail job/i }).click();
    const body = (await request).postDataJSON() as Record<string, unknown>;

    expect(body).toEqual({ retries: 5, retryBackoff: 'P1D' });
    await expectJobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY, { state: 'Active', retries: '5', waiting: true });
  });

  test('announces the incident when the named retries leave none', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /fail job/i);

    await dialog.getByLabel('Retries left after this failure').fill('0');

    await expect(dialog.getByTestId('fail-job-outcome')).toContainText('leaves no retries: the job fails with an incident');
  });

  test('leaves retries and history untouched by a BPMN error and sends no retry fields', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /fail job/i);

    await dialog.getByLabel('Retries left after this failure').fill('7');
    await dialog.getByLabel('Error Code').fill('ORDER_FAILED');
    // the engine ignores retries and backoff of a BPMN error, so the dialog stops offering them
    await expect(dialog.getByLabel('Retries left after this failure')).toHaveCount(0);

    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'fail');
    await dialog.getByRole('button', { name: /fail job/i }).click();
    const body = (await request).postDataJSON() as Record<string, unknown>;

    expect(body).toEqual({ errorCode: 'ORDER_FAILED' });
    await expect(dialog).not.toBeVisible();
    await expectJobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY, { state: 'Active', retries: '2', waiting: true });
    await expect(jobRow(page, SIMPLE_TASK_BACKOFF_JOB_KEY).getByTestId('job-retries-cell')).toContainText('1 failed');
    const history = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /failure history/i);
    await expect(history.getByTestId('job-failures-table').locator('tbody tr')).toHaveCount(1);
  });

  test('offers retries of its own when the retries of the task definition no longer evaluate', async ({ page }) => {
    const order: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      if (request.url().includes(`/jobs/${SIMPLE_TASK_FAILED_JOB_KEY}/retries`)) order.push('retries');
      if (request.url().includes(`/incidents/${SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY}/resolve`)) order.push('resolve');
    });
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY, 'definitionRetriesNotEvaluable');
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);
    await expect(dialog.getByRole('radio', { name: /resolve the incident only/i })).toBeChecked();

    await dialog.getByRole('button', { name: 'Retry' }).click();

    const error = dialog.getByTestId('job-retries-error');
    await expect(error).toContainText('the retries of the task definition no longer evaluate for this job');
    await expect(error).toContainText('Set the retries above, then retry');
    await expect(error).toContainText(`set the job's retries (POST /v1/jobs/${SIMPLE_TASK_FAILED_JOB_KEY}/retries)`);
    // the line naming the engine's transport is left out
    await expect(error).not.toContainText('client call to');
    // the dialog turns to the way out: retries of the operator's own
    await expect(dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i })).toBeChecked();
    await expect(dialog.getByLabel('Retries left from now on')).toBeVisible();
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Failed', retries: '0', waiting: false });

    await dialog.getByLabel('Retries left from now on').fill('4');
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog).not.toBeVisible();
    expect(order).toEqual(['resolve', 'retries', 'resolve']);
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '4', waiting: false });
  });

  test('offers retries of its own again when saved retries were used up before the refused resolution', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY, 'resolveIncidentFailsOnce,definitionRetriesNotEvaluable');
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);
    await dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i }).check();
    await dialog.getByLabel('Retries left from now on').fill('2');
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await expect(dialog.getByTestId('job-retries-saved')).toBeVisible();
    // Meanwhile somebody else resolves the incident, which keeps the saved
    // retries, and the job uses them up: a new incident, and the retries of
    // the task definition apply again.
    await page.evaluate(
      async ({ incidentKey, jobKey }) => {
        await fetch(`/v1/incidents/${incidentKey}/resolve`, { method: 'POST' });
        await fetch(`/v1/jobs/${jobKey}/fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'payment service down again', retries: 0 }),
        });
      },
      { incidentKey: SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY, jobKey: SIMPLE_TASK_FAILED_JOB_KEY }
    );

    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog.getByTestId('job-retries-error')).toContainText('no longer evaluate for this job');
    // the saved retries are gone, so the dialog offers to set them again
    await expect(dialog.getByTestId('job-retries-saved')).toHaveCount(0);
    await expect(dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i })).toBeChecked();
    await dialog.getByLabel('Retries left from now on').fill('4');
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog).not.toBeVisible();
    await expectJobRow(page, SIMPLE_TASK_FAILED_JOB_KEY, { state: 'Active', retries: '4', waiting: false });
  });

  test('tells why the engine refused to resolve an incident in the Incidents tab and leaves it open', async ({ page }) => {
    await page.clock.install();
    const row = await openIncidentRow(page, 'definitionRetriesNotEvaluable');

    const resolve = waitForResolve(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await row.getByRole('button', { name: 'Resolve' }).click();
    await resolve;

    const refusal = page.getByRole('alert').filter({ hasText: 'The incident was not resolved' });
    await expect(refusal).toContainText(`the retries of job ${SIMPLE_TASK_FAILED_JOB_KEY} no longer evaluate`);
    await expect(refusal).toContainText('open the job in the Jobs tab and retry it with retries of your own');
    await expect(refusal).not.toContainText('client call to');
    await expect(row.getByRole('button', { name: 'Resolve' })).toBeVisible();
    // the reason is long: it stays well beyond the usual few seconds, and a
    // click elsewhere does not close it either
    await page.clock.fastForward(60_000);
    await page.getByTestId('incidents-tab').click({ position: { x: 5, y: 5 } });
    // past the exit transition a closing message would still be in
    await page.clock.runFor(1_000);
    await expect(refusal).toBeVisible();
    await refusal.getByRole('button', { name: 'Close' }).click();
    await expect(refusal).toHaveCount(0);
  });

  test('tells why an incident is still open after its resolution failed', async ({ page }) => {
    const row = await openIncidentRow(page, 'resolveIncidentFailsOnce');

    await row.getByRole('button', { name: 'Resolve' }).click();

    const failure = page.getByRole('alert').filter({ hasText: 'The incident is still open' });
    await expect(failure).toContainText(
      `failed to resolve incident ${SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY}: failed to complete incident with key`
    );
    await expect(row.getByRole('button', { name: 'Resolve' })).toBeVisible();
  });

  test('stays silent about an error which followed a resolution that succeeded', async ({ page }) => {
    const row = await openIncidentRow(page, 'resolutionSavedThenInstanceFails');

    const resolve = waitForResolve(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await row.getByRole('button', { name: 'Resolve' }).click();
    await resolve;

    await expect(row).toContainText('Resolved');
    await expect(row.getByRole('button', { name: 'Resolve' })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('tells that the incident was resolved meanwhile instead of retrying', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    // another operator resolves the incident while the dialog is open
    await page.evaluate(async (incidentKey) => {
      await fetch(`/v1/incidents/${incidentKey}/resolve`, { method: 'POST' });
    }, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog.getByTestId('job-retries-error')).toHaveText(
      'The job has no open incident. It may have been resolved meanwhile.'
    );
    await expect(dialog).toBeVisible();
  });

  test('shows the reason the engine refused the retries of a failed job and resolves nothing', async ({ page }) => {
    const resolutions: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/resolve')) resolutions.push(request.url());
    });
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    await dialog.getByRole('radio', { name: /set the retries, then resolve the incident/i }).check();
    await dialog.getByLabel('Retries left from now on').fill('150');
    await dialog.getByRole('button', { name: 'Retry' }).click();

    await expect(dialog.getByTestId('job-retries-error')).toHaveText(
      `retries of job ${SIMPLE_TASK_FAILED_JOB_KEY} must be between 1 and 100 (jobs.maxRetries), got 150`
    );
    expect(resolutions).toEqual([]);
  });

  test('finds the incident of a failed job beyond the first page of unresolved incidents', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    // 120 unresolved incidents of other elements come first, pushing the job's to the second page
    await page.evaluate(async (processInstanceKey) => {
      // @ts-expect-error browser-only module URL
      const { incidents } = await import('/src/mocks/data/incidents.ts');
      const others = Array.from({ length: 120 }, (_, index) => ({
        key: `59000000000000${String(index).padStart(5, '0')}`,
        elementInstanceKey: `59100000000000${String(index).padStart(5, '0')}`,
        elementId: 'other-element',
        processInstanceKey,
        processDefinitionKey: '3000000000000000046',
        message: 'other incident',
        createdAt: new Date().toISOString(),
        executionToken: `token-other-${index}`,
      }));
      (incidents as unknown[]).unshift(...others);
    }, SIMPLE_TASK_FAILED_INSTANCE_KEY);
    const pages: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/incidents?') && request.url().includes('state=unresolved')) {
        pages.push(new URL(request.url()).searchParams.get('page') ?? '');
      }
    });
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_FAILED_JOB_KEY, /^retry$/i);

    const resolve = waitForResolve(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await dialog.getByRole('button', { name: 'Retry' }).click();
    await resolve;

    await expect(dialog).not.toBeVisible();
    expect(pages).toEqual(expect.arrayContaining(['1', '2']));
  });

  test('pages through a failure history longer than one page', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    await page.evaluate(async ({ jobKey, processInstanceKey }) => {
      // @ts-expect-error browser-only module URL
      const { jobFailures } = await import('/src/mocks/data/jobs.ts');
      for (let attempt = 1; attempt <= 12; attempt++) {
        (jobFailures as unknown[]).push({
          key: `5290000000000000${String(attempt).padStart(3, '0')}`,
          jobKey,
          processInstanceKey,
          attempt,
          failedAt: new Date(Date.now() - (13 - attempt) * 24 * 60 * 60 * 1000).toISOString(),
          message: `earlier failure ${attempt}`,
        });
      }
    }, { jobKey: SIMPLE_TASK_BACKOFF_JOB_KEY, processInstanceKey: SIMPLE_TASK_BACKOFF_INSTANCE_KEY });
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /failure history/i);
    const rows = dialog.getByTestId('job-failures-table').locator('tbody tr');
    await expect(rows).toHaveCount(10);

    const secondPage = page.waitForRequest((request) => request.url().includes('/failures?page=2'));
    await dialog.getByRole('button', { name: 'Go to next page' }).click();
    await secondPage;

    await expect(rows).toHaveCount(3);
    await expect(rows.last()).toContainText('earlier failure 1');
  });

  test('says so when the failure history cannot be read', async ({ page }) => {
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY, 'failureHistoryFails');
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /failure history/i);

    await expect(dialog.getByText('Failed to load the failure history')).toBeVisible({ timeout: 15000 });
  });

  test('drops the option to wait for a backoff which ends while the dialog is open', async ({ page }) => {
    await page.clock.install();
    await openJobsTab(page, SIMPLE_TASK_BACKOFF_INSTANCE_KEY);
    const dialog = await openDialogFromMenu(page, SIMPLE_TASK_BACKOFF_JOB_KEY, /update retries/i);
    await expect(dialog.getByRole('radio', { name: /when the current backoff ends/i })).toBeChecked();

    // the fixture's backoff ends 30 minutes after the page loaded
    await page.clock.fastForward('31:00');

    await expect(dialog.getByRole('radio', { name: /when the current backoff ends/i })).toHaveCount(0);
    await expect(dialog.getByRole('radio', { name: /^at once$/i })).toBeChecked();
    const request = waitForJobRequest(page, SIMPLE_TASK_BACKOFF_JOB_KEY, 'retries');
    await dialog.getByRole('button', { name: 'Update' }).click();
    const body = (await request).postDataJSON() as { retries: number; retryAt?: string };
    expect(body.retryAt).toBeUndefined();
  });
});

async function openJobsTab(page: Page, processInstanceKey: string, scenario?: string) {
  const query = scenario ? `?jobRetriesScenario=${scenario}` : '';
  await page.goto(`/process-instances/${processInstanceKey}${query}`);
  await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });
}

function jobRow(page: Page, jobKey: string) {
  return page.getByTestId('jobs-table').locator('tbody tr').filter({ hasText: jobKey });
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

async function chooseDelay(page: Page, dialog: Locator, amount: string, unit: 'Seconds' | 'Minutes' | 'Hours') {
  await dialog.getByRole('radio', { name: /after a delay/i }).check();
  await dialog.getByLabel('Delay', { exact: true }).fill(amount);
  await dialog.getByRole('combobox', { name: 'Delay unit' }).click();
  await page.getByRole('option', { name: unit }).click();
}

async function expectJobRow(
  page: Page,
  jobKey: string,
  expected: { state: string; retries: string; waiting: boolean }
) {
  const row = jobRow(page, jobKey);
  await expect(row.locator('td').filter({ hasText: new RegExp(`^${expected.state}`) })).toHaveCount(1);
  await expect(row.getByTestId('job-retries-cell').locator('p').first()).toHaveText(expected.retries);
  await expect(row.getByTestId('job-retry-at')).toHaveCount(expected.waiting ? 1 : 0);
}

async function openIncidentRow(page: Page, scenario: string) {
  await page.goto(`/process-instances/${SIMPLE_TASK_FAILED_INSTANCE_KEY}?tab=incidents&jobRetriesScenario=${scenario}`);
  const incidents = page.getByTestId('incidents-tab');
  await expect(incidents).toBeVisible({ timeout: 10000 });
  return incidents.locator('tbody tr').filter({ hasText: SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY });
}

function waitForResolve(page: Page, incidentKey: string) {
  return page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().includes(`/incidents/${incidentKey}/resolve`)
  );
}

function waitForJobRequest(page: Page, jobKey: string, action: 'retries' | 'fail') {
  return page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().includes(`/jobs/${jobKey}/${action}`)
  );
}
