// Simple Task with Output Mapping - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './simple_task-with_output_mapping.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000050',
  version: 1,
  bpmnProcessId: 'simple_task-with_output_mapping',
  bpmnProcessName: 'Simple Task with Output Mapping',
  bpmnResourceName: 'simple_task-with_output_mapping.bpmn',
  bpmnData,
  createdAt: '2024-12-08T16:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000214',
    processDefinitionKey: '3000000000000000050',
    bpmnProcessId: 'simple_task-with_output_mapping',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { input: 'processing', mappedOutput: null },
    activeElementInstances: [{ key: '3100000000000000215', elementId: 'id', elementType: 'serviceTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000216',
    processDefinitionKey: '3000000000000000050',
    bpmnProcessId: 'simple_task-with_output_mapping',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { input: 'original', mappedOutput: 'transformed_original' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000217',
    processDefinitionKey: '3000000000000000050',
    bpmnProcessId: 'simple_task-with_output_mapping',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { input: 'data', mappedOutput: 'transformed_data' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
