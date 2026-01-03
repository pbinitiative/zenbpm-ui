// Simple Intermediate Message Catch Event Broken - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple-intermediate-message-catch-event-broken.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000040',
  version: 1,
  bpmnProcessId: 'simple-intermediate-message-catch-event-broken',
  bpmnProcessName: 'Simple Intermediate Message Catch Event Broken',
  bpmnResourceName: 'simple-intermediate-message-catch-event-broken.bpmn',
  bpmnData,
  createdAt: '2024-12-09T00:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000196',
    processDefinitionKey: '3000000000000000040',
    bpmnProcessId: 'simple-intermediate-message-catch-event-broken',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { brokenConfig: true, errorExpected: true },
    activeElementInstances: [{ key: '3100000000000000197', elementId: 'msg', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000198',
    processDefinitionKey: '3000000000000000040',
    bpmnProcessId: 'simple-intermediate-message-catch-event-broken',
    createdAt: daysAgo(3),
    state: 'failed',
    variables: { brokenConfig: true, error: 'Message subscription failed' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '6000000000000000006',
    elementInstanceKey: '3100000000000000197',
    elementId: 'msg',
    processInstanceKey: '3100000000000000196',
    processDefinitionKey: '3000000000000000040',
    message: 'Message subscription creation failed: invalid correlation key expression',
    createdAt: hoursAgo(2),
    executionToken: 'token-335001',
  },
];
