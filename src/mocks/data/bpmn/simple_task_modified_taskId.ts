// Simple Task Modified Task ID - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './simple_task_modified_taskId.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000051',
  version: 1,
  bpmnProcessId: 'simple-task-modified-taskId',
  bpmnProcessName: 'Simple Task Modified Task ID',
  bpmnResourceName: 'simple_task_modified_taskId.bpmn',
  bpmnData,
  createdAt: '2024-12-08T14:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000218',
    processDefinitionKey: '3000000000000000051',
    bpmnProcessId: 'simple-task-modified-taskId',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { customTaskId: 'CUSTOM-001' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000219',
    processDefinitionKey: '3000000000000000051',
    bpmnProcessId: 'simple-task-modified-taskId',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { customTaskId: 'CUSTOM-002' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
