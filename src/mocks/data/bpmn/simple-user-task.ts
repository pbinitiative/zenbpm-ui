// Simple User Task - mock data
// BPMN Flow: StartEvent_1 -> user-task (userTask) -> Event_1j4mcqg (EndEvent)
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo, addMinutes } from '../types';
import bpmnData from './simple-user-task.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000047',
  version: 1,
  bpmnProcessId: 'simple-user-task',
  bpmnProcessName: 'Simple User Task',
  bpmnResourceName: 'simple-user-task.bpmn',
  bpmnData,
  createdAt: '2024-12-08T18:00:00.000Z',
};

// Helper to generate history for this process
const createInstance = (
  key: string,
  createdAt: string,
  state: 'active' | 'completed' | 'terminated' | 'failed',
  variables: Record<string, unknown>,
  partition: number
): MockProcessInstance => {
  const startCompletedAt = addMinutes(createdAt, 1);
  const taskCompletedAt = state === 'completed' || state === 'terminated' ? addMinutes(createdAt, 120) : undefined;
  const endCompletedAt = taskCompletedAt ? addMinutes(taskCompletedAt, 1) : undefined;

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
      elementId: 'user-task',
      elementType: 'userTask',
      state: (state === 'completed' ? 'completed' : state === 'terminated' ? 'terminated' : state) as 'active' | 'completed' | 'terminated' | 'failed',
      startedAt: startCompletedAt,
      completedAt: taskCompletedAt,
    },
    ...(state === 'completed'
      ? [
          {
            key: `${key}003`,
            elementId: 'Event_1j4mcqg',
            elementType: 'endEvent',
            state: 'completed' as const,
            startedAt: taskCompletedAt!,
            completedAt: endCompletedAt,
          },
        ]
      : []),
  ];

  return {
    key,
    processDefinitionKey: '3000000000000000047',
    bpmnProcessId: 'simple-user-task',
    createdAt,
    state,
    variables,
    activeElementInstances:
      state === 'active'
        ? [{ key: `${key}002`, elementId: 'user-task', elementType: 'userTask' }]
        : [],
    history,
    partition,
  };
};

export const instances: MockProcessInstance[] = [
  createInstance(
    '3100000000000000210',
    hoursAgo(4),
    'active',
    { assignee: 'john.doe', taskTitle: 'Review Document' },
    1
  ),
  createInstance(
    '3100000000000000211',
    hoursAgo(12),
    'active',
    { assignee: 'jane.smith', taskTitle: 'Approve Request' },
    2
  ),
  createInstance(
    '2251799813685340005',
    daysAgo(2),
    'completed',
    { assignee: 'bob.wilson', taskTitle: 'Validate Data', approved: true },
    1
  ),
  createInstance(
    '2251799813685340006',
    daysAgo(5),
    'completed',
    { assignee: 'alice.johnson', taskTitle: 'Sign Contract', approved: true },
    3
  ),
  createInstance(
    '2251799813685340007',
    daysAgo(8),
    'terminated',
    { assignee: 'charlie.brown', taskTitle: 'Canceled Request' },
    2
  ),
];

export const incidents: MockIncident[] = [];

// Jobs (User Tasks) for this process
export const jobs = [
  {
    key: '5000000000000000030',
    elementId: 'user-task',
    elementName: 'user-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000210',
    processDefinitionKey: '3000000000000000047',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(4), 1),
    variables: { assignee: 'john.doe', taskTitle: 'Review Document' },
    assignee: 'john.doe',
    candidateGroups: ['candicate-groups'],
  },
  {
    key: '5000000000000000031',
    elementId: 'user-task',
    elementName: 'user-task',
    type: 'user-task',
    processInstanceKey: '3100000000000000211',
    processDefinitionKey: '3000000000000000047',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(12), 1),
    variables: { assignee: 'jane.smith', taskTitle: 'Approve Request' },
    assignee: 'jane.smith',
    candidateGroups: ['candicate-groups'],
  },
];
