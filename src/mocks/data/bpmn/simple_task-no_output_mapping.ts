// Simple Task No Output Mapping - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './simple_task-no_output_mapping.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000049',
  version: 1,
  bpmnProcessId: 'simple_task-no_output_mapping',
  bpmnProcessName: 'Simple Task No Output Mapping',
  bpmnResourceName: 'simple_task-no_output_mapping.bpmn',
  bpmnData,
  createdAt: '2024-12-08T17:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000212',
    processDefinitionKey: '3000000000000000049',
    bpmnProcessId: 'simple_task-no_output_mapping',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { input: 'test-data' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000213',
    processDefinitionKey: '3000000000000000049',
    bpmnProcessId: 'simple_task-no_output_mapping',
    createdAt: daysAgo(4),
    state: 'completed',
    variables: { input: 'another-test' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
