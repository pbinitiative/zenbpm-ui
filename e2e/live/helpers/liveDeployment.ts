import { readFile } from 'node:fs/promises';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import JSONBigInt from 'json-bigint';
import {
  findXmlElementTag,
  prepareUniqueBpmnXml,
  readXmlAttribute,
  replaceQuotedIdReferences,
  setXmlAttribute,
  type PreparedBpmnProcess,
} from './bpmnUpload.ts';
import type { LiveDeploymentManifest } from './liveEnvironment.ts';
import { createUniqueProcessIdentity } from './processNaming.ts';

type LiveSourcePaths = {
  gatewayBpmn: string;
  salesBpmn: string;
  salesDmn: string;
};

type PreparedDmn = {
  decisionId: string;
  decisionName: string;
  originalDecisionId: string;
  xml: string;
};

const jsonBigInt = JSONBigInt({ storeAsString: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireSingleProcess(
  processes: PreparedBpmnProcess[],
  sourceLabel: string,
): PreparedBpmnProcess {
  if (processes.length !== 1 || !processes[0]) {
    throw new Error(`${sourceLabel} must contain exactly one BPMN process.`);
  }
  return processes[0];
}

function updateElementTag(
  xml: string,
  localName: string,
  attributes: Record<string, string>,
  sourceLabel: string,
): string {
  const originalTag = findXmlElementTag(xml, localName);
  if (!originalTag) {
    throw new Error(`No ${localName} element found in ${sourceLabel}.`);
  }

  const updatedTag = Object.entries(attributes).reduce(
    (tag, [attributeName, value]) => setXmlAttribute(tag, attributeName, value),
    originalTag,
  );
  return xml.replace(originalTag, updatedTag);
}

function prepareGatewayBpmn(sourceXml: string): {
  process: PreparedBpmnProcess;
  xml: string;
} {
  const prepared = prepareUniqueBpmnXml({
    scope: 'gateway',
    sourceLabel: 'gateway BPMN',
    sourceXml,
  });
  const process = requireSingleProcess(prepared.processes, 'Gateway BPMN');

  const messageTag = findXmlElementTag(prepared.xml, 'message');
  if (!messageTag) {
    throw new Error('No message element found in gateway BPMN.');
  }
  const originalMessageId = readXmlAttribute(messageTag, 'id');
  const originalMessageName = readXmlAttribute(messageTag, 'name');
  if (!originalMessageId || !originalMessageName) {
    throw new Error('The gateway BPMN message must have both id and name attributes.');
  }

  const messageIdentity = createUniqueProcessIdentity(originalMessageName, {
    scope: 'gateway_message',
  });
  let xml = updateElementTag(
    prepared.xml,
    'message',
    {
      id: messageIdentity.processId,
      name: messageIdentity.processName,
    },
    'gateway BPMN',
  );
  xml = replaceQuotedIdReferences(xml, originalMessageId, messageIdentity.processId);

  if (!xml.includes(`bpmnElement="${process.processId}"`)) {
    throw new Error('Gateway BPMNDI no longer references the generated process id.');
  }
  if (!xml.includes(`messageRef="${messageIdentity.processId}"`)) {
    throw new Error('Gateway message event no longer references the generated message id.');
  }

  return { process, xml };
}

function prepareSalesDmn(sourceXml: string): PreparedDmn {
  const definitionsTag = findXmlElementTag(sourceXml, 'definitions');
  const decisionTag = findXmlElementTag(sourceXml, 'decision');
  if (!definitionsTag || !decisionTag) {
    throw new Error('Sales DMN must contain definitions and decision elements.');
  }

  const originalDecisionId = readXmlAttribute(decisionTag, 'id');
  const originalDecisionName = readXmlAttribute(decisionTag, 'name');
  const originalDefinitionsName = readXmlAttribute(definitionsTag, 'name') ?? 'Sales DRD';
  if (!originalDecisionId || !originalDecisionName) {
    throw new Error('The sales DMN decision must have both id and name attributes.');
  }

  const definitionsIdentity = createUniqueProcessIdentity(originalDefinitionsName, {
    scope: 'sales_drd',
  });
  const decisionIdentity = createUniqueProcessIdentity(originalDecisionName, {
    scope: 'sales_decision',
  });

  let xml = updateElementTag(
    sourceXml,
    'definitions',
    {
      id: definitionsIdentity.processId,
      name: definitionsIdentity.processName,
    },
    'sales DMN',
  );
  xml = updateElementTag(
    xml,
    'decision',
    {
      id: decisionIdentity.processId,
      name: decisionIdentity.processName,
    },
    'sales DMN',
  );
  xml = replaceQuotedIdReferences(xml, originalDecisionId, decisionIdentity.processId);

  if (!xml.includes(`dmnElementRef="${decisionIdentity.processId}"`)) {
    throw new Error('Sales DMNDI no longer references the generated decision id.');
  }

  return {
    decisionId: decisionIdentity.processId,
    decisionName: decisionIdentity.processName,
    originalDecisionId,
    xml,
  };
}

function prepareSalesBpmn(
  sourceXml: string,
  originalDecisionId: string,
  decisionId: string,
): { process: PreparedBpmnProcess; xml: string } {
  const prepared = prepareUniqueBpmnXml({
    scope: 'sales',
    sourceLabel: 'sales BPMN',
    sourceXml,
  });
  const process = requireSingleProcess(prepared.processes, 'Sales BPMN');
  const xml = replaceQuotedIdReferences(
    prepared.xml,
    originalDecisionId,
    decisionId,
  );

  if (!xml.includes(`processRef="${process.processId}"`)) {
    throw new Error('Sales collaboration no longer references the generated process id.');
  }
  if (!xml.includes(`decisionId="${decisionId}"`)) {
    throw new Error('Sales BPMN no longer references the generated DMN decision id.');
  }

  return { process, xml };
}

async function readDefinitionKey(
  response: APIResponse,
  keyField: 'dmnResourceDefinitionKey' | 'processDefinitionKey',
  resourceName: string,
): Promise<string> {
  const responseBody = await response.text();
  if (response.status() !== 200 && response.status() !== 201) {
    throw new Error(
      `Uploading ${resourceName} failed with HTTP ${response.status()}: ${responseBody}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = jsonBigInt.parse(responseBody) as unknown;
  } catch (error) {
    throw new Error(`Uploading ${resourceName} returned invalid JSON.`, { cause: error });
  }

  if (!isRecord(parsed)) {
    throw new Error(`Uploading ${resourceName} did not return a JSON object.`);
  }

  const rawKey = parsed[keyField];
  const key = typeof rawKey === 'string' ? rawKey : String(rawKey);
  if (!/^\d+$/.test(key)) {
    throw new Error(`Uploading ${resourceName} did not return a numeric ${keyField}.`);
  }
  if (typeof rawKey === 'number' && !Number.isSafeInteger(rawKey)) {
    throw new Error(`Uploading ${resourceName} returned an unsafe numeric ${keyField}.`);
  }

  return key;
}

async function deployBpmn(
  api: APIRequestContext,
  xml: string,
  filename: string,
): Promise<string> {
  const response = await api.post('/v1/process-definitions', {
    multipart: {
      resource: {
        buffer: Buffer.from(xml),
        mimeType: 'application/xml',
        name: filename,
      },
    },
  });
  return readDefinitionKey(response, 'processDefinitionKey', filename);
}

async function deployDmn(
  api: APIRequestContext,
  xml: string,
  filename: string,
): Promise<string> {
  const response = await api.post('/v1/dmn-resource-definitions', {
    data: xml,
    headers: { 'content-type': 'application/xml' },
  });
  return readDefinitionKey(response, 'dmnResourceDefinitionKey', filename);
}

export async function deployLiveResources(
  api: APIRequestContext,
  sourcePaths: LiveSourcePaths,
): Promise<LiveDeploymentManifest> {
  const [gatewaySource, salesDmnSource, salesBpmnSource] = await Promise.all([
    readFile(sourcePaths.gatewayBpmn, 'utf8'),
    readFile(sourcePaths.salesDmn, 'utf8'),
    readFile(sourcePaths.salesBpmn, 'utf8'),
  ]);

  const gateway = prepareGatewayBpmn(gatewaySource);
  const salesDmn = prepareSalesDmn(salesDmnSource);
  const sales = prepareSalesBpmn(
    salesBpmnSource,
    salesDmn.originalDecisionId,
    salesDmn.decisionId,
  );

  const gatewayProcessDefinitionKey = await deployBpmn(
    api,
    gateway.xml,
    `${gateway.process.processId}.bpmn`,
  );
  const dmnResourceDefinitionKey = await deployDmn(
    api,
    salesDmn.xml,
    `${salesDmn.decisionId}.dmn`,
  );
  const salesProcessDefinitionKey = await deployBpmn(
    api,
    sales.xml,
    `${sales.process.processId}.bpmn`,
  );

  return {
    gateway: {
      processDefinitionKey: gatewayProcessDefinitionKey,
      processId: gateway.process.processId,
      processName: gateway.process.processName,
    },
    runPrefix: gateway.process.runPrefix,
    sales: {
      decisionId: salesDmn.decisionId,
      decisionName: salesDmn.decisionName,
      dmnResourceDefinitionKey,
      processDefinitionKey: salesProcessDefinitionKey,
      processId: sales.process.processId,
      processName: sales.process.processName,
    },
  };
}
