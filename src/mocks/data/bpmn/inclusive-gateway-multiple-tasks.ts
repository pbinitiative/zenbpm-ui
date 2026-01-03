// Inclusive Gateway Multiple Tasks - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './inclusive-gateway-multiple-tasks.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000013',
  version: 1,
  bpmnProcessId: 'inclusive-gateway-multiple-tasks',
  bpmnProcessName: 'Inclusive Gateway Multiple Tasks',
  bpmnResourceName: 'inclusive-gateway-multiple-tasks.bpmn',
  bpmnData,
  createdAt: '2024-12-10T00:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000108',
    processDefinitionKey: '3000000000000000013',
    bpmnProcessId: 'inclusive-gateway-multiple-tasks',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { selectedPaths: ['A', 'B'], completed: [] },
    activeElementInstances: [
      { key: '3100000000000000109', elementId: 'task-a', elementType: 'serviceTask' },
      { key: '3100000000000000110', elementId: 'task-b', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000111',
    processDefinitionKey: '3000000000000000013',
    bpmnProcessId: 'inclusive-gateway-multiple-tasks',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { selectedPaths: ['A', 'C'], completed: ['A', 'C'] },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000112',
    processDefinitionKey: '3000000000000000013',
    bpmnProcessId: 'inclusive-gateway-multiple-tasks',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { selectedPaths: ['B'], completed: ['B'] },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000113',
    processDefinitionKey: '3000000000000000013',
    bpmnProcessId: 'inclusive-gateway-multiple-tasks',
    createdAt: daysAgo(6),
    state: 'completed',
    variables: { selectedPaths: ['A', 'B', 'C'], completed: ['A', 'B', 'C'] },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [];
