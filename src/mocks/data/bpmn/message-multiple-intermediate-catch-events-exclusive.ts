// Message Multiple Intermediate Catch Events Exclusive - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './message-multiple-intermediate-catch-events-exclusive.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000025',
  version: 1,
  bpmnProcessId: 'message-multiple-intermediate-catch-events-exclusive',
  bpmnProcessName: 'Message Multiple Intermediate Catch Events Exclusive',
  bpmnResourceName: 'message-multiple-intermediate-catch-events-exclusive.bpmn',
  bpmnData,
  createdAt: '2024-12-09T13:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000158',
    processDefinitionKey: '3000000000000000025',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-exclusive',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { selectedMessage: 'MessageA', alternativeIgnored: 'MessageB' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000159',
    processDefinitionKey: '3000000000000000025',
    bpmnProcessId: 'message-multiple-intermediate-catch-events-exclusive',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { selectedMessage: 'MessageB', alternativeIgnored: 'MessageA' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
