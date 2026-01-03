// Call Activity with Boundary Simple - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './call-activity-with-boundary-simple.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000002',
  version: 1,
  bpmnProcessId: 'call-activity-with-boundary-simple',
  bpmnProcessName: 'Call Activity with Boundary Simple',
  bpmnResourceName: 'call-activity-with-boundary-simple.bpmn',
  bpmnData,
  createdAt: '2024-12-10T11:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000070',
    processDefinitionKey: '3000000000000000002',
    bpmnProcessId: 'call-activity-with-boundary-simple',
    createdAt: daysAgo(1),
    state: 'active',
    variables: { boundaryTriggered: false, timeout: 30000 },
    activeElementInstances: [{ key: '3100000000000000071', elementId: 'callActivity', elementType: 'callActivity' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000072',
    processDefinitionKey: '3000000000000000002',
    bpmnProcessId: 'call-activity-with-boundary-simple',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { boundaryTriggered: true, timeout: 30000 },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
