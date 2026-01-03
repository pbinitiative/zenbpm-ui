// Fork Controlled Exclusive Join - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './fork-controlled-exclusive-join.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000009',
  version: 1,
  bpmnProcessId: 'fork-controlled-exclusive-join',
  bpmnProcessName: 'Fork Controlled Exclusive Join',
  bpmnResourceName: 'fork-controlled-exclusive-join.bpmn',
  bpmnData,
  createdAt: '2024-12-10T04:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000095',
    processDefinitionKey: '3000000000000000009',
    bpmnProcessId: 'fork-controlled-exclusive-join',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { forkPath: 'left', joinedAt: '2024-12-08T10:00:00Z' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000096',
    processDefinitionKey: '3000000000000000009',
    bpmnProcessId: 'fork-controlled-exclusive-join',
    createdAt: daysAgo(6),
    state: 'completed',
    variables: { forkPath: 'right', joinedAt: '2024-12-05T14:30:00Z' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
