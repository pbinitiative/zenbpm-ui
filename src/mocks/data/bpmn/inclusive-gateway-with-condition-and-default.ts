// Inclusive Gateway with Condition and Default - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './inclusive-gateway-with-condition-and-default.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000014',
  version: 1,
  bpmnProcessId: 'inclusive-gateway-with-condition-and-default',
  bpmnProcessName: 'Inclusive Gateway with Condition and Default',
  bpmnResourceName: 'inclusive-gateway-with-condition-and-default.bpmn',
  bpmnData,
  createdAt: '2024-12-09T23:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000116',
    processDefinitionKey: '3000000000000000014',
    bpmnProcessId: 'inclusive-gateway-with-condition-and-default',
    createdAt: hoursAgo(6),
    state: 'active',
    variables: { orderType: 'express', requiresApproval: true },
    activeElementInstances: [{ key: '3100000000000000117', elementId: 'task-a', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000118',
    processDefinitionKey: '3000000000000000014',
    bpmnProcessId: 'inclusive-gateway-with-condition-and-default',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { orderType: 'standard', requiresApproval: false },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000119',
    processDefinitionKey: '3000000000000000014',
    bpmnProcessId: 'inclusive-gateway-with-condition-and-default',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { orderType: 'unknown', usedDefault: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
