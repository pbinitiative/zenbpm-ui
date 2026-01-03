// Message Multiple Intermediate Catch Events Parallel - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-multiple-intermediate-catch-events-parallel.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000027',
  version: 1,
  bpmnProcessId: 'message-multiple-intermediate-catch-events-parallel',
  bpmnProcessName: 'Message Multiple Intermediate Catch Events Parallel',
  bpmnResourceName: 'message-multiple-intermediate-catch-events-parallel.bpmn',
  bpmnData,
  createdAt: '2024-12-09T11:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000164',
    processDefinitionKey: '3000000000000000027',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-parallel',
    createdAt: hoursAgo(4),
    state: 'active',
    variables: { parallelEventsReceived: 1, parallelEventsExpected: 2 },
    activeElementInstances: [
      { key: '3100000000000000165', elementId: 'event-1', elementType: 'intermediateCatchEvent' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000166',
    processDefinitionKey: '3000000000000000027',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-parallel',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { parallelEventsReceived: 2, parallelEventsExpected: 2 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
