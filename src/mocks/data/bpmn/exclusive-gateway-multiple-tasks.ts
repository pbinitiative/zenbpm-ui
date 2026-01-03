// Exclusive Gateway Multiple Tasks - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './exclusive-gateway-multiple-tasks.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000006',
  version: 1,
  bpmnProcessId: 'exclusive-gateway-multiple-tasks',
  bpmnProcessName: 'Exclusive Gateway Multiple Tasks',
  bpmnResourceName: 'exclusive-gateway-multiple-tasks.bpmn',
  bpmnData,
  createdAt: '2024-12-10T07:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000081',
    processDefinitionKey: '3000000000000000006',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks',
    createdAt: hoursAgo(4),
    state: 'active',
    variables: { route: 'A', priority: 'high' },
    activeElementInstances: [{ key: '3100000000000000082', elementId: 'task-a', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000083',
    processDefinitionKey: '3000000000000000006',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks',
    createdAt: hoursAgo(8),
    state: 'active',
    variables: { route: 'B', priority: 'medium' },
    activeElementInstances: [{ key: '3100000000000000084', elementId: 'task-b', elementType: 'serviceTask' }],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000085',
    processDefinitionKey: '3000000000000000006',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { route: 'C', priority: 'low' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000086',
    processDefinitionKey: '3000000000000000006',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { route: 'A', priority: 'high' },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
  {
    key: '3100000000000000087',
    processDefinitionKey: '3000000000000000006',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks',
    createdAt: daysAgo(5),
    state: 'terminated',
    variables: { route: 'B', priority: 'low', terminatedBy: 'admin' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
