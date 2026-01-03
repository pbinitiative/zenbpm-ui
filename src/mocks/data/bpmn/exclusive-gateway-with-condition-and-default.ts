// Exclusive Gateway with Condition and Default - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './exclusive-gateway-with-condition-and-default.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000007',
  version: 1,
  bpmnProcessId: 'exclusive-gateway-with-condition-and-default',
  bpmnProcessName: 'Exclusive Gateway with Condition and Default',
  bpmnResourceName: 'exclusive-gateway-with-condition-and-default.bpmn',
  bpmnData,
  createdAt: '2024-12-10T06:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000091',
    processDefinitionKey: '3000000000000000007',
    bpmnProcessId: 'exclusive-gateway-with-condition-and-default',
    createdAt: hoursAgo(12),
    state: 'active',
    variables: { category: 'premium', discount: 20 },
    activeElementInstances: [{ key: '3100000000000000092', elementId: 'task-a', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000093',
    processDefinitionKey: '3000000000000000007',
    bpmnProcessId: 'exclusive-gateway-with-condition-and-default',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { category: 'standard', discount: 5 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000094',
    processDefinitionKey: '3000000000000000007',
    bpmnProcessId: 'exclusive-gateway-with-condition-and-default',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { category: 'unknown', discount: 0, usedDefault: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
