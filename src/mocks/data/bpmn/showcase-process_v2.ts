// Showcase Process V2 - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo } from '../types';
import bpmnData from './showcase-process_v2.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000034',
  version: 2,
  bpmnProcessId: 'showcase-process',
  bpmnProcessName: 'Showcase Process',
  bpmnResourceName: 'showcase-process_v2.bpmn',
  bpmnData,
  createdAt: '2024-12-10T08:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  // Partition 1
  {
    key: '3100000000000000052',
    processDefinitionKey: '3000000000000000034',
    bpmnProcessId: 'showcase-process',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: {
      customerId: 'CUST-V2-001',
      customerName: 'Michael Scott',
      loanAmount: 65000,
      loanType: 'business',
    },
    activeElementInstances: [
      { key: '3100000000000000053', elementId: 'task-notify', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000054',
    processDefinitionKey: '3000000000000000034',
    bpmnProcessId: 'showcase-process',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: {
      customerId: 'CUST-V2-002',
      customerName: 'Pam Beesly',
      loanAmount: 42000,
    },
    activeElementInstances: [
      { key: '3100000000000000055', elementId: 'task-a', elementType: 'userTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000056',
    processDefinitionKey: '3000000000000000034',
    bpmnProcessId: 'showcase-process',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: {
      customerId: 'CUST-V2-003',
      customerName: 'Jim Halpert',
      loanAmount: 88000,
      approved: true,
    },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  // Partition 2
  {
    key: '3100000000000000057',
    processDefinitionKey: '3000000000000000034',
    bpmnProcessId: 'showcase-process',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: {
      customerId: 'CUST-V2-101',
      customerName: 'Dwight Schrute',
      loanAmount: 150000,
    },
    activeElementInstances: [
      { key: '3100000000000000058', elementId: 'task-b', elementType: 'userTask' },
    ],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000059',
    processDefinitionKey: '3000000000000000034',
    bpmnProcessId: 'showcase-process',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: {
      customerId: 'CUST-V2-102',
      customerName: 'Angela Martin',
      loanAmount: 35000,
    },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
