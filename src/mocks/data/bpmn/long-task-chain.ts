// Long Task Chain - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './long-task-chain.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000016',
  version: 1,
  bpmnProcessId: 'Process_0yo7bdi',
  bpmnProcessName: 'Long Task Chain',
  bpmnResourceName: 'long-task-chain.bpmn',
  bpmnData,
  createdAt: '2024-12-09T21:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000120',
    processDefinitionKey: '3000000000000000016',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { currentStep: 3, totalSteps: 10, payload: { data: 'processing' } },
    activeElementInstances: [{ key: '3100000000000000121', elementId: 'Activity_0tpyafm', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000122',
    processDefinitionKey: '3000000000000000016',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: hoursAgo(8),
    state: 'active',
    variables: { currentStep: 7, totalSteps: 10, payload: { data: 'almost done' } },
    activeElementInstances: [{ key: '3100000000000000123', elementId: 'Activity_06lgjnc', elementType: 'serviceTask' }],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000124',
    processDefinitionKey: '3000000000000000016',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { currentStep: 10, totalSteps: 10, completedAt: daysAgo(0) },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000125',
    processDefinitionKey: '3000000000000000016',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { currentStep: 10, totalSteps: 10 },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
  {
    key: '3100000000000000126',
    processDefinitionKey: '3000000000000000016',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: daysAgo(5),
    state: 'failed',
    variables: { currentStep: 5, totalSteps: 10, error: 'Connection timeout' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000127',
    processDefinitionKey: '3000000000000000016',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: daysAgo(7),
    state: 'completed',
    variables: { currentStep: 10, totalSteps: 10 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '6000000000000000002',
    elementInstanceKey: '3100000000000000121',
    elementId: 'Activity_0tpyafm',
    processInstanceKey: '3100000000000000120',
    processDefinitionKey: '3000000000000000016',
    message: 'External service unavailable - connection refused',
    createdAt: hoursAgo(1),
    executionToken: 'token-315001',
  },
];
