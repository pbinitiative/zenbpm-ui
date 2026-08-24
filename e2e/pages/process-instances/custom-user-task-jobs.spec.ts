import { test, expect, type Page } from '@playwright/test';
import {
  SIMPLE_USER_TASK_CUSTOM_TYPE_INSTANCE_KEY,
  USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY,
  SIMPLE_TASK_ACTIVE_INSTANCE_KEY,
} from '../../../src/mocks/data/well-known-keys';

const ASSIGN_LABEL = /assign/i;
const UPDATE_RETRIES_LABEL = /update retries/i;

async function openRowMenu(page: Page, rowMatcher: (row: ReturnType<Page['locator']>) => ReturnType<Page['locator']>) {
  const row = rowMatcher(page.getByTestId('jobs-table').locator('tbody tr'));
  await expect(row).toHaveCount(1);
  await row
    .locator('button')
    .filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') })
    .first()
    .click();
}

test.describe('Custom-typed User Task Jobs', () => {
  test('shows Assign for a custom-typed user task on the simple-user-task instance', async ({ page }) => {
    await page.goto(`/process-instances/${SIMPLE_USER_TASK_CUSTOM_TYPE_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // The Job Type column shows the configurable worker-routing type, so this
    // custom-typed User Task renders as "approval" (not "user-task-type").
    const row = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: 'user-task' });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('approval', { exact: true })).toBeVisible();

    await openRowMenu(page, (rows) => rows.filter({ hasText: 'user-task' }));
    await expect(page.getByRole('menuitem', { name: ASSIGN_LABEL })).toBeVisible();
  });

  test('loads the newly selected instance when navigation supersedes an active request', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((path) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, `/process-instances/${USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY}`);
    await page.waitForTimeout(500);
    await page.evaluate((path) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, `/process-instances/${SIMPLE_USER_TASK_CUSTOM_TYPE_INSTANCE_KEY}`);

    await expect(page).toHaveURL(new RegExp(`/process-instances/${SIMPLE_USER_TASK_CUSTOM_TYPE_INSTANCE_KEY}$`));
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });
    const row = page.getByTestId('jobs-table').locator('tbody tr').filter({ hasText: 'user-task' });
    await expect(row.getByText('approval', { exact: true })).toBeVisible();
  });

  test('hides Assign for an active non-User Task service job', async ({ page }) => {
    await page.goto(`/process-instances/${SIMPLE_TASK_ACTIVE_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // The active service job is elementName "Test" (TestType).
    await openRowMenu(page, (rows) => rows.filter({ hasText: 'Test' }));
    await expect(page.getByRole('menuitem', { name: ASSIGN_LABEL })).toHaveCount(0);
  });

  test('hides Assign for a sectioned child job whose element id collides with a User Task', async ({ page }) => {
    await page.goto(`/process-instances/${USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // There should be a section header for the child instance, identified by its key.
    const sectionHeader = page
      .getByTestId('section-header')
      .filter({ hasText: '3100000000000000301' });
    await expect(sectionHeader).toBeVisible();

    // The child job reuses the element id `shared-task` (a User Task in the parent
    // process). It must NOT expose Assign because the job is a service task in the
    // child's own BPMN definition (its elementType is SERVICE_TASK), even though
    // the routing type is the legacy-looking `user-task-type` string.
    const sectionedChildRow = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: 'shared-task' })
      .filter({ has: page.locator('td', { hasText: 'user-task-type' }) });
    expect(await sectionedChildRow.count()).toBe(1);
    await sectionedChildRow
      .locator('button')
      .filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') })
      .first()
      .click();
    await expect(page.getByRole('menuitem', { name: ASSIGN_LABEL })).toHaveCount(0);
  });

  test('keeps Update Retries visible for an active non-User Task', async ({ page }) => {
    await page.goto(`/process-instances/${USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    const allRows = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: 'custom-typed-service' });
    expect(await allRows.count()).toBe(2);
    // Pick the active (non-completed) one — the state cell renders as "Active".
    const activeRow = allRows.filter({
      has: page.locator('td', { hasText: /^Active$/ }),
    });
    expect(await activeRow.count()).toBe(1);
    await activeRow
      .locator('button')
      .filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') })
      .first()
      .click();
    await expect(page.getByRole('menuitem', { name: UPDATE_RETRIES_LABEL })).toBeVisible();
  });

  test('keeps Update Retries visible for an inactive custom-typed User Task', async ({ page }) => {
    await page.goto(`/process-instances/${USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // The parent User Task (shared-task) is in 'completed' state in the fixture.
    const row = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: 'shared-task' })
      .filter({ has: page.locator('td', { hasText: 'approval' }) });
    expect(await row.count()).toBe(1);
    await row
      .locator('button')
      .filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') })
      .first()
      .click();
    await expect(page.getByRole('menuitem', { name: UPDATE_RETRIES_LABEL })).toBeVisible();
  });

  test('hides Update Retries for an inactive non-User Task', async ({ page }) => {
    await page.goto(`/process-instances/${USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // The inactive service job deliberately uses `user-task-type`; it still
    // must NOT receive User Task-only Update Retries behavior.
    const allRows = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: 'custom-typed-service' });
    expect(await allRows.count()).toBe(2);
    const completedRow = allRows.filter({
      has: page.locator('td', { hasText: /^Completed$/ }),
    });
    expect(await completedRow.count()).toBe(1);
    await completedRow
      .locator('button')
      .filter({ has: page.locator('svg[data-testid="MoreVertIcon"]') })
      .first()
      .click();
    await expect(page.getByRole('menuitem', { name: UPDATE_RETRIES_LABEL })).toHaveCount(0);
  });

  test('keeps Assign visible for a child User Task classified by its own definition', async ({ page }) => {
    await page.goto(`/process-instances/${USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // The child instance (3100000000000000302) uses the simple-user-task
    // definition, which actually contains a `bpmn:userTask id="user-task"`.
    // Classification must follow the child definition, so its job must be
    // treated as a User Task and Assign must remain available — even though
    // the loaded/root definition is the classification tree.
    const sectionHeader = page
      .getByTestId('section-header')
      .filter({ hasText: '3100000000000000302' });
    await expect(sectionHeader).toBeVisible();

    await openRowMenu(
      page,
      (rows) =>
        rows
          .filter({ hasText: 'user-task' })
          .filter({ has: page.locator('td', { hasText: 'approval' }) }),
    );
    await expect(page.getByRole('menuitem', { name: ASSIGN_LABEL })).toBeVisible();
  });

  // Regression test for the acceptance criterion that custom-typed User Tasks
  // (configurable worker-routing type, e.g. `approval`) must continue to be
  // completable through the Zen Form dialog. The dialog selection is driven
  // solely by a truthy `inputVariables.ZEN_FORM` and is independent of the
  // job's worker-routing type. Submitting the form must propagate the form
  // values (initial vars + submitted fields) to POST /jobs/{jobKey}/complete.
  test('completes a custom-typed User Task with a Zen Form via the form dialog and propagates submitted values', async ({ page }) => {
    await page.goto(`/process-instances/${SIMPLE_USER_TASK_CUSTOM_TYPE_INSTANCE_KEY}`);
    await expect(page.getByTestId('jobs-table')).toBeVisible({ timeout: 10000 });

    // The custom-typed User Task row (type 'approval') is the only row, and
    // its job carries a ZEN_FORM in inputVariables — see simple-user-task.ts.
    const row = page
      .getByTestId('jobs-table')
      .locator('tbody tr')
      .filter({ hasText: 'user-task' });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('approval', { exact: true })).toBeVisible();

    // Click the inline Complete button. The dialog selection (form vs. JSON
    // editor) is driven solely by a truthy `inputVariables.ZEN_FORM`, so the
    // form-based dialog must open even though the routing type is custom.
    await row.getByRole('button', { name: /^Complete$/ }).click();

    // The form-based dialog is identified by its title — distinct from the
    // generic JSON editor dialog used for non-form jobs.
    const dialog = page.getByRole('dialog', { name: /complete form/i });
    await expect(dialog).toBeVisible();

    // The form schema declares a single 'Approved' checkbox; the generic
    // JSON editor (Monaco) must NOT be rendered.
    const approvedField = dialog.locator('.fjs-form-field', { hasText: 'Approved' });
    await expect(approvedField).toBeVisible();
    await expect(approvedField.getByRole('checkbox')).toBeVisible();
    await expect(dialog.locator('.monaco-editor')).toHaveCount(0);

    // Tick the checkbox, then submit and capture the request to verify
    // that the form's values (initial vars + submitted field) reach the API.
    await approvedField.getByRole('checkbox').check();

    const responsePromise = page.waitForResponse(
      (res) =>
        /\/jobs\/[^/]+\/complete$/.test(res.url()) && res.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: /^Complete$/ }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // The body must contain the freshly submitted checkbox value. The form
    // schema only declares the 'Approved' checkbox — fields defined outside
    // the schema (assignee, taskTitle) are pre-populated as initial data but
    // are NOT re-submitted by form-js. ZEN_FORM must NOT leak into the
    // submission either way.
    const requestBody = JSON.parse(response.request().postData() ?? '{}');
    expect(requestBody).toEqual({
      variables: {
        approved: true,
      },
    });

    // Dialog closes and the success snackbar appears.
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Job completed successfully')).toBeVisible();
  });
});
