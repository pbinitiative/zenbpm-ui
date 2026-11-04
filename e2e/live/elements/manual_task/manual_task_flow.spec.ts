import { expect, test, type APIRequestContext, type APIResponse, type Locator, type Page } from '@playwright/test';
import JSONBigInt from 'json-bigint';

import { expectBpmElementCompleted } from '../../helpers/bpmDiagramAssertions';
import { editMultiInstance } from '../../helpers/commonProperties';
import { appendTaskToNewProcess, changeElement, downloadBpmnXml, toggleMarker } from '../../helpers/processDesigner';
import { deployProcess, expectDeploymentSaved } from '../../helpers/processDeployment';

// A manual task is a pass-through activity: the engine completes it at once,
// without a job, and the token continues along the outgoing sequence flow.
const ELEMENT_ID = 'Manual_task_under_test';
const COLLECTION = ['first', 'second', 'third'];
const jsonBigInt = JSONBigInt({ storeAsString: true });

test.describe('Manual task flow', () => {
  let process: DeployedManualTaskProcess;

  test.beforeAll(async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL });
    try {
      process = await designAndDeployManualTaskProcess(page, async () => {});
    } finally {
      await page.close();
    }
  });

  test('completes the manual task without a job and finishes the instance', async ({ page, request }) => {
    const instanceKey = await startInstance(request, process.processDefinitionKey, { customer: 'Alice' });
    await waitForInstanceState(request, instanceKey, 'completed');

    await expectNoJobForManualTask(request, instanceKey);
    // Without input mappings the task records the process scope as its input,
    // and without output mappings it propagates nothing.
    const history = expectedProcessHistory(process, {
      inputVariables: { customer: 'Alice' },
      outputVariables: {},
    });
    expect(await getHistoryInExecutionOrder(request, instanceKey)).toEqual(history);

    await openInstance(page, instanceKey);
    await expectBpmElementCompleted(page, ELEMENT_ID);
    await expectBpmElementCompleted(page, 'End');
    await expect(page.getByTestId('jobs-table')).not.toContainText(ELEMENT_ID);

    await openHistoryTab(page);
    expect(await readHistoryTable(page, 3)).toEqual(expectedHistoryTableRows(history));
    // A manual task has no job, so its history row offers no link to one.
    await expect(historyRow(page, ELEMENT_ID).getByRole('button', { name: 'Row actions' })).toHaveCount(0);
  });
});

test.describe('Manual task flow — parallel multi-instance', () => {
  let process: DeployedManualTaskProcess;

  test.beforeAll(async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL });
    try {
      process = await designAndDeployManualTaskProcess(page, async () => {
        await toggleMarker(page, 'Parallel multi-instance');
        await editMultiInstance(page, { completionCondition: false });
      });
    } finally {
      await page.close();
    }
  });

  test('runs one iteration per element and collects their results', async ({ page, request }) => {
    const instanceKey = await startInstance(request, process.processDefinitionKey, { items: COLLECTION });
    const instance = await waitForInstanceState(request, instanceKey, 'completed');

    // Parallel iterations do not guarantee the order of the output collection.
    expect(instance.variables.results).toEqual(expect.arrayContaining(COLLECTION));
    expect(instance.variables.results).toHaveLength(COLLECTION.length);
    await expectNoJobForManualTask(request, instanceKey);
    const childKey = await getMultiInstanceChildKey(request, instanceKey);
    await expectNoJobForManualTask(request, childKey);

    const history = expectedProcessHistory(process, multiInstanceActivityVariables(expect.arrayContaining(COLLECTION)));
    expect(await getHistoryInExecutionOrder(request, instanceKey)).toEqual(history);
    // Parallel iterations take their elements in no guaranteed order.
    const iterations = expectedIterationHistory();
    expect(sortByIterationElement(await getHistoryInExecutionOrder(request, childKey)))
      .toEqual(sortByIterationElement(iterations));

    await openInstance(page, instanceKey);
    await expectBpmElementCompleted(page, ELEMENT_ID);
    await expectBpmElementCompleted(page, 'End');
    await expectResultsVariableRow(page);

    await openHistoryTab(page);
    const rows = await readHistoryTable(page, 3 + 1 + COLLECTION.length);
    const expectedRows = expectedMultiInstanceHistoryTableRows(history, childKey, iterations);
    expect(rows.slice(0, 4)).toEqual(expectedRows.slice(0, 4));
    expect(sortByIterationElement(rows.slice(4))).toEqual(sortByIterationElement(expectedRows.slice(4)));
  });
});

test.describe('Manual task flow — sequential multi-instance', () => {
  let process: DeployedManualTaskProcess;

  test.beforeAll(async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL });
    try {
      process = await designAndDeployManualTaskProcess(page, async () => {
        await toggleMarker(page, 'Sequential multi-instance');
        await editMultiInstance(page, { completionCondition: false });
      });
    } finally {
      await page.close();
    }
  });

  test('runs the iterations in collection order and collects their results', async ({ page, request }) => {
    const instanceKey = await startInstance(request, process.processDefinitionKey, { items: COLLECTION });
    const instance = await waitForInstanceState(request, instanceKey, 'completed');

    expect(instance.variables.results).toEqual(COLLECTION);
    await expectNoJobForManualTask(request, instanceKey);
    const childKey = await getMultiInstanceChildKey(request, instanceKey);
    await expectNoJobForManualTask(request, childKey);

    const history = expectedProcessHistory(process, multiInstanceActivityVariables(COLLECTION));
    expect(await getHistoryInExecutionOrder(request, instanceKey)).toEqual(history);
    const iterations = expectedIterationHistory();
    expect(await getHistoryInExecutionOrder(request, childKey)).toEqual(iterations);

    await openInstance(page, instanceKey);
    await expectBpmElementCompleted(page, ELEMENT_ID);
    await expectBpmElementCompleted(page, 'End');
    await expectResultsVariableRow(page);

    await openHistoryTab(page);
    expect(await readHistoryTable(page, 3 + 1 + COLLECTION.length))
      .toEqual(expectedMultiInstanceHistoryTableRows(history, childKey, iterations));
  });
});

async function designAndDeployManualTaskProcess(
  page: Page,
  configure: () => Promise<void>,
): Promise<DeployedManualTaskProcess> {
  await appendTaskToNewProcess(page, ELEMENT_ID);
  await changeElement(page, 'Manual task');
  await configure();
  const xml = await downloadBpmnXml(page);
  const response = await deployProcess(page);
  await expectDeploymentSaved(page, response, xml);
  const result = jsonBigInt.parse(await response.text()) as { processDefinitionKey: string };
  return {
    processDefinitionKey: String(result.processDefinitionKey),
    incomingFlowId: sequenceFlowId(xml, 'Start', ELEMENT_ID),
    outgoingFlowId: sequenceFlowId(xml, ELEMENT_ID, 'End'),
  };
}

function sequenceFlowId(xml: string, sourceRef: string, targetRef: string): string {
  const flow = [...xml.matchAll(/<bpmn:sequenceFlow\b[^>]*>/g)]
    .map((match) => match[0])
    .find((tag) => tag.includes(`sourceRef="${sourceRef}"`) && tag.includes(`targetRef="${targetRef}"`));
  expect(flow, `sequence flow from ${sourceRef} to ${targetRef}`).toBeDefined();
  return /\bid="([^"]+)"/.exec(flow!)![1];
}

function expectedProcessHistory(
  process: DeployedManualTaskProcess,
  manualTask: Pick<HistoryStep, 'inputVariables' | 'outputVariables'>,
): HistoryStep[] {
  return [
    { elementId: 'Start', elementType: 'START_EVENT', inputVariables: {}, completed: true },
    { elementId: process.incomingFlowId, elementType: 'SEQUENCE_FLOW', inputVariables: {}, completed: true },
    { elementId: ELEMENT_ID, elementType: 'MANUAL_TASK', ...manualTask, completed: true },
    { elementId: process.outgoingFlowId, elementType: 'SEQUENCE_FLOW', inputVariables: {}, completed: true },
    { elementId: 'End', elementType: 'END_EVENT', inputVariables: {}, completed: true },
  ];
}

function multiInstanceActivityVariables(results: unknown): Pick<HistoryStep, 'inputVariables' | 'outputVariables'> {
  return {
    inputVariables: { item: COLLECTION, items: COLLECTION },
    outputVariables: { results },
  };
}

function expectedIterationHistory(): HistoryStep[] {
  return COLLECTION.map((item) => ({
    elementId: ELEMENT_ID,
    elementType: 'MANUAL_TASK',
    inputVariables: { item, items: COLLECTION },
    outputVariables: {},
    completed: true,
  }));
}

function sortByIterationElement<T extends object>(rows: T[]): T[] {
  const item = (row: T) => String('inputVariables' in row ? (row.inputVariables as Record<string, unknown>).item : '');
  return [...rows].sort((a, b) => item(a).localeCompare(item(b)));
}

async function startInstance(
  api: APIRequestContext,
  processDefinitionKey: string,
  variables: Record<string, unknown>,
): Promise<string> {
  // The key is spliced in as a JSON number so that it keeps its int64 precision.
  const response = await api.post('/v1/process-instances', {
    data: `{"processDefinitionKey":${processDefinitionKey},"variables":${JSON.stringify(variables)}}`,
    headers: { 'content-type': 'application/json' },
  });
  const instance = await expectJsonResponse<{ key: string }>(response, 'Starting the manual task process');
  return String(instance.key);
}

async function waitForInstanceState(
  api: APIRequestContext,
  instanceKey: string,
  state: string,
): Promise<ApiProcessInstance> {
  let latest: ApiProcessInstance | undefined;
  await expect.poll(async () => {
    const response = await api.get(`/v1/process-instances/${instanceKey}`);
    if (!response.ok()) return undefined;
    latest = jsonBigInt.parse(await response.text()) as ApiProcessInstance;
    return latest.state;
  }, {
    message: `Wait for process instance ${instanceKey} to be ${state}`,
    timeout: 15_000,
    intervals: [200, 500, 1000],
  }).toBe(state);
  return latest!;
}

async function expectNoJobForManualTask(api: APIRequestContext, instanceKey: string): Promise<void> {
  // The endpoint lists jobs in every state, completed ones included.
  const response = await api.get(`/v1/process-instances/${instanceKey}/jobs?page=1&size=100`);
  const jobs = await expectJsonResponse<PageResult<ApiJob>>(response, `Reading jobs of instance ${instanceKey}`);
  expect(jobs.items.filter((job) => job.elementId === ELEMENT_ID)).toEqual([]);
}


async function getMultiInstanceChildKey(api: APIRequestContext, instanceKey: string): Promise<string> {
  const response = await api.get(`/v1/process-instances/${instanceKey}/child-processes?page=1&size=100`);
  const children = await expectJsonResponse<PartitionedPageResult<ApiProcessInstance>>(
    response,
    `Reading child processes of instance ${instanceKey}`,
  );
  const childInstances = children.partitions.flatMap((partition) => partition.items);
  expect(childInstances.map((child) => ({ processType: child.processType, state: child.state }))).toEqual([
    { processType: 'multiInstance', state: 'completed' },
  ]);
  return String(childInstances[0].key);
}


async function getHistoryInExecutionOrder(api: APIRequestContext, instanceKey: string): Promise<HistoryStep[]> {
  const response = await api.get(`/v1/process-instances/${instanceKey}/history?page=1&size=100`);
  const history = await expectJsonResponse<PageResult<ApiHistory>>(response, `Reading history of instance ${instanceKey}`);
  return [...history.items]
    .sort((a, b) => (BigInt(a.key) < BigInt(b.key) ? -1 : BigInt(a.key) > BigInt(b.key) ? 1 : 0))
    .map((row) => ({
      elementId: row.elementId,
      elementType: row.elementType,
      inputVariables: row.inputVariables,
      outputVariables: row.outputVariables,
      completed: row.completedAt !== undefined,
    }));
}

async function openInstance(page: Page, instanceKey: string): Promise<void> {
  await page.goto(`/process-instances/${instanceKey}`);
  await expect(page.getByTestId('process-instance-metadata-panel')).toContainText('Completed', { timeout: 15_000 });
}

async function openHistoryTab(page: Page): Promise<void> {
  await page.getByTestId('process-instance-tab-history').click();
  await expect(page.getByTestId('history-table')).toBeVisible();
}

function historyRow(page: Page, elementId: string): Locator {
  return page.getByTestId('history-table').locator('tbody tr')
    .filter({ has: page.getByTestId('cell-elementId').getByText(elementId, { exact: true }) });
}

function expectedHistoryTableRows(history: HistoryStep[]): HistoryTableEntry[] {
  return history
    .filter((step) => step.elementType !== 'SEQUENCE_FLOW')
    .map((step) => ({
      elementId: step.elementId,
      state: 'Completed',
      inputVariables: step.inputVariables,
      outputVariables: step.outputVariables ?? {},
    }));
}

function expectedMultiInstanceHistoryTableRows(
  history: HistoryStep[],
  childKey: string,
  iterations: HistoryStep[],
): HistoryTableRow[] {
  return [
    ...expectedHistoryTableRows(history),
    { section: `Multi Instance: ${childKey} ${ELEMENT_ID}` },
    ...expectedHistoryTableRows(iterations),
  ];
}

async function readHistoryTable(page: Page, expectedRowCount: number): Promise<HistoryTableRow[]> {
  const rows = page.getByTestId('history-table').locator('tbody tr');
  await expect(rows).toHaveCount(expectedRowCount);
  const result: HistoryTableRow[] = [];
  for (let index = 0; index < expectedRowCount; index++) {
    const row = rows.nth(index);
    if (await row.getAttribute('data-testid') === 'section-header') {
      result.push({ section: (await row.innerText()).replace(/\s+/g, ' ').trim() });
      continue;
    }
    result.push({
      elementId: await row.getByTestId('cell-elementId').innerText(),
      state: await row.getByTestId('cell-state').innerText(),
      ...await readRowVariables(page, row),
    });
  }
  return result;
}

async function readRowVariables(page: Page, row: Locator): Promise<Pick<HistoryTableEntry, 'inputVariables' | 'outputVariables'>> {
  const cell = row.getByTestId('cell-variables');
  if (await cell.getByTestId('variables-empty').count() > 0) {
    return { inputVariables: {}, outputVariables: {} };
  }
  const inputCount = Number((await cell.getByTestId('variables-in-badge').innerText()).replace(/\D/g, ''));
  const outputCount = Number((await cell.getByTestId('variables-out-badge').innerText()).replace(/\D/g, ''));
  await cell.getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The dialog renders the inputs and then the outputs as JSON, each only when present.
  const blocks = dialog.locator('pre');
  await expect(blocks).toHaveCount((inputCount > 0 ? 1 : 0) + (outputCount > 0 ? 1 : 0));
  const inputVariables = inputCount > 0 ? JSON.parse(await blocks.first().innerText()) as Record<string, unknown> : {};
  const outputVariables = outputCount > 0 ? JSON.parse(await blocks.last().innerText()) as Record<string, unknown> : {};
  expect(Object.keys(inputVariables)).toHaveLength(inputCount);
  expect(Object.keys(outputVariables)).toHaveLength(outputCount);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  return { inputVariables, outputVariables };
}

async function expectResultsVariableRow(page: Page): Promise<void> {
  await page.getByTestId('process-instance-tab-variables').click();
  const row = page.getByTestId('variables-table').locator('tbody tr').filter({ hasText: 'results' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(`[ ${COLLECTION.length} items ]`);
}

async function expectJsonResponse<T>(response: APIResponse, action: string): Promise<T> {
  const body = await response.text();
  expect(response.ok(), `${action} returned ${response.status()}: ${body}`).toBe(true);
  return jsonBigInt.parse(body) as T;
}

interface DeployedManualTaskProcess {
    processDefinitionKey: string;
    incomingFlowId: string;
    outgoingFlowId: string;
}

interface HistoryStep {
    elementId: string;
    elementType: string;
    inputVariables: Record<string, unknown>;
    outputVariables?: Record<string, unknown>;
    completed: boolean;
}

interface HistoryTableEntry {
    elementId: string;
    state: string;
    inputVariables: Record<string, unknown>;
    outputVariables: Record<string, unknown>;
}

type HistoryTableRow = HistoryTableEntry | { section: string };

interface ApiProcessInstance {
    key: string;
    state: string;
    processType: string;
    variables: Record<string, unknown>;
}

interface ApiJob {
    key: string;
    elementId: string;
}

interface ApiHistory {
    key: string;
    elementId: string;
    elementType: string;
    inputVariables: Record<string, unknown>;
    outputVariables?: Record<string, unknown>;
    completedAt?: string;
}

interface PageResult<T> {
    items: T[];
    totalCount: number;
}

interface PartitionedPageResult<T> {
    partitions: { items: T[] }[];
}
