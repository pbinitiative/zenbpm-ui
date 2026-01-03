// Long Task Chain V2 - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo } from '../types';
import bpmnData from './long-task-chain_v2.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000017',
  version: 2,
  bpmnProcessId: 'Process_0yo7bdi',
  bpmnProcessName: 'Long Task Chain',
  bpmnResourceName: 'long-task-chain_v2.bpmn',
  bpmnData,
  createdAt: '2024-12-10T16:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000128',
    processDefinitionKey: '3000000000000000017',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { currentStep: 5, totalSteps: 13, payload: { data: 'v2 processing' } },
    activeElementInstances: [
      { key: '3100000000000000129', elementId: 'Activity_0yd39ao', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000130',
    processDefinitionKey: '3000000000000000017',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: hoursAgo(5),
    state: 'active',
    variables: { currentStep: 12, totalSteps: 13, payload: { data: 'validation pending' } },
    activeElementInstances: [
      { key: '3100000000000000131', elementId: 'Activity_Validation', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000132',
    processDefinitionKey: '3000000000000000017',
    bpmnProcessId: 'Process_0yo7bdi',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { currentStep: 13, totalSteps: 13, validated: true },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
