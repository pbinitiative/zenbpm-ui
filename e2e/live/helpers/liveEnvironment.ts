import { validateProcessRunPrefix } from './processNaming.ts';

export const LIVE_DEPLOYMENTS_ENV = 'ZENBPM_E2E_DEPLOYMENTS';

const PROCESS_DEFINITION_KEY_PATTERN = /^\d+$/;

export type LiveProcessName = 'gateway' | 'sales';

export type DeployedProcess = {
  processDefinitionKey: string;
  processId: string;
  processName: string;
};

export type LiveDeploymentManifest = {
  gateway: DeployedProcess;
  runPrefix: string;
  sales: DeployedProcess & {
    decisionId: string;
    decisionName: string;
    dmnResourceDefinitionKey: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string {
  const value = record[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${LIVE_DEPLOYMENTS_ENV}.${context}.${field} must be a non-empty string.`);
  }
  return value;
}

function readDefinitionKey(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string {
  const key = readNonEmptyString(record, field, context);
  if (!PROCESS_DEFINITION_KEY_PATTERN.test(key)) {
    throw new Error(`${LIVE_DEPLOYMENTS_ENV}.${context}.${field} must be numeric.`);
  }
  return key;
}

function readProcess(value: unknown, context: LiveProcessName): DeployedProcess {
  if (!isRecord(value)) {
    throw new Error(`${LIVE_DEPLOYMENTS_ENV}.${context} must be an object.`);
  }

  return {
    processDefinitionKey: readDefinitionKey(value, 'processDefinitionKey', context),
    processId: readNonEmptyString(value, 'processId', context),
    processName: readNonEmptyString(value, 'processName', context),
  };
}

export function setLiveDeploymentManifest(manifest: LiveDeploymentManifest): void {
  process.env[LIVE_DEPLOYMENTS_ENV] = JSON.stringify(manifest);
}

export function getLiveDeploymentManifest(): LiveDeploymentManifest {
  const serializedManifest = process.env[LIVE_DEPLOYMENTS_ENV];
  if (!serializedManifest) {
    throw new Error(
      `${LIVE_DEPLOYMENTS_ENV} is not set. Run the live tests through Playwright globalSetup.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedManifest);
  } catch (error) {
    throw new Error(`${LIVE_DEPLOYMENTS_ENV} does not contain valid JSON.`, { cause: error });
  }

  if (!isRecord(parsed)) {
    throw new Error(`${LIVE_DEPLOYMENTS_ENV} must contain an object.`);
  }

  const runPrefix = readNonEmptyString(parsed, 'runPrefix', 'manifest');
  validateProcessRunPrefix(runPrefix);

  const gateway = readProcess(parsed.gateway, 'gateway');
  if (!isRecord(parsed.sales)) {
    throw new Error(`${LIVE_DEPLOYMENTS_ENV}.sales must be an object.`);
  }
  const salesProcess = readProcess(parsed.sales, 'sales');

  return {
    gateway,
    runPrefix,
    sales: {
      ...salesProcess,
      decisionId: readNonEmptyString(parsed.sales, 'decisionId', 'sales'),
      decisionName: readNonEmptyString(parsed.sales, 'decisionName', 'sales'),
      dmnResourceDefinitionKey: readDefinitionKey(
        parsed.sales,
        'dmnResourceDefinitionKey',
        'sales',
      ),
    },
  };
}

export function processDefinitionUrl(
  processName: LiveProcessName,
  query?: Record<string, string>,
): string {
  const deployment = getLiveDeploymentManifest()[processName];
  const search = query ? `?${new URLSearchParams(query).toString()}` : '';
  return `/process-definitions/${deployment.processDefinitionKey}${search}`;
}
