// Timer Boundary Event Interrupting - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './timer-boundary-event-interrupting.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000053',
  version: 1,
  bpmnProcessId: 'timer-boundary-event-interrupting',
  bpmnProcessName: 'Timer Boundary Event Interrupting',
  bpmnResourceName: 'timer-boundary-event-interrupting.bpmn',
  bpmnData,
  createdAt: '2024-12-08T12:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000224',
    processDefinitionKey: '3000000000000000053',
    bpmnProcessId: 'timer-boundary-event-interrupting',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { timeoutDuration: 'PT2H', taskStarted: hoursAgo(1) },
    activeElementInstances: [{ key: '3100000000000000225', elementId: 'service-task-id', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000226',
    processDefinitionKey: '3000000000000000053',
    bpmnProcessId: 'timer-boundary-event-interrupting',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { timeoutDuration: 'PT1H', timedOut: false },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000227',
    processDefinitionKey: '3000000000000000053',
    bpmnProcessId: 'timer-boundary-event-interrupting',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { timeoutDuration: 'PT30M', timedOut: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000228',
    processDefinitionKey: '3000000000000000053',
    bpmnProcessId: 'timer-boundary-event-interrupting',
    createdAt: daysAgo(6),
    state: 'completed',
    variables: { timeoutDuration: 'PT1H', timedOut: false },
    activeElementInstances: [],
    history: [],
    partition: 3,
  },
];

export const incidents: MockIncident[] = [];
