// Message Multiple Intermediate Catch Events Merged - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-multiple-intermediate-catch-events-merged.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000026',
  version: 1,
  bpmnProcessId: 'message-multiple-intermediate-catch-events-merged',
  bpmnProcessName: 'Message Multiple Intermediate Catch Events Merged',
  bpmnResourceName: 'message-multiple-intermediate-catch-events-merged.bpmn',
  bpmnData,
  createdAt: '2024-12-09T12:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000160',
    processDefinitionKey: '3000000000000000026',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-merged',
    createdAt: hoursAgo(7),
    state: 'active',
    variables: { awaitingMerge: true, receivedEvents: ['Event1'] },
    activeElementInstances: [{ key: '3100000000000000161', elementId: 'event-1-id', elementType: 'intermediateCatchEvent' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000162',
    processDefinitionKey: '3000000000000000026',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-merged',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { awaitingMerge: false, receivedEvents: ['Event1', 'Event2'] },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000163',
    processDefinitionKey: '3000000000000000026',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-merged',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { awaitingMerge: false, receivedEvents: ['Event1', 'Event2'] },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
