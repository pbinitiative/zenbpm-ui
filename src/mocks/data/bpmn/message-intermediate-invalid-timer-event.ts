// Message Intermediate Invalid Timer Event - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-intermediate-invalid-timer-event.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000023',
  version: 1,
  bpmnProcessId: 'message-intermediate-invalid-timer-event',
  bpmnProcessName: 'Message Intermediate Invalid Timer Event',
  bpmnResourceName: 'message-intermediate-invalid-timer-event.bpmn',
  bpmnData,
  createdAt: '2024-12-09T15:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000146',
    processDefinitionKey: '3000000000000000023',
    bpmnProcessId: 'message-intermediate-invalid-timer-event',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { timerDuration: 'invalid', errorExpected: true },
    activeElementInstances: [{ key: '3100000000000000147', elementId: 'Event_1uc8qla', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000148',
    processDefinitionKey: '3000000000000000023',
    bpmnProcessId: 'message-intermediate-invalid-timer-event',
    createdAt: daysAgo(2),
    state: 'failed',
    variables: { timerDuration: 'invalid', error: 'Invalid timer expression' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '6000000000000000003',
    elementInstanceKey: '3100000000000000147',
    elementId: 'Event_1uc8qla',
    processInstanceKey: '3100000000000000146',
    processDefinitionKey: '3000000000000000023',
    message: 'Invalid timer duration expression: "invalid" cannot be parsed as ISO 8601 duration',
    createdAt: hoursAgo(1),
    executionToken: 'token-320001',
  },
];
