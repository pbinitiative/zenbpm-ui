// User Tasks with Assignments - mock data
// BPMN Flow: StartEvent_1 -> assignee-task (userTask) -> group-task (userTask) -> Event_13981zj (EndEvent)
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo, addMinutes } from '../types';
import bpmnData from './user-tasks-with-assignments.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000054',
  version: 1,
  bpmnProcessId: 'user-tasks-with-assignments',
  bpmnProcessName: 'User Tasks with Assignments',
  bpmnResourceName: 'user-tasks-with-assignments.bpmn',
  bpmnData,
  createdAt: '2024-12-08T11:00:00.000Z',
};

type StoppedAt = 'assignee-task' | 'group-task' | 'completed';

// Helper to create instance with realistic history
const createInstance = (
  key: string,
  createdAt: string,
  state: 'active' | 'completed' | 'terminated' | 'failed',
  variables: Record<string, unknown>,
  partition: number,
  stoppedAt: StoppedAt = 'assignee-task'
): MockProcessInstance => {
  const startCompletedAt = addMinutes(createdAt, 1);
  const assigneeTaskCompletedAt = stoppedAt !== 'assignee-task' ? addMinutes(createdAt, 60) : undefined;
  const groupTaskCompletedAt = stoppedAt === 'completed' ? addMinutes(assigneeTaskCompletedAt!, 120) : undefined;
  const endCompletedAt = groupTaskCompletedAt ? addMinutes(groupTaskCompletedAt, 1) : undefined;

  const history = [
    {
      key: `${key}001`,
      elementId: 'StartEvent_1',
      elementType: 'startEvent',
      state: 'completed' as const,
      startedAt: createdAt,
      completedAt: startCompletedAt,
    },
    {
      key: `${key}002`,
      elementId: 'assignee-task',
      elementType: 'userTask',
      state: (stoppedAt === 'assignee-task' ? state : 'completed'),
      startedAt: startCompletedAt,
      completedAt: assigneeTaskCompletedAt,
    },
    ...(stoppedAt !== 'assignee-task'
      ? [
          {
            key: `${key}003`,
            elementId: 'group-task',
            elementType: 'userTask',
            state: (stoppedAt === 'group-task' ? state : 'completed'),
            startedAt: assigneeTaskCompletedAt!,
            completedAt: groupTaskCompletedAt,
          },
        ]
      : []),
    ...(stoppedAt === 'completed'
      ? [
          {
            key: `${key}004`,
            elementId: 'Event_13981zj',
            elementType: 'endEvent',
            state: 'completed' as const,
            startedAt: groupTaskCompletedAt!,
            completedAt: endCompletedAt,
          },
        ]
      : []),
  ];

  // Determine active element
  let activeElementInstances: Array<{ key: string; elementId: string; elementType: string }> = [];
  if (state === 'active' || state === 'failed') {
    if (stoppedAt === 'assignee-task') {
      activeElementInstances = [{ key: `${key}002`, elementId: 'assignee-task', elementType: 'userTask' }];
    } else if (stoppedAt === 'group-task') {
      activeElementInstances = [{ key: `${key}003`, elementId: 'group-task', elementType: 'userTask' }];
    }
  }

  return {
    key,
    processDefinitionKey: '3000000000000000054',
    bpmnProcessId: 'user-tasks-with-assignments',
    createdAt,
    state,
    variables,
    activeElementInstances,
    history,
    partition,
  };
};

export const instances: MockProcessInstance[] = [
  // Partition 1
  createInstance(
    '3100000000000000018',
    hoursAgo(3),
    'active',
    {
      employeeId: 'EMP-001',
      employeeName: 'Sarah Johnson',
      requestType: 'vacation',
    },
    1,
    'assignee-task'
  ),
  createInstance(
    '3100000000000000019',
    hoursAgo(8),
    'active',
    {
      employeeId: 'EMP-002',
      employeeName: 'Mike Davis',
      requestType: 'equipment',
    },
    1,
    'group-task' // Advanced to second task
  ),
  // Partition 2
  createInstance(
    '3100000000000000026',
    hoursAgo(5),
    'active',
    {
      employeeId: 'EMP-101',
      employeeName: 'James Wilson',
    },
    2,
    'assignee-task'
  ),
  // Partition 4
  createInstance(
    '3100000000000000039',
    hoursAgo(1),
    'active',
    { employeeId: 'EMP-301', employeeName: 'William Clark' },
    4,
    'assignee-task'
  ),
  createInstance(
    '3100000000000000040',
    hoursAgo(2),
    'active',
    { employeeId: 'EMP-302', employeeName: 'Mia Lewis' },
    4,
    'group-task'
  ),
  createInstance(
    '2097302399374461025',
    hoursAgo(4),
    'completed',
    { employeeId: 'EMP-303', employeeName: 'Henry Walker', approved: true },
    4,
    'completed'
  ),
  createInstance(
    '3100000000000000041',
    hoursAgo(6),
    'active',
    { employeeId: 'EMP-304', employeeName: 'Evelyn Hall' },
    4,
    'assignee-task'
  ),
  createInstance(
    '2097302399374461029',
    daysAgo(1),
    'terminated',
    { employeeId: 'EMP-305', employeeName: 'Alexander Young' },
    4,
    'assignee-task'
  ),
];

export const incidents: MockIncident[] = [
  {
    key: '3097302353098702851',
    elementInstanceKey: '2097302353098702851',
    elementId: 'assignee-task',
    processInstanceKey: '3100000000000000018',
    processDefinitionKey: '3000000000000000054',
    message: 'Email notification failed: SMTP server rejected connection',
    createdAt: daysAgo(1),
    resolvedAt: hoursAgo(20),
    executionToken: 'token-323456',
  },
];

// Jobs for user tasks
export const jobs = [
  {
    key: '5000000000000000009',
    elementId: 'assignee-task',
    elementName: 'assignee-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000018',
    processDefinitionKey: '3000000000000000054',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(3), 1),
    variables: { employeeId: 'EMP-001', employeeName: 'Sarah Johnson', requestType: 'vacation' },
    assignee: 'john.doe',
    candidateGroups: ['sales', 'marketing', 'support'],
  },
  {
    key: '5000000000000000010',
    elementId: 'group-task',
    elementName: 'group-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000019',
    processDefinitionKey: '3000000000000000054',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(8), 61),
    variables: { employeeId: 'EMP-002', employeeName: 'Mike Davis', requestType: 'equipment' },
    candidateGroups: ['sales', 'marketing', 'support'],
  },
  {
    key: '5000000000000000016',
    elementId: 'assignee-task',
    elementName: 'assignee-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000026',
    processDefinitionKey: '3000000000000000054',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(5), 1),
    variables: { employeeId: 'EMP-101', employeeName: 'James Wilson' },
    assignee: 'john.doe',
    candidateGroups: ['sales', 'marketing', 'support'],
  },
  {
    key: '5000000000000000026',
    elementId: 'assignee-task',
    elementName: 'assignee-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000039',
    processDefinitionKey: '3000000000000000054',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(1), 1),
    variables: { employeeId: 'EMP-301', employeeName: 'William Clark' },
    assignee: 'john.doe',
    candidateGroups: ['sales', 'marketing', 'support'],
  },
  {
    key: '5000000000000000027',
    elementId: 'group-task',
    elementName: 'group-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000040',
    processDefinitionKey: '3000000000000000054',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 61),
    variables: { employeeId: 'EMP-302', employeeName: 'Mia Lewis' },
    candidateGroups: ['sales', 'marketing', 'support'],
  },
  {
    key: '5000000000000000028',
    elementId: 'assignee-task',
    elementName: 'assignee-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000041',
    processDefinitionKey: '3000000000000000054',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(6), 1),
    variables: { employeeId: 'EMP-304', employeeName: 'Evelyn Hall' },
    assignee: 'john.doe',
    candidateGroups: ['sales', 'marketing', 'support'],
  },
];
