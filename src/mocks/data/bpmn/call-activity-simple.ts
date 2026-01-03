// Call Activity Simple - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './call-activity-simple.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000001',
  version: 1,
  bpmnProcessId: 'Simple_CallActivity_Process',
  bpmnProcessName: 'Call Activity Simple',
  bpmnResourceName: 'call-activity-simple.bpmn',
  bpmnData,
  createdAt: '2024-12-10T12:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000066',
    processDefinitionKey: '3000000000000000001',
    bpmnProcessId: 'Simple_CallActivity_Process',
    createdAt: daysAgo(2),
    state: 'active',
    variables: { callId: 'CALL-001', caller: 'system' },
    activeElementInstances: [{ key: '3100000000000000067', elementId: 'callActivity', elementType: 'callActivity' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000068',
    processDefinitionKey: '3000000000000000001',
    bpmnProcessId: 'Simple_CallActivity_Process',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { callId: 'CALL-002', caller: 'admin' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000069',
    processDefinitionKey: '3000000000000000001',
    bpmnProcessId: 'Simple_CallActivity_Process',
    createdAt: daysAgo(7),
    state: 'completed',
    variables: { callId: 'CALL-003', caller: 'user1' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
