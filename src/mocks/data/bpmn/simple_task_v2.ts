// Simple Task V2 - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple_task_v2.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000052',
  version: 2,
  bpmnProcessId: 'Simple_Task_Process',
  bpmnProcessName: 'Simple Task V2',
  bpmnResourceName: 'simple_task_v2.bpmn',
  bpmnData,
  createdAt: '2024-12-08T13:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000220',
    processDefinitionKey: '3000000000000000052',
    bpmnProcessId: 'Simple_Task_Process',
    createdAt: hoursAgo(6),
    state: 'active',
    variables: { version: 2, enhancedFeature: true },
    activeElementInstances: [{ key: '3100000000000000221', elementId: 'id', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000222',
    processDefinitionKey: '3000000000000000052',
    bpmnProcessId: 'Simple_Task_Process',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { version: 2, enhancedFeature: true, result: 'success' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000223',
    processDefinitionKey: '3000000000000000052',
    bpmnProcessId: 'Simple_Task_Process',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { version: 2, enhancedFeature: true, result: 'success' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
