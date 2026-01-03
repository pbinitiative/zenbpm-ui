// Simple Intermediate Message Catch Event - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple-intermediate-message-catch-event.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000041',
  version: 1,
  bpmnProcessId: 'simple-intermediate-message-catch-event',
  bpmnProcessName: 'Simple Intermediate Message Catch Event',
  bpmnResourceName: 'simple-intermediate-message-catch-event.bpmn',
  bpmnData,
  createdAt: '2024-12-08T23:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000192',
    processDefinitionKey: '3000000000000000041',
    bpmnProcessId: 'simple-intermediate-message-catch-event',
    createdAt: hoursAgo(8),
    state: 'active',
    variables: { correlationKey: 'MSG-001', awaiting: true },
    activeElementInstances: [{ key: '3100000000000000193', elementId: 'IntermediateCatchEvent_1', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000194',
    processDefinitionKey: '3000000000000000041',
    bpmnProcessId: 'simple-intermediate-message-catch-event',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { correlationKey: 'MSG-002', messageReceived: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000195',
    processDefinitionKey: '3000000000000000041',
    bpmnProcessId: 'simple-intermediate-message-catch-event',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { correlationKey: 'MSG-003', messageReceived: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
