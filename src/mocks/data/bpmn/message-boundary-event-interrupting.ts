// Message Boundary Event Interrupting - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-boundary-event-interrupting.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000019',
  version: 1,
  bpmnProcessId: 'message-boundary-event-interrupting',
  bpmnProcessName: 'Message Boundary Event Interrupting',
  bpmnResourceName: 'message-boundary-event-interrupting.bpmn',
  bpmnData,
  createdAt: '2024-12-09T19:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000133',
    processDefinitionKey: '3000000000000000019',
    bpmnProcessId: 'message-boundary-event-interrupting',
    createdAt: hoursAgo(10),
    state: 'active',
    variables: { taskId: 'TASK-101', awaitingInterrupt: true },
    activeElementInstances: [{ key: '3100000000000000134', elementId: 'service-task-id', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000135',
    processDefinitionKey: '3000000000000000019',
    bpmnProcessId: 'message-boundary-event-interrupting',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { taskId: 'TASK-102', interrupted: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000136',
    processDefinitionKey: '3000000000000000019',
    bpmnProcessId: 'message-boundary-event-interrupting',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { taskId: 'TASK-103', interrupted: false },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
