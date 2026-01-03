// Simple Link Event Output Variables - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple-link-event-output-variables.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000043',
  version: 1,
  bpmnProcessId: 'simple-link-event-output-variables',
  bpmnProcessName: 'Simple Link Event Output Variables',
  bpmnResourceName: 'simple-link-event-output-variables.bpmn',
  bpmnData,
  createdAt: '2024-12-08T21:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000202',
    processDefinitionKey: '3000000000000000043',
    bpmnProcessId: 'simple-link-event-output-variables',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: { sourceVar: 'data', outputVar: null },
    activeElementInstances: [{ key: '3100000000000000203', elementId: 'Task', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000204',
    processDefinitionKey: '3000000000000000043',
    bpmnProcessId: 'simple-link-event-output-variables',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { sourceVar: 'test', outputVar: 'processed_test' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
