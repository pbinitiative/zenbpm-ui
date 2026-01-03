// Parallel Gateway Flow - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './parallel-gateway-flow.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000029',
  version: 1,
  bpmnProcessId: 'parallel-gateway-flow',
  bpmnProcessName: 'Parallel Gateway Flow',
  bpmnResourceName: 'parallel-gateway-flow.bpmn',
  bpmnData,
  createdAt: '2024-12-09T09:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000167',
    processDefinitionKey: '3000000000000000029',
    bpmnProcessId: 'parallel-gateway-flow',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { branches: ['A', 'B', 'C'], completedBranches: ['A'] },
    activeElementInstances: [
      { key: '3100000000000000168', elementId: 'id-b-1', elementType: 'serviceTask' },
      { key: '3100000000000000169', elementId: 'id-b-2', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000170',
    processDefinitionKey: '3000000000000000029',
    bpmnProcessId: 'parallel-gateway-flow',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { branches: ['A', 'B', 'C'], completedBranches: ['A', 'B', 'C'] },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000171',
    processDefinitionKey: '3000000000000000029',
    bpmnProcessId: 'parallel-gateway-flow',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { branches: ['A', 'B', 'C'], completedBranches: ['A', 'B', 'C'] },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000172',
    processDefinitionKey: '3000000000000000029',
    bpmnProcessId: 'parallel-gateway-flow',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { branches: ['A', 'B', 'C'], completedBranches: ['A', 'B', 'C'] },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
  {
    key: '3100000000000000173',
    processDefinitionKey: '3000000000000000029',
    bpmnProcessId: 'parallel-gateway-flow',
    createdAt: daysAgo(8),
    state: 'terminated',
    variables: { branches: ['A', 'B', 'C'], terminatedBy: 'system' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
