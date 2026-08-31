import { expect, type Page, type Response } from '@playwright/test';

type JsonRecord = Record<string, unknown>;

export type PageSummary = {
  totalCount: number;
};

type ExpectedEndpoint = {
  path: string;
  query: Record<string, string>;
};

const endpoints = {
  status: { path: '/system/status', query: {} },
  processDefinitions: {
    path: '/v1/process-definitions',
    query: { size: '1', onlyLatest: 'true' },
  },
  processInstances: { path: '/v1/process-instances', query: { size: '1' } },
  dmnResourceDefinitions: {
    path: '/v1/dmn-resource-definitions',
    query: { size: '1' },
  },
  decisionInstances: { path: '/v1/decision-instances', query: { size: '1' } },
} satisfies Record<string, ExpectedEndpoint>;

function asRecord(value: unknown, description: string): JsonRecord {
  expect(value, description).not.toBeNull();
  expect(typeof value, description).toBe('object');
  expect(Array.isArray(value), description).toBe(false);
  return value as JsonRecord;
}

function expectString(value: unknown, description: string, allowEmpty = false): asserts value is string {
  expect(typeof value, description).toBe('string');
  if (!allowEmpty) {
    expect((value as string).length, description).toBeGreaterThan(0);
  }
}

function expectInteger(
  value: unknown,
  description: string,
  minimum = 0,
): asserts value is number {
  expect(typeof value, description).toBe('number');
  expect(Number.isFinite(value), description).toBe(true);
  expect(Number.isInteger(value), description).toBe(true);
  expect(value as number, description).toBeGreaterThanOrEqual(minimum);
}

function expectIsoDate(value: unknown, description: string): asserts value is string {
  expectString(value, description);
  expect(Number.isNaN(Date.parse(value as string)), description).toBe(false);
}

function expectEnumString(
  value: unknown,
  description: string,
  allowedValues: readonly string[],
): asserts value is string {
  expectString(value, description);
  expect(allowedValues, description).toContain(value);
}

function expectRequest(response: Response, endpoint: ExpectedEndpoint): void {
  const url = new URL(response.url());

  expect(response.request().method()).toBe('GET');
  expect(url.pathname).toBe(endpoint.path);
  expect(url.searchParams.size).toBe(Object.keys(endpoint.query).length);
  expect(Object.fromEntries(url.searchParams.entries())).toEqual(endpoint.query);
  expect(response.status()).toBe(200);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/^application\/json(?:\s*;|$)/i);
}

function validatePageMetadata(body: JsonRecord, itemCount: number): PageSummary {
  expectInteger(body.count, 'response count');
  expect(body.count).toBe(itemCount);
  expect(body.page).toBe(1);
  expect(body.size).toBe(1);
  expectInteger(body.totalCount, 'response totalCount');
  expect(body.totalCount as number).toBeGreaterThanOrEqual(body.count as number);

  return { totalCount: body.totalCount as number };
}

function validateProcessDefinitions(body: unknown): PageSummary {
  const page = asRecord(body, 'process definitions response');
  expect(Array.isArray(page.items), 'process definitions items').toBe(true);
  const items = page.items as unknown[];
  expect(items.length).toBeLessThanOrEqual(1);

  for (const value of items) {
    const item = asRecord(value, 'process definition item');
    expectString(item.bpmnProcessId, 'process definition bpmnProcessId');
    if (item.bpmnProcessName !== undefined) {
      expectString(item.bpmnProcessName, 'process definition bpmnProcessName', true);
    }
    expectInteger(item.key, 'process definition key', 1);
    expectInteger(item.version, 'process definition version', 1);
  }

  return validatePageMetadata(page, items.length);
}

function validateDmnResourceDefinitions(body: unknown): PageSummary {
  const page = asRecord(body, 'DMN resource definitions response');
  expect(Array.isArray(page.items), 'DMN resource definitions items').toBe(true);
  const items = page.items as unknown[];
  expect(items.length).toBeLessThanOrEqual(1);

  for (const value of items) {
    const item = asRecord(value, 'DMN resource definition item');
    expectString(item.dmnDefinitionName, 'DMN definition name', true);
    expectString(item.dmnResourceDefinitionId, 'DMN resource definition id');
    expectInteger(item.key, 'DMN resource definition key', 1);
    expectInteger(item.version, 'DMN resource definition version', 1);
  }

  return validatePageMetadata(page, items.length);
}

function validatePartitionedPage(
  body: unknown,
  description: string,
  validateItem: (item: JsonRecord) => void,
): PageSummary {
  const page = asRecord(body, `${description} response`);
  expect(Array.isArray(page.partitions), `${description} partitions`).toBe(true);

  let itemCount = 0;
  for (const value of page.partitions as unknown[]) {
    const partition = asRecord(value, `${description} partition`);
    expectInteger(partition.partition, `${description} partition id`, 1);
    expect(Array.isArray(partition.items), `${description} partition items`).toBe(true);

    const items = partition.items as unknown[];
    itemCount += items.length;
    if (partition.count !== undefined) {
      expectInteger(partition.count, `${description} partition count`);
      expect(partition.count).toBe(items.length);
    }

    for (const item of items) {
      validateItem(asRecord(item, `${description} item`));
    }
  }

  expect(itemCount).toBeLessThanOrEqual(1);
  return validatePageMetadata(page, itemCount);
}

function validateProcessInstances(body: unknown): PageSummary {
  return validatePartitionedPage(body, 'process instances', (item) => {
    if (item.bpmnProcessId !== undefined) {
      expectString(item.bpmnProcessId, 'process instance bpmnProcessId');
    }
    if (item.businessKey !== undefined) {
      expectString(item.businessKey, 'process instance businessKey', true);
    }
    expectIsoDate(item.createdAt, 'process instance createdAt');
    expectInteger(item.incidentCount, 'process instance incidentCount');
    expectInteger(item.key, 'process instance key', 1);
    expectInteger(item.processDefinitionKey, 'process instance processDefinitionKey', 1);
    if (item.parentProcessInstanceKey !== undefined) {
      expectInteger(item.parentProcessInstanceKey, 'process instance parentProcessInstanceKey', 1);
    }
    expect(['default', 'multiInstance', 'subprocess', 'callActivity']).toContain(
      item.processType,
    );
    expect(['active', 'completed', 'terminated', 'failed']).toContain(item.state);
    asRecord(item.variables, 'process instance variables');
  });
}

function validateDecisionInstances(body: unknown): PageSummary {
  return validatePartitionedPage(body, 'decision instances', (item) => {
    expectInteger(
      item.dmnResourceDefinitionKey,
      'decision instance DMN resource definition key',
      1,
    );
    expectIsoDate(item.evaluatedAt, 'decision instance evaluatedAt');
    if (item.flowElementInstanceKey !== undefined) {
      expectInteger(
        item.flowElementInstanceKey,
        'decision instance flow element instance key',
        1,
      );
    }
    expectInteger(item.key, 'decision instance key', 1);
    if (item.processInstanceKey !== undefined) {
      expectInteger(item.processInstanceKey, 'decision instance process instance key', 1);
    }
  });
}

function validateStatus(body: unknown): void {
  const status = asRecord(body, 'system status response');

  const git = asRecord(status.git, 'system status git');
  expectString(git.branch, 'system status git branch');
  expectString(git.commitId, 'system status git commit id');

  const build = asRecord(status.build, 'system status build');
  expectString(build.version, 'system status build version');
  expect(build.version).toMatch(/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
  expectString(build.time, 'system status build time');

  const clusterConfig = asRecord(status.clusterConfig, 'system status cluster config');
  expectInteger(clusterConfig.desiredPartitions, 'system status desired partitions', 1);

  const partitions = asRecord(status.partitions, 'system status partitions');
  for (const [partitionKey, value] of Object.entries(partitions)) {
    const partition = asRecord(value, `system status partition ${partitionKey}`);
    expectInteger(partition.id, `system status partition ${partitionKey} id`, 1);
    expect(String(partition.id)).toBe(partitionKey);
    expectString(partition.leaderId, `system status partition ${partitionKey} leader id`, true);
  }

  const nodes = asRecord(status.nodes, 'system status nodes');
  for (const [nodeKey, value] of Object.entries(nodes)) {
    const node = asRecord(value, `system status node ${nodeKey}`);
    expectString(node.id, `system status node ${nodeKey} id`);
    expect(node.id).toBe(nodeKey);
    expectString(node.addr, `system status node ${nodeKey} address`);
    expectEnumString(
      node.suffrage,
      `system status node ${nodeKey} suffrage`,
      ['Voter', 'Nonvoter', 'Staging'],
    );
    expectEnumString(
      node.state,
      `system status node ${nodeKey} state`,
      ['NodeStateError', 'NodeStateStarted', 'NodeStateShutdown'],
    );
    expectEnumString(
      node.role,
      `system status node ${nodeKey} role`,
      ['RoleFollower', 'RoleLeader'],
    );

    const nodePartitions = asRecord(
      node.partitions,
      `system status node ${nodeKey} partitions`,
    );
    for (const [partitionKey, partitionValue] of Object.entries(nodePartitions)) {
      const partition = asRecord(
        partitionValue,
        `system status node ${nodeKey} partition ${partitionKey}`,
      );
      expectInteger(partition.id, `system status node partition ${partitionKey} id`, 1);
      expect(String(partition.id)).toBe(partitionKey);
      expectEnumString(
        partition.state,
        `system status node partition ${partitionKey} state`,
        [
          'NodePartitionStateError',
          'NodePartitionStateJoining',
          'NodePartitionStateLeaving',
          'NodePartitionStateInitializing',
          'NodePartitionStateInitialized',
        ],
      );
      expectEnumString(
        partition.role,
        `system status node partition ${partitionKey} role`,
        ['RoleFollower', 'RoleLeader'],
      );
    }
  }
}

export function observeHomeStatusCall(page: Page): Promise<void> {
  return observeJsonEndpoint(page, endpoints.status, validateStatus);
}

export function observeProcessDefinitionsCall(page: Page): Promise<PageSummary> {
  return observeJsonEndpoint(
    page,
    endpoints.processDefinitions,
    validateProcessDefinitions,
  );
}

export function observeProcessInstancesCall(page: Page): Promise<PageSummary> {
  return observeJsonEndpoint(
    page,
    endpoints.processInstances,
    validateProcessInstances,
  );
}

export function observeDmnResourceDefinitionsCall(page: Page): Promise<PageSummary> {
  return observeJsonEndpoint(
    page,
    endpoints.dmnResourceDefinitions,
    validateDmnResourceDefinitions,
  );
}

export function observeDecisionInstancesCall(page: Page): Promise<PageSummary> {
  return observeJsonEndpoint(
    page,
    endpoints.decisionInstances,
    validateDecisionInstances,
  );
}

function observeJsonEndpoint<T>(
  page: Page,
  endpoint: ExpectedEndpoint,
  validate: (body: unknown) => T,
): Promise<T> {
  return page
    .waitForResponse((response) => new URL(response.url()).pathname === endpoint.path)
    .then(async (response) => {
      expectRequest(response, endpoint);
      return validate(await response.json());
    });
}
