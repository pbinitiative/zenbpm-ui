// Simple Link Event Broken - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './simple-link-event-broken.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000042',
  version: 1,
  bpmnProcessId: 'simple-link-event-broken',
  bpmnProcessName: 'Simple Link Event Broken',
  bpmnResourceName: 'simple-link-event-broken.bpmn',
  bpmnData,
  createdAt: '2024-12-08T22:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000201',
    processDefinitionKey: '3000000000000000042',
    bpmnProcessId: 'simple-link-event-broken',
    createdAt: daysAgo(2),
    state: 'failed',
    variables: { linkTarget: 'NonExistent', error: 'Link target not found' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
