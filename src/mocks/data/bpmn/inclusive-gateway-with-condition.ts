// Inclusive Gateway with Condition - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './inclusive-gateway-with-condition.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000015',
  version: 1,
  bpmnProcessId: 'inclusive-gateway-with-condition',
  bpmnProcessName: 'Inclusive Gateway with Condition',
  bpmnResourceName: 'inclusive-gateway-with-condition.bpmn',
  bpmnData,
  createdAt: '2024-12-09T22:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000114',
    processDefinitionKey: '3000000000000000015',
    bpmnProcessId: 'inclusive-gateway-with-condition',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { score: 85, threshold: 70 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000115',
    processDefinitionKey: '3000000000000000015',
    bpmnProcessId: 'inclusive-gateway-with-condition',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { score: 45, threshold: 70 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
