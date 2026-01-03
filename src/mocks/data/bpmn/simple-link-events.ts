// Simple Link Events - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './simple-link-events.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000044',
  version: 1,
  bpmnProcessId: 'simple-link-events',
  bpmnProcessName: 'Simple Link Events',
  bpmnResourceName: 'simple-link-events.bpmn',
  bpmnData,
  createdAt: '2024-12-08T20:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000199',
    processDefinitionKey: '3000000000000000044',
    bpmnProcessId: 'simple-link-events',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { linkTarget: 'SectionB', linkExecuted: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000200',
    processDefinitionKey: '3000000000000000044',
    bpmnProcessId: 'simple-link-events',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { linkTarget: 'SectionC', linkExecuted: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
