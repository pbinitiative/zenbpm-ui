// Simple Task with Type - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple-task-with-type.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000045',
  version: 1,
  bpmnProcessId: 'simple-task-with-type',
  bpmnProcessName: 'Simple Task with Type',
  bpmnResourceName: 'simple-task-with-type.bpmn',
  bpmnData,
  createdAt: '2024-12-08T19:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000205',
    processDefinitionKey: '3000000000000000045',
    bpmnProcessId: 'simple-task-with-type',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { taskType: 'email-sender', recipient: 'user@example.com' },
    activeElementInstances: [{ key: '3100000000000000206', elementId: 'id', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000207',
    processDefinitionKey: '3000000000000000045',
    bpmnProcessId: 'simple-task-with-type',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { taskType: 'email-sender', recipient: 'admin@example.com', sent: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000208',
    processDefinitionKey: '3000000000000000045',
    bpmnProcessId: 'simple-task-with-type',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { taskType: 'email-sender', recipient: 'support@example.com', sent: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000209',
    processDefinitionKey: '3000000000000000045',
    bpmnProcessId: 'simple-task-with-type',
    createdAt: daysAgo(6),
    state: 'completed',
    variables: { taskType: 'email-sender', recipient: 'sales@example.com', sent: true },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [];
