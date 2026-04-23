// Multi-Instance Pagination - mock data
// Used in e2e tests to verify sectioned pagination in HistoryTab.
// The parent instance has 2 multiInstance children, each with 8 history entries,
// so pagination kicks in when pageSize < 8 (e.g. the default of 5 is not enough).
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, addMinutes } from '../types';
import bpmnData from './multi-instance-pagination.bpmn?raw';
import {
  MULTI_INSTANCE_PARENT_KEY,
  MULTI_INSTANCE_CHILD_A_KEY,
  MULTI_INSTANCE_CHILD_B_KEY,
  MULTI_INSTANCE_PROCESS_DEFINITION_KEY,
} from '../well-known-keys';

export const definition: MockProcessDefinition = {
  key: MULTI_INSTANCE_PROCESS_DEFINITION_KEY,
  version: 1,
  bpmnProcessId: 'Multi_Instance_Pagination_Process',
  bpmnProcessName: 'Multi Instance Pagination',
  bpmnResourceName: 'multi-instance-pagination.bpmn',
  bpmnData,
  createdAt: '2025-01-01T10:00:00.000Z',
};

// 8 history entries per child: StartEvent + Task1..6 + EndEvent
const buildChildHistory = (instanceKey: string, baseDate: string) => {
  const steps = [
    { id: 'StartEvent_1', type: 'startEvent' },
    { id: 'Task_1', type: 'serviceTask' },
    { id: 'Task_2', type: 'serviceTask' },
    { id: 'Task_3', type: 'serviceTask' },
    { id: 'Task_4', type: 'serviceTask' },
    { id: 'Task_5', type: 'serviceTask' },
    { id: 'Task_6', type: 'serviceTask' },
    { id: 'EndEvent_1', type: 'endEvent' },
  ];

  return steps.map((step, index) => {
    const startedAt = addMinutes(baseDate, index * 5);
    const completedAt = addMinutes(baseDate, index * 5 + 4);
    return {
      key: `${instanceKey}${String(index + 1).padStart(3, '0')}`,
      elementId: step.id,
      elementType: step.type,
      state: 'completed' as const,
      startedAt,
      completedAt,
    };
  });
};

const parentCreatedAt = daysAgo(1);
const childACreatedAt = addMinutes(parentCreatedAt, 1);
const childBCreatedAt = addMinutes(parentCreatedAt, 2);

export const instances: MockProcessInstance[] = [
  // Parent process instance — no history of its own beyond the start event
  {
    key: MULTI_INSTANCE_PARENT_KEY,
    processDefinitionKey: MULTI_INSTANCE_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'Multi_Instance_Pagination_Process',
    createdAt: parentCreatedAt,
    state: 'completed',
    processType: 'default',
    variables: { loopCount: 2 },
    activeElementInstances: [],
    history: [
      {
        key: `${MULTI_INSTANCE_PARENT_KEY}001`,
        elementId: 'StartEvent_1',
        elementType: 'startEvent',
        state: 'completed',
        startedAt: parentCreatedAt,
        completedAt: addMinutes(parentCreatedAt, 1),
      },
    ],
    partition: 1,
  },

  // Child A — 8 history entries (exceeds default pageSize of 5)
  {
    key: MULTI_INSTANCE_CHILD_A_KEY,
    processDefinitionKey: MULTI_INSTANCE_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'Multi_Instance_Pagination_Process',
    createdAt: childACreatedAt,
    state: 'completed',
    processType: 'multiInstance',
    variables: { loopIndex: 0 },
    activeElementInstances: [],
    history: buildChildHistory(MULTI_INSTANCE_CHILD_A_KEY, childACreatedAt),
    partition: 1,
    parentProcessInstanceKey: MULTI_INSTANCE_PARENT_KEY,
  },

  // Child B — 8 history entries (exceeds default pageSize of 5)
  {
    key: MULTI_INSTANCE_CHILD_B_KEY,
    processDefinitionKey: MULTI_INSTANCE_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'Multi_Instance_Pagination_Process',
    createdAt: childBCreatedAt,
    state: 'completed',
    processType: 'multiInstance',
    variables: { loopIndex: 1 },
    activeElementInstances: [],
    history: buildChildHistory(MULTI_INSTANCE_CHILD_B_KEY, childBCreatedAt),
    partition: 1,
    parentProcessInstanceKey: MULTI_INSTANCE_PARENT_KEY,
  },
];

export const incidents: MockIncident[] = [];
