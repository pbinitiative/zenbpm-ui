// Showcase Process V3 - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo } from '../types';
import bpmnData from './showcase-process_v3.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000035',
  version: 3,
  bpmnProcessId: 'showcase-process',
  bpmnProcessName: 'Showcase Process',
  bpmnResourceName: 'showcase-process_v3.bpmn',
  bpmnData,
  createdAt: '2024-12-11T10:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  // Partition 1 - Latest version, most instances are here
  {
    key: '3100000000000000060',
    processDefinitionKey: '3000000000000000035',
    bpmnProcessId: 'showcase-process',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: {
      customerId: 'CUST-V3-001',
      customerName: 'Walter White',
      loanAmount: 95000,
      loanType: 'business',
    },
    activeElementInstances: [
      { key: '3100000000000000061', elementId: 'task-audit', elementType: 'userTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000062',
    processDefinitionKey: '3000000000000000035',
    bpmnProcessId: 'showcase-process',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: {
      customerId: 'CUST-V3-002',
      customerName: 'Jesse Pinkman',
      loanAmount: 28000,
    },
    activeElementInstances: [
      { key: '3100000000000000063', elementId: 'task-a', elementType: 'userTask' },
    ],
    history: [],
    partition: 1,
  },
  // Partition 2
  {
    key: '3100000000000000064',
    processDefinitionKey: '3000000000000000035',
    bpmnProcessId: 'showcase-process',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: {
      customerId: 'CUST-V3-101',
      customerName: 'Saul Goodman',
      loanAmount: 175000,
    },
    activeElementInstances: [
      { key: '3100000000000000065', elementId: 'task-b', elementType: 'userTask' },
    ],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
