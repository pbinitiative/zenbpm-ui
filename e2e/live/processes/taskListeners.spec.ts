import { expect, test, type Locator, type Page, type Response } from '@playwright/test';
import JSONBigInt from 'json-bigint';
import { appendTaskToNewProcess, changeElement, downloadBpmnXml } from '../helpers/processDesigner.ts';
import { fillEntry, openGroup } from '../helpers/propertiesPanel.ts';
import { addListener } from '../helpers/executionListeners.ts';
import { deployProcess, expectDeploymentSaved } from '../helpers/processDeployment.ts';
import { startProcessInstance } from '../helpers/bmpStartInstance.ts';

const TASK_ID = 'Task_with_listeners';
const START_LISTENER_TYPE = 'e2e-listener-before-task';
const TASK_TYPE = 'e2e-listener-task';
const END_LISTENER_TYPE = 'e2e-listener-after-task';
const parseWithKeys = JSONBigInt({ storeAsString: true });

interface EngineJob {
  key: string;
  type: string;
  state: string;
  elementId: string;
  elementType: string;
  elementInstanceKey: string;
  listenerEventType?: string;
  inputVariables?: Record<string, unknown>;
}

// The engine runs the jobs of an element with execution listeners one at a
// time: its start listeners, the element's own job, its end listeners. Each
// is created when the one before it is completed, and all of them carry the
// id, the type and the element instance key of the element.
test('a service task runs its start listener, its own job and its end listener, one job at a time', async ({ page }) => {
  await appendTaskToNewProcess(page, TASK_ID);
  await changeElement(page, 'Service task');
  await openGroup(page, 'zenbpm-taskDefinition');
  await fillEntry(page, 'zenbpm-taskDef-type', TASK_TYPE);
  await addListener(page, TASK_ID, { eventType: 'start', type: START_LISTENER_TYPE });
  await addListener(page, TASK_ID, { eventType: 'end', type: END_LISTENER_TYPE });
  const instanceKey = await deployAndStart(page);

  // the start listener's job stands alone: the task's own job does not exist yet
  const startListener = await waitForJobRow(page, START_LISTENER_TYPE);
  await expect(startListener.getByTestId('job-listener-chip')).toHaveText('Start listener');
  await expect(startListener.getByText('Active', { exact: true })).toBeVisible();
  await expect(jobRows(page)).toHaveCount(1);

  // what a start listener is completed with stays in the element, where the task's own job sees it
  await startListener.getByRole('button', { name: 'Complete' }).click();
  const startDialog = page.getByRole('dialog');
  await expect(startDialog.getByTestId('complete-job-listener-note')).toContainText('stay local to the element');
  await enterVariables(page, '{"reservedBy": "the start listener"}');
  await complete(page, startDialog);

  const ownJob = await waitForJobRow(page, TASK_TYPE);
  await expect(ownJob.getByTestId('job-listener-chip')).toHaveCount(0);
  await expect(jobRows(page)).toHaveCount(2);
  const jobsSoFar = await jobsOf(page, instanceKey);
  expect(jobsSoFar.find((job) => job.type === TASK_TYPE)?.inputVariables).toMatchObject({ reservedBy: 'the start listener' });
  expect(await instanceVariables(page, instanceKey), 'no output mapping names the variable').not.toHaveProperty('reservedBy');

  await ownJob.getByRole('button', { name: 'Complete' }).click();
  const ownDialog = page.getByRole('dialog');
  await expect(ownDialog.getByRole('heading', { name: 'Complete Job' })).toBeVisible();
  await expect(ownDialog.getByTestId('complete-job-listener-note')).toHaveCount(0);
  await complete(page, ownDialog);

  const endListener = await waitForJobRow(page, END_LISTENER_TYPE);
  await expect(endListener.getByTestId('job-listener-chip')).toHaveText('End listener');
  await expect(jobRows(page)).toHaveCount(3);
  // the three jobs belong to one element instance, and only the listeners' name an event type
  const jobs = await jobsOf(page, instanceKey);
  expect(new Set(jobs.map((job) => job.elementInstanceKey)).size).toBe(1);
  expect(jobs.map((job) => [job.type, job.elementId, job.elementType, job.listenerEventType ?? null]).sort()).toEqual([
    [END_LISTENER_TYPE, TASK_ID, 'SERVICE_TASK', 'end'],
    [START_LISTENER_TYPE, TASK_ID, 'SERVICE_TASK', 'start'],
    [TASK_TYPE, TASK_ID, 'SERVICE_TASK', null],
  ].sort());
  // the token is still in the task: the instance ends only behind its end listener
  expect(await instanceState(page, instanceKey)).toBe('active');

  await endListener.getByRole('button', { name: 'Complete' }).click();
  const endDialog = page.getByRole('dialog');
  await expect(endDialog.getByTestId('complete-job-listener-note')).toContainText('never the instance');
  await complete(page, endDialog);

  await expect.poll(async () => instanceState(page, instanceKey), { timeout: 15_000 }).toBe('completed');
});

// The job of a listener on a user task carries the element type USER_TASK, as
// the user task's own job does. Nobody is assigned to a listener's job.
test("a user task offers Assign for its own job and not for the job of its start listener", async ({ page }) => {
  await appendTaskToNewProcess(page, TASK_ID);
  await changeElement(page, 'User task');
  await addListener(page, TASK_ID, { eventType: 'start', type: START_LISTENER_TYPE });
  const instanceKey = await deployAndStart(page);

  const listener = await waitForJobRow(page, START_LISTENER_TYPE);
  await expect(listener.getByTestId('job-listener-chip')).toHaveText('Start listener');
  expect((await jobsOf(page, instanceKey)).map((job) => [job.elementType, job.listenerEventType])).toEqual([['USER_TASK', 'start']]);
  await listener.getByRole('button', { name: 'Row actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Update Retries' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Assign' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await listener.getByRole('button', { name: 'Complete' }).click();
  await complete(page, page.getByRole('dialog'));

  // the user task's own job, created once its start listener is done
  await waitForJobRow(page, START_LISTENER_TYPE, 'Completed');
  const ownJob = jobRows(page).filter({ hasNot: page.getByTestId('job-listener-chip') });
  await expect(ownJob).toHaveCount(1);
  await ownJob.getByRole('button', { name: 'Row actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Assign' })).toBeVisible();
});

async function deployAndStart(page: Page): Promise<string> {
  const xml = await downloadBpmnXml(page);
  const deployment = await deployProcess(page);
  await expectDeploymentSaved(page, deployment, xml);
  const { processDefinitionKey } = parseWithKeys.parse(await deployment.text()) as { processDefinitionKey: string };

  await page.goto(`/process-definitions/${processDefinitionKey}`);
  const [created] = await Promise.all([
    page.waitForResponse((response: Response) => new URL(response.url()).pathname === '/v1/process-instances'
      && response.request().method() === 'POST'),
    startProcessInstance(page),
  ]);
  expect(created.ok(), `Start returned ${created.status()}`).toBe(true);
  const { key } = parseWithKeys.parse(await created.text()) as { key: string };
  await page.goto(`/process-instances/${key}`);
  return String(key);
}

function jobRows(page: Page): Locator {
  return page.getByTestId('jobs-table').locator('tbody tr');
}

// The engine creates the next job of an element behind the completion of the
// one before it, so the row is looked for until the page shows it.
async function waitForJobRow(page: Page, jobType: string, state = 'Active'): Promise<Locator> {
  const row = jobRows(page).filter({ has: page.getByText(jobType, { exact: true }) });
  await expect(async () => {
    await page.reload();
    await expect(row.getByText(state, { exact: true })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  return row;
}

// Replaces the content of the variables editor of the open dialog.
async function enterVariables(page: Page, json: string): Promise<void> {
  await page.getByRole('dialog').locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  // inserted in one piece, so that the editor closes no bracket or quote of its own
  await page.keyboard.insertText(json);
}

async function complete(page: Page, dialog: Locator): Promise<void> {
  const completion = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/complete'),
  );
  await dialog.getByRole('button', { name: 'Complete' }).click();
  expect((await completion).ok()).toBe(true);
  await expect(dialog).not.toBeVisible();
}

async function jobsOf(page: Page, instanceKey: string): Promise<EngineJob[]> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}/jobs`);
  const { items } = parseWithKeys.parse(await response.text()) as { items?: EngineJob[] };
  return items ?? [];
}

async function instanceState(page: Page, instanceKey: string): Promise<string> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}`);
  const instance = parseWithKeys.parse(await response.text()) as { state: string };
  return instance.state;
}

async function instanceVariables(page: Page, instanceKey: string): Promise<Record<string, unknown>> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}`);
  const instance = parseWithKeys.parse(await response.text()) as { variables?: Record<string, unknown> };
  return instance.variables ?? {};
}
