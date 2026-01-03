// Simple Count Loop - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple-count-loop.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000039',
  version: 1,
  bpmnProcessId: 'simple-count-loop',
  bpmnProcessName: 'Simple Count Loop',
  bpmnResourceName: 'simple-count-loop.bpmn',
  bpmnData,
  createdAt: '2024-12-09T01:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000185',
    processDefinitionKey: '3000000000000000039',
    bpmnProcessId: 'simple-count-loop',
    createdAt: hoursAgo(4),
    state: 'active',
    variables: { counter: 3, maxIterations: 10 },
    activeElementInstances: [{ key: '3100000000000000186', elementId: 'id-increaseCounter', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000187',
    processDefinitionKey: '3000000000000000039',
    bpmnProcessId: 'simple-count-loop',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { counter: 10, maxIterations: 10, loopCompleted: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000188',
    processDefinitionKey: '3000000000000000039',
    bpmnProcessId: 'simple-count-loop',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { counter: 5, maxIterations: 5 },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
