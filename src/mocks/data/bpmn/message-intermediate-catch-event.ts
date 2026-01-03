// Message Intermediate Catch Event - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-intermediate-catch-event.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000022',
  version: 1,
  bpmnProcessId: 'message-intermediate-catch-event',
  bpmnProcessName: 'Message Intermediate Catch Event',
  bpmnResourceName: 'message-intermediate-catch-event.bpmn',
  bpmnData,
  createdAt: '2024-12-09T16:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000140',
    processDefinitionKey: '3000000000000000022',
    bpmnProcessId: 'message-intermediate-catch-event',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { orderId: 'ORD-501', waitingForConfirmation: true },
    activeElementInstances: [{ key: '3100000000000000141', elementId: 'id-1', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000142',
    processDefinitionKey: '3000000000000000022',
    bpmnProcessId: 'message-intermediate-catch-event',
    createdAt: hoursAgo(18),
    state: 'active',
    variables: { orderId: 'ORD-502', waitingForConfirmation: true },
    activeElementInstances: [{ key: '3100000000000000143', elementId: 'id-1', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000144',
    processDefinitionKey: '3000000000000000022',
    bpmnProcessId: 'message-intermediate-catch-event',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { orderId: 'ORD-503', confirmed: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000145',
    processDefinitionKey: '3000000000000000022',
    bpmnProcessId: 'message-intermediate-catch-event',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { orderId: 'ORD-504', confirmed: true },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [];
