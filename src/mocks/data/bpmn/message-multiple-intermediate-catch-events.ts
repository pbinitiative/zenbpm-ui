// Message Multiple Intermediate Catch Events - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-multiple-intermediate-catch-events.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000028',
  version: 1,
  bpmnProcessId: 'message-multiple-intermediate-catch-events',
  bpmnProcessName: 'Message Multiple Intermediate Catch Events',
  bpmnResourceName: 'message-multiple-intermediate-catch-events.bpmn',
  bpmnData,
  createdAt: '2024-12-09T10:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000153',
    processDefinitionKey: '3000000000000000028',
    bpmnProcessId: 'message-multiple-intermediate-catch-events',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: { messagesReceived: 1, totalExpected: 3 },
    activeElementInstances: [{ key: '3100000000000000154', elementId: 'IntermediateCatchEvent_2', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000155',
    processDefinitionKey: '3000000000000000028',
    bpmnProcessId: 'message-multiple-intermediate-catch-events',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { messagesReceived: 3, totalExpected: 3 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000156',
    processDefinitionKey: '3000000000000000028',
    bpmnProcessId: 'message-multiple-intermediate-catch-events',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { messagesReceived: 3, totalExpected: 3 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000157',
    processDefinitionKey: '3000000000000000028',
    bpmnProcessId: 'message-multiple-intermediate-catch-events',
    createdAt: daysAgo(6),
    state: 'terminated',
    variables: { messagesReceived: 1, terminationReason: 'timeout' },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [];
