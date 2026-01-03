// Service Task Invalid Input - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './service-task-invalid-input.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000031',
  version: 1,
  bpmnProcessId: 'service-task-invalid-input',
  bpmnProcessName: 'Service Task Invalid Input',
  bpmnResourceName: 'service-task-invalid-input.bpmn',
  bpmnData,
  createdAt: '2024-12-09T07:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000178',
    processDefinitionKey: '3000000000000000031',
    bpmnProcessId: 'service-task-invalid-input',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: { invalidInput: null, expectedError: true },
    activeElementInstances: [{ key: '3100000000000000179', elementId: 'invalid-input', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000180',
    processDefinitionKey: '3000000000000000031',
    bpmnProcessId: 'service-task-invalid-input',
    createdAt: daysAgo(2),
    state: 'failed',
    variables: { invalidInput: 'malformed', error: 'Input validation failed' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '6000000000000000004',
    elementInstanceKey: '3100000000000000179',
    elementId: 'invalid-input',
    processInstanceKey: '3100000000000000178',
    processDefinitionKey: '3000000000000000031',
    message: 'FEEL expression evaluation failed: Cannot read property "value" of null',
    createdAt: hoursAgo(3),
    executionToken: 'token-328001',
  },
];
