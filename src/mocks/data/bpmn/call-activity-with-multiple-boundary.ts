// Call Activity with Multiple Boundary - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './call-activity-with-multiple-boundary.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000004',
  version: 1,
  bpmnProcessId: 'call-activity-with-multiple-boundary',
  bpmnProcessName: 'Call Activity with Multiple Boundary',
  bpmnResourceName: 'call-activity-with-multiple-boundary.bpmn',
  bpmnData,
  createdAt: '2024-12-10T09:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000073',
    processDefinitionKey: '3000000000000000004',
    bpmnProcessId: 'call-activity-with-multiple-boundary',
    createdAt: hoursAgo(6),
    state: 'active',
    variables: { retryCount: 0, maxRetries: 3 },
    activeElementInstances: [{ key: '3100000000000000074', elementId: 'callActivity', elementType: 'callActivity' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000075',
    processDefinitionKey: '3000000000000000004',
    bpmnProcessId: 'call-activity-with-multiple-boundary',
    createdAt: daysAgo(2),
    state: 'failed',
    variables: { retryCount: 3, maxRetries: 3, errorCode: 'TIMEOUT' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000076',
    processDefinitionKey: '3000000000000000004',
    bpmnProcessId: 'call-activity-with-multiple-boundary',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { retryCount: 1, maxRetries: 3 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000077',
    processDefinitionKey: '3000000000000000004',
    bpmnProcessId: 'call-activity-with-multiple-boundary',
    createdAt: daysAgo(6),
    state: 'completed',
    variables: { retryCount: 0, maxRetries: 3 },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '6000000000000000001',
    elementInstanceKey: '3100000000000000074',
    elementId: 'callActivity',
    processInstanceKey: '3100000000000000073',
    processDefinitionKey: '3000000000000000004',
    message: 'Called process timed out after 30 seconds',
    createdAt: hoursAgo(2),
    executionToken: 'token-303001',
  },
];
