// Fork Controlled Parallel Join - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './fork-controlled-parallel-join.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000010',
  version: 1,
  bpmnProcessId: 'fork-controlled-parallel-join',
  bpmnProcessName: 'Fork Controlled Parallel Join',
  bpmnResourceName: 'fork-controlled-parallel-join.bpmn',
  bpmnData,
  createdAt: '2024-12-10T03:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000097',
    processDefinitionKey: '3000000000000000010',
    bpmnProcessId: 'fork-controlled-parallel-join',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: { parallelBranches: 2, completedBranches: 1 },
    activeElementInstances: [{ key: '3100000000000000098', elementId: 'id-a-2', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000099',
    processDefinitionKey: '3000000000000000010',
    bpmnProcessId: 'fork-controlled-parallel-join',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { parallelBranches: 2, completedBranches: 2 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000100',
    processDefinitionKey: '3000000000000000010',
    bpmnProcessId: 'fork-controlled-parallel-join',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { parallelBranches: 2, completedBranches: 2 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
