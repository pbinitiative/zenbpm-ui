// Message Boundary Event Non-interrupting - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-boundary-event-noninterrupting.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000020',
  version: 1,
  bpmnProcessId: 'message-boundary-event-noninterrupting',
  bpmnProcessName: 'Message Boundary Event Non-interrupting',
  bpmnResourceName: 'message-boundary-event-noninterrupting.bpmn',
  bpmnData,
  createdAt: '2024-12-09T18:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000137',
    processDefinitionKey: '3000000000000000020',
    bpmnProcessId: 'message-boundary-event-noninterrupting',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: { notificationsSent: 2, mainTaskProgress: 50 },
    activeElementInstances: [
      { key: '3100000000000000138', elementId: 'service-task-id', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000139',
    processDefinitionKey: '3000000000000000020',
    bpmnProcessId: 'message-boundary-event-noninterrupting',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { notificationsSent: 5, mainTaskProgress: 100 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
