import { expect, type Locator, type Page, type Response } from '@playwright/test';
import JSONBigInt from 'json-bigint';

import { downloadBpmnXml } from './processDesigner.ts';
import { deployProcess, expectDeploymentSaved } from './processDeployment.ts';
import { startProcessInstance } from './bmpStartInstance.ts';

const parseWithKeys = JSONBigInt({ storeAsString: true });

/** A job as the engine's API hands it out, with the fields the listener specs read. */
export interface EngineJob {
  key: string;
  type: string;
  state: string;
  elementId: string;
  elementType: string;
  elementInstanceKey: string;
  /** `start` or `end` for the job of an execution listener, absent for an element's own job. */
  listenerEventType?: string;
  inputVariables?: Record<string, unknown>;
}

/**
 * Deploys the process open in the designer, starts an instance of it through
 * the definition's page and opens the instance. Answers the instance's key.
 */
export async function deployAndStartDesignedProcess(page: Page): Promise<string> {
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

export function jobRows(page: Page): Locator {
  return page.getByTestId('jobs-table').locator('tbody tr');
}

/**
 * The row of the job of the type, once the Jobs tab shows it in the state.
 * The engine creates the next job of an element behind the completion of the
 * one before it, so the row is looked for until the page shows it. The jobs of
 * one element share its id and name, which is why a row is told by its type.
 */
export async function waitForJobRow(page: Page, jobType: string, state = 'Active'): Promise<Locator> {
  const row = jobRows(page).filter({ has: page.getByText(jobType, { exact: true }) });
  await expect(async () => {
    await page.reload();
    await expect(row.getByText(state, { exact: true })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  return row;
}

/** Replaces the content of the variables editor of the open dialog. */
export async function enterVariables(page: Page, json: string): Promise<void> {
  await page.getByRole('dialog').locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  // inserted in one piece, so that the editor closes no bracket or quote of its own
  await page.keyboard.insertText(json);
}

/** Confirms the open Complete dialog and waits for the engine to take the completion. */
export async function completeJob(page: Page, dialog: Locator): Promise<void> {
  const completion = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/complete'),
  );
  await dialog.getByRole('button', { name: 'Complete' }).click();
  expect((await completion).ok()).toBe(true);
  await expect(dialog).not.toBeVisible();
}

export async function jobsOf(page: Page, instanceKey: string): Promise<EngineJob[]> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}/jobs`);
  const { items } = parseWithKeys.parse(await response.text()) as { items?: EngineJob[] };
  return items ?? [];
}

export async function instanceState(page: Page, instanceKey: string): Promise<string> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}`);
  const instance = parseWithKeys.parse(await response.text()) as { state: string };
  return instance.state;
}

export async function instanceVariables(page: Page, instanceKey: string): Promise<Record<string, unknown>> {
  const response = await page.request.get(`/v1/process-instances/${instanceKey}`);
  const instance = parseWithKeys.parse(await response.text()) as { variables?: Record<string, unknown> };
  return instance.variables ?? {};
}
