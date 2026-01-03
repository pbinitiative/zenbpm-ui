// Forked Flow - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './forked-flow.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000012',
  version: 1,
  bpmnProcessId: 'forked-flow',
  bpmnProcessName: 'Forked Flow',
  bpmnResourceName: 'forked-flow.bpmn',
  bpmnData,
  createdAt: '2024-12-10T01:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000102',
    processDefinitionKey: '3000000000000000012',
    bpmnProcessId: 'forked-flow',
    createdAt: hoursAgo(5),
    state: 'active',
    variables: { flowType: 'parallel', branchCount: 3 },
    activeElementInstances: [
      { key: '3100000000000000103', elementId: 'id-b-1', elementType: 'serviceTask' },
      { key: '3100000000000000104', elementId: 'id-b-2', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000105',
    processDefinitionKey: '3000000000000000012',
    bpmnProcessId: 'forked-flow',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { flowType: 'parallel', branchCount: 3 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000106',
    processDefinitionKey: '3000000000000000012',
    bpmnProcessId: 'forked-flow',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { flowType: 'parallel', branchCount: 3 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000107',
    processDefinitionKey: '3000000000000000012',
    bpmnProcessId: 'forked-flow',
    createdAt: daysAgo(8),
    state: 'terminated',
    variables: { flowType: 'parallel', terminatedReason: 'manual' },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [];
