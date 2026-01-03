// Exclusive Gateway with Condition - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './exclusive-gateway-with-condition.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000008',
  version: 1,
  bpmnProcessId: 'exclusive-gateway-with-condition',
  bpmnProcessName: 'Exclusive Gateway with Condition',
  bpmnResourceName: 'exclusive-gateway-with-condition.bpmn',
  bpmnData,
  createdAt: '2024-12-10T05:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000088',
    processDefinitionKey: '3000000000000000008',
    bpmnProcessId: 'exclusive-gateway-with-condition',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { amount: 1500, conditionMet: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000089',
    processDefinitionKey: '3000000000000000008',
    bpmnProcessId: 'exclusive-gateway-with-condition',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { amount: 500, conditionMet: false },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000090',
    processDefinitionKey: '3000000000000000008',
    bpmnProcessId: 'exclusive-gateway-with-condition',
    createdAt: daysAgo(7),
    state: 'completed',
    variables: { amount: 2000, conditionMet: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
