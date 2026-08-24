// User Task Classification Tree - mock data
// Minimal fixture for verifying the UI's BPMN-derived User Task identity:
//   - root definition contains a user task with id "shared-task" and a custom-typed service task
//   - the parent process has a child node using a different process definition key, with a
//     service task job that reuses the element id "shared-task" so any non-BPMN-aware
//     classification would misclassify the child as a User Task.
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, addMinutes } from '../types';
import {
  USER_TASK_CLASSIFICATION_PROCESS_DEFINITION_KEY,
  USER_TASK_CLASSIFICATION_CHILD_USER_TASK_INSTANCE_KEY,
  SIMPLE_USER_TASK_PROCESS_DEFINITION_KEY,
} from '../well-known-keys';
import bpmnData from './user-task-classification-tree.bpmn?raw';

export const ROOT_PROCESS_DEFINITION_KEY = USER_TASK_CLASSIFICATION_PROCESS_DEFINITION_KEY;
export const CHILD_PROCESS_DEFINITION_KEY = '3000000000000000093';
export const ROOT_INSTANCE_KEY = '3100000000000000300';
export const CHILD_INSTANCE_KEY = '3100000000000000301';
export const CALL_ELEMENT_ID = 'classification-call';

export const definition: MockProcessDefinition = {
  key: ROOT_PROCESS_DEFINITION_KEY,
  version: 1,
  bpmnProcessId: 'user-task-classification-tree',
  bpmnProcessName: 'User Task Classification Tree',
  bpmnResourceName: 'user-task-classification-tree.bpmn',
  bpmnData,
  createdAt: '2024-12-12T08:00:00.000Z',
};

const rootHistory = [
  {
    key: '3100000000000000300001',
    elementId: 'StartEvent_1',
    elementType: 'startEvent',
    state: 'completed' as const,
    startedAt: hoursAgo(3),
    completedAt: addMinutes(hoursAgo(3), 1),
  },
  {
    key: '3100000000000000300002',
    elementId: 'shared-task',
    elementType: 'userTask',
    state: 'completed' as const,
    startedAt: addMinutes(hoursAgo(3), 1),
    completedAt: addMinutes(hoursAgo(3), 90),
  },
];

const rootInstances: MockProcessInstance[] = [
  {
    key: ROOT_INSTANCE_KEY,
    processDefinitionKey: ROOT_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'user-task-classification-tree',
    createdAt: hoursAgo(3),
    state: 'active',
    variables: {},
    activeElementInstances: [],
    history: rootHistory,
    processType: 'default',
    partition: 1,
  },
];

// A child node sectioned under the root. The job here intentionally reuses the
// element id `shared-task` (defined only in the ROOT process definition) so that
// any classification that ignored processDefinitionKey would mislabel the job
// as a User Task. The UI must NOT show "Assign" for this child.
const childInstances: MockProcessInstance[] = [
  {
    key: CHILD_INSTANCE_KEY,
    processDefinitionKey: CHILD_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'child-classification-process',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: {},
    activeElementInstances: [
      { key: '3100000000000000301002', elementId: 'shared-task', elementType: 'serviceTask' },
    ],
    history: [
      {
        key: '3100000000000000301001',
        elementId: 'StartEvent_1',
        elementType: 'startEvent',
        state: 'completed' as const,
        startedAt: hoursAgo(2),
        completedAt: addMinutes(hoursAgo(2), 1),
      },
    ],
    processType: 'default',
    parentProcessInstanceKey: ROOT_INSTANCE_KEY,
    partition: 1,
  },
  // A second child under the same root, this one invoking a definition that
  // actually contains a `bpmn:userTask id="user-task"` (the simple-user-task
  // definition). Jobs in this child MUST still be classified as User Tasks
  // because classification follows the **child's** processDefinitionKey, not
  // the loaded/root one. This is the false-negative case the previous
  // implementation missed.
  {
    key: USER_TASK_CLASSIFICATION_CHILD_USER_TASK_INSTANCE_KEY,
    processDefinitionKey: SIMPLE_USER_TASK_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'simple-user-task',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: {},
    activeElementInstances: [
      { key: '3100000000000000302002', elementId: 'user-task', elementType: 'userTask' },
    ],
    history: [
      {
        key: '3100000000000000302001',
        elementId: 'StartEvent_1',
        elementType: 'startEvent',
        state: 'completed' as const,
        startedAt: hoursAgo(1),
        completedAt: addMinutes(hoursAgo(1), 1),
      },
    ],
    processType: 'default',
    parentProcessInstanceKey: ROOT_INSTANCE_KEY,
    partition: 1,
  },
];

export const instances: MockProcessInstance[] = [...rootInstances, ...childInstances];

export const incidents: MockIncident[] = [];

// Jobs:
//  - one inactive custom-typed User Task on the root (Update Retries should remain visible)
//  - one active service task on the root (Update Retries should be visible because it's active)
//  - one inactive service task on the root (Update Retries should NOT be visible)
//  - one sectioned child job that reuses `shared-task` element id but uses a different
//    process definition key (Assign must NOT be shown)
export const jobs = [
  {
    key: '5000000000000000301',
    elementId: 'shared-task',
    elementName: 'shared-task',
    type: 'approval',
    elementType: 'USER_TASK',
    processInstanceKey: ROOT_INSTANCE_KEY,
    processDefinitionKey: ROOT_PROCESS_DEFINITION_KEY,
    state: 'completed' as const,
    createdAt: addMinutes(hoursAgo(3), 1),
    completedAt: addMinutes(hoursAgo(3), 90),
    inputVariables: {},
  },
  {
    key: '5000000000000000302',
    elementId: 'custom-typed-service',
    elementName: 'custom-typed-service',
    elementType: 'SERVICE_TASK',
    type: 'TestType',
    processInstanceKey: ROOT_INSTANCE_KEY,
    processDefinitionKey: ROOT_PROCESS_DEFINITION_KEY,
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    inputVariables: {},
    retries: 3,
  },
  {
    key: '5000000000000000303',
    elementId: 'custom-typed-service',
    elementName: 'custom-typed-service',
    elementType: 'SERVICE_TASK',
    type: 'user-task-type',
    processInstanceKey: ROOT_INSTANCE_KEY,
    processDefinitionKey: ROOT_PROCESS_DEFINITION_KEY,
    state: 'completed' as const,
    createdAt: addMinutes(hoursAgo(4), 1),
    completedAt: addMinutes(hoursAgo(4), 5),
    inputVariables: {},
  },
  {
    key: '5000000000000000304',
    elementId: 'shared-task',
    elementName: 'shared-task',
    elementType: 'SERVICE_TASK',
    type: 'user-task-type',
    processInstanceKey: CHILD_INSTANCE_KEY,
    processDefinitionKey: CHILD_PROCESS_DEFINITION_KEY,
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    inputVariables: {},
    retries: 3,
  },
  // A job hosted by a child process whose own definition classifies it as a
  // User Task (elementId="user-task" in the simple-user-task BPMN). Assign
  // must remain available for this row even when the loaded/root definition
  // is the classification tree.
  {
    key: '5000000000000000305',
    elementId: 'user-task',
    elementName: 'user-task',
    type: 'approval',
    elementType: 'USER_TASK',
    processInstanceKey: USER_TASK_CLASSIFICATION_CHILD_USER_TASK_INSTANCE_KEY,
    processDefinitionKey: SIMPLE_USER_TASK_PROCESS_DEFINITION_KEY,
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(1), 1),
    inputVariables: {},
    assignee: 'child.assignee',
    candidateGroups: ['child-groups'],
  },
];
