// Service Task Input Output - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './service-task-input-output.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000030',
  version: 1,
  bpmnProcessId: 'service-task-input-output',
  bpmnProcessName: 'Service Task Input Output',
  bpmnResourceName: 'service-task-input-output.bpmn',
  bpmnData,
  createdAt: '2024-12-09T08:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000174',
    processDefinitionKey: '3000000000000000030',
    bpmnProcessId: 'service-task-input-output',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { inputData: { name: 'test', value: 123 }, outputData: null },
    activeElementInstances: [{ key: '3100000000000000175', elementId: 'service-task-1', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000176',
    processDefinitionKey: '3000000000000000030',
    bpmnProcessId: 'service-task-input-output',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { inputData: { name: 'order', value: 456 }, outputData: { result: 'success', processedValue: 912 } },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000177',
    processDefinitionKey: '3000000000000000030',
    bpmnProcessId: 'service-task-input-output',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { inputData: { name: 'batch', value: 789 }, outputData: { result: 'success', processedValue: 1578 } },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
