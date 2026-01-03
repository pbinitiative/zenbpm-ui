// Message Intermediate Timer Event - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-intermediate-timer-event.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000024',
  version: 1,
  bpmnProcessId: 'message-intermediate-timer-event',
  bpmnProcessName: 'Message Intermediate Timer Event',
  bpmnResourceName: 'message-intermediate-timer-event.bpmn',
  bpmnData,
  createdAt: '2024-12-09T14:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000149',
    processDefinitionKey: '3000000000000000024',
    bpmnProcessId: 'message-intermediate-timer-event',
    createdAt: hoursAgo(5),
    state: 'active',
    variables: { timerDuration: 'PT1H', scheduledFire: hoursAgo(4) },
    activeElementInstances: [{ key: '3100000000000000150', elementId: 'timer1', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000151',
    processDefinitionKey: '3000000000000000024',
    bpmnProcessId: 'message-intermediate-timer-event',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { timerDuration: 'PT30M', timerFired: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000152',
    processDefinitionKey: '3000000000000000024',
    bpmnProcessId: 'message-intermediate-timer-event',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { timerDuration: 'PT2H', timerFired: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
