// Simple User Task V2 - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo } from '../types';
import bpmnData from './simple-user-task_v2.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000048',
  version: 2,
  bpmnProcessId: 'simple-user-task',
  bpmnProcessName: 'Simple User Task',
  bpmnResourceName: 'simple-user-task_v2.bpmn',
  bpmnData,
  createdAt: '2024-12-10T14:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000229',
    processDefinitionKey: '3000000000000000048',
    bpmnProcessId: 'simple-user-task',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { assignee: 'mike.ross', taskTitle: 'Process Invoice' },
    activeElementInstances: [
      { key: '3100000000000000230', elementId: 'user-task', elementType: 'userTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000231',
    processDefinitionKey: '3000000000000000048',
    bpmnProcessId: 'simple-user-task',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: { assignee: 'harvey.specter', taskTitle: 'Review Contract' },
    activeElementInstances: [
      { key: '3100000000000000232', elementId: 'review-task', elementType: 'userTask' },
    ],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000233',
    processDefinitionKey: '3000000000000000048',
    bpmnProcessId: 'simple-user-task',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { assignee: 'donna.paulsen', taskTitle: 'Schedule Meeting', approved: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
