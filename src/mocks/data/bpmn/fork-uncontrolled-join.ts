// Fork Uncontrolled Join - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './fork-uncontrolled-join.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000011',
  version: 1,
  bpmnProcessId: 'fork-uncontrolled-join',
  bpmnProcessName: 'Fork Uncontrolled Join',
  bpmnResourceName: 'fork-uncontrolled-join.bpmn',
  bpmnData,
  createdAt: '2024-12-10T02:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000101',
    processDefinitionKey: '3000000000000000011',
    bpmnProcessId: 'fork-uncontrolled-join',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { executionCount: 2 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
