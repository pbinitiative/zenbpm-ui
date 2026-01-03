// Simple Count Loop with Message - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple-count-loop-with-message.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000038',
  version: 1,
  bpmnProcessId: 'simple-count-loop-with-message',
  bpmnProcessName: 'Simple Count Loop with Message',
  bpmnResourceName: 'simple-count-loop-with-message.bpmn',
  bpmnData,
  createdAt: '2024-12-09T02:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000189',
    processDefinitionKey: '3000000000000000038',
    bpmnProcessId: 'simple-count-loop-with-message',
    createdAt: hoursAgo(6),
    state: 'active',
    variables: { counter: 2, awaitingMessage: true },
    activeElementInstances: [{ key: '3100000000000000190', elementId: 'id-msg', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000191',
    processDefinitionKey: '3000000000000000038',
    bpmnProcessId: 'simple-count-loop-with-message',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { counter: 5, messagesReceived: 5 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
