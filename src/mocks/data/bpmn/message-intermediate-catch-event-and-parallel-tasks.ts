// Message Intermediate Catch Event and Parallel Tasks - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './message-intermediate-catch-event-and-parallel-tasks.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000021',
  version: 1,
  bpmnProcessId: 'message-intermediate-catch-event-and-parallel-tasks',
  bpmnProcessName: 'Message Intermediate Catch Event and Parallel Tasks',
  bpmnResourceName: 'message-intermediate-catch-event-and-parallel-tasks.bpmn',
  bpmnData,
  createdAt: '2024-12-09T17:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  // Partition 4
  {
    key: '3100000000000000050',
    processDefinitionKey: '3000000000000000021',
    bpmnProcessId: 'message-intermediate-catch-event-and-parallel-tasks',
    createdAt: daysAgo(3),
    state: 'active',
    variables: { orderId: 'ORD-2024-309', orderTotal: 279.50 },
    activeElementInstances: [{ key: '3100000000000000013', elementId: 'IntermediateCatchEvent_1', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000051',
    processDefinitionKey: '3000000000000000021',
    bpmnProcessId: 'message-intermediate-catch-event-and-parallel-tasks',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { orderId: 'ORD-2024-310', orderTotal: 499.99 },
    activeElementInstances: [],
    history: [],
    partition: 4,
  },
];

export const incidents: MockIncident[] = [];
