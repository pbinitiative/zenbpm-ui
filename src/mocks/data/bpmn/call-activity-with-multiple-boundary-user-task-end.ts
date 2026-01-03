// Call Activity with Multiple Boundary User Task End - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo } from '../types';
import bpmnData from './call-activity-with-multiple-boundary-user-task-end.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000003',
  version: 1,
  bpmnProcessId: 'call-activity-with-multiple-boundary-user-task-end',
  bpmnProcessName: 'Call Activity with Multiple Boundary User Task End',
  bpmnResourceName: 'call-activity-with-multiple-boundary-user-task-end.bpmn',
  bpmnData,
  createdAt: '2024-12-10T10:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000078',
    processDefinitionKey: '3000000000000000003',
    bpmnProcessId: 'call-activity-with-multiple-boundary-user-task-end',
    createdAt: daysAgo(1),
    state: 'active',
    variables: { approver: 'manager@example.com', approved: null },
    activeElementInstances: [{ key: '3100000000000000079', elementId: 'userTask', elementType: 'userTask' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000080',
    processDefinitionKey: '3000000000000000003',
    bpmnProcessId: 'call-activity-with-multiple-boundary-user-task-end',
    createdAt: daysAgo(5),
    state: 'completed',
    variables: { approver: 'admin@example.com', approved: true },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
];

export const incidents: MockIncident[] = [];
