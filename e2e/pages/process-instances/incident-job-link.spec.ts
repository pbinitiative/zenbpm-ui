import { test, expect, type Page } from '@playwright/test';
import {
  SIMPLE_TASK_ACTIVE_INSTANCE_KEY,
  SIMPLE_TASK_FAILED_INSTANCE_KEY,
  SIMPLE_TASK_FAILED_JOB_KEY,
  SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY,
} from '../../../src/mocks/data/well-known-keys';

// E2E coverage for the link from an incident to the job which raised it: the
// Job column and the incident detail modal open the Jobs tab focused on the job.
test.describe('Process Instance Incidents - Job link', () => {
  const jobElementInstanceKey = `${SIMPLE_TASK_FAILED_INSTANCE_KEY}002`;

  test('shows the key of the job which raised an incident', async ({ page }) => {
    await openIncidentsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);

    const row = incidentRow(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY);
    await expect(row.getByTestId('incident-job-link')).toHaveText(SIMPLE_TASK_FAILED_JOB_KEY);
  });

  test('opens the Jobs tab focused on the job from the Job column', async ({ page }) => {
    await openIncidentsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);

    await incidentRow(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY).getByTestId('incident-job-link').click();

    await expectJobFocused(page);
  });

  test('opens the Jobs tab focused on the job from the incident details', async ({ page }) => {
    await openIncidentsTab(page, SIMPLE_TASK_FAILED_INSTANCE_KEY);

    await incidentRow(page, SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY).getByTitle('View Details').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('incident-detail-job-link').click();

    await expect(dialog).not.toBeVisible();
    await expectJobFocused(page);
  });

  test('shows no job link for an incident no job raised', async ({ page }) => {
    await openIncidentsTab(page, SIMPLE_TASK_ACTIVE_INSTANCE_KEY);

    const rows = page.getByTestId('incidents-tab').locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    await expect(page.getByTestId('incidents-tab').getByTestId('incident-job-link')).toHaveCount(0);

    await rows.first().getByTitle('View Details').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('incident-detail-job-link')).toHaveCount(0);
    await expect(dialog.getByText('Job', { exact: true })).toHaveCount(0);
  });

  async function expectJobFocused(page: Page) {
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        tab: url.searchParams.get('tab'),
        focusElementInstanceKey: url.searchParams.get('focusElementInstanceKey'),
      };
    }).toEqual({ tab: 'jobs', focusElementInstanceKey: jobElementInstanceKey });

    const jobRow = page.getByTestId('jobs-table').locator('tbody tr').filter({ hasText: SIMPLE_TASK_FAILED_JOB_KEY });
    await expect(jobRow).toHaveAttribute('data-focused', 'true');
  }
});

async function openIncidentsTab(page: Page, processInstanceKey: string) {
  await page.goto(`/process-instances/${processInstanceKey}?tab=incidents`);
  await expect(page.getByTestId('incidents-tab')).toBeVisible({ timeout: 10000 });
}

function incidentRow(page: Page, incidentKey: string) {
  return page.getByTestId('incidents-tab').locator('tbody tr').filter({ hasText: incidentKey });
}
