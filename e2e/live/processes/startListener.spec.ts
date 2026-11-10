import { expect, test, type Page, type Response } from '@playwright/test';
import JSONBigInt from 'json-bigint';
import { appendElement, createProcess, downloadBpmnXml, selectShape } from '../helpers/processDesigner.ts';
import { fillEntry, openGroup } from '../helpers/propertiesPanel.ts';
import { deployProcess, expectDeploymentSaved } from '../helpers/processDeployment.ts';
import { startProcessInstance } from '../helpers/bmpStartInstance.ts';

const LISTENER_TYPE = 'order-started';
const parseWithKeys = JSONBigInt({ storeAsString: true });

// The engine holds the token at a start event with an end execution listener
// until a worker completes the listener's job. The UI marks that job and
// completes it without variables, which the engine would keep on the job only.
test('a start event listener holds the token until the UI completes its job', async ({ page }) => {
  await createProcess(page);
  await appendElement(page, 'Start', 'Append end event', 'End');
  await selectShape(page, 'Start');
  await openGroup(page, 'zenbpm-executionListener');
  await fillEntry(page, 'zenbpm-executionListener-type', LISTENER_TYPE);
  const xml = await downloadBpmnXml(page);
  const deployment = await deployProcess(page);
  await expectDeploymentSaved(page, deployment, xml);
  const { processDefinitionKey } = parseWithKeys.parse(await deployment.text()) as { processDefinitionKey: string };

  const instanceKey = await startInstance(page, String(processDefinitionKey));
  await page.goto(`/process-instances/${instanceKey}`);

  const row = listenerJobRow(page);
  await expect(row.getByTestId('job-listener-chip')).toHaveText('End listener', { timeout: 15_000 });
  await expect(row.getByText('Active', { exact: true })).toBeVisible();

  await row.getByRole('button', { name: 'Complete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('complete-job-listener-note')).toBeVisible();
  const completion = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/complete'),
  );
  await dialog.getByRole('button', { name: 'Complete' }).click();
  expect((await completion).ok()).toBe(true);
  await expect(page.getByText('Job completed successfully')).toBeVisible();

  // With the job completed the token leaves the start event and the instance ends.
  await expect.poll(async () => instanceState(page, instanceKey), { timeout: 15_000 }).toBe('completed');
  await page.reload();
  await expect(listenerJobRow(page).getByText('Completed', { exact: true })).toBeVisible({ timeout: 15_000 });
});

async function startInstance(page: Page, processDefinitionKey: string): Promise<string> {
  await page.goto(`/process-definitions/${processDefinitionKey}`);
  const [created] = await Promise.all([
    page.waitForResponse((response: Response) => new URL(response.url()).pathname === '/v1/process-instances'
      && response.request().method() === 'POST'),
    startProcessInstance(page),
  ]);
  expect(created.ok(), `Start returned ${created.status()}`).toBe(true);
  const { key } = parseWithKeys.parse(await created.text()) as { key: string };
  return String(key);
}

function listenerJobRow(page: Page) {
  return page.getByTestId('jobs-table').locator('tbody tr').filter({ hasText: LISTENER_TYPE });
}

async function instanceState(page: Page, instanceKey: string): Promise<string> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}`);
  const instance = parseWithKeys.parse(await response.text()) as { state: string };
  return instance.state;
}
