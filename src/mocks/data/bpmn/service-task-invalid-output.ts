// Service Task Invalid Output - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './service-task-invalid-output.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000032',
  version: 1,
  bpmnProcessId: 'service-task-invalid-output',
  bpmnProcessName: 'Service Task Invalid Output',
  bpmnResourceName: 'service-task-invalid-output.bpmn',
  bpmnData,
  createdAt: '2024-12-09T06:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000181',
    processDefinitionKey: '3000000000000000032',
    bpmnProcessId: 'service-task-invalid-output',
    createdAt: hoursAgo(5),
    state: 'active',
    variables: { inputValid: true, outputMapping: 'invalid_expression' },
    activeElementInstances: [{ key: '3100000000000000182', elementId: 'invalid-output', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000183',
    processDefinitionKey: '3000000000000000032',
    bpmnProcessId: 'service-task-invalid-output',
    createdAt: daysAgo(3),
    state: 'failed',
    variables: { inputValid: true, error: 'Output mapping failed' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '6000000000000000005',
    elementInstanceKey: '3100000000000000182',
    elementId: 'invalid-output',
    processInstanceKey: '3100000000000000181',
    processDefinitionKey: '3000000000000000032',
    message: 'Output mapping expression failed: undefined variable "result.nonExistentField"',
    createdAt: hoursAgo(5),
    executionToken: 'token-329001',
  },
];
