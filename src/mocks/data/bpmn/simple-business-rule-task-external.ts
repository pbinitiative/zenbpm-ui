// Simple Business Rule Task External - mock data
// BPMN Flow: StartEvent -> BusinessRuleTask1 (businessRuleTask with external job) -> EndEvent
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo, addMinutes } from '../types';
import bpmnData from './simple-business-rule-task-external.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000036',
  version: 1,
  bpmnProcessId: 'simple-business-rule-task-external',
  bpmnProcessName: 'Simple Business Rule Task External',
  bpmnResourceName: 'simple-business-rule-task-external.bpmn',
  bpmnData,
  createdAt: '2024-12-09T04:00:00.000Z',
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
  const taskCompletedAt = state === 'completed' ? addMinutes(createdAt, 10) : undefined;
  const endCompletedAt = taskCompletedAt ? addMinutes(taskCompletedAt, 1) : undefined;

  const history = [
    {
      key: `${key}001`,
      elementId: 'StartEvent',
      elementType: 'startEvent',
      state: 'completed' as const,
      startedAt: createdAt,
      completedAt: startCompletedAt,
    },
    {
      key: `${key}002`,
      elementId: 'BusinessRuleTask1',
      elementType: 'businessRuleTask',
      state: (state === 'completed' ? 'completed' : state) as 'active' | 'completed' | 'terminated' | 'failed',
      startedAt: startCompletedAt,
      completedAt: taskCompletedAt,
    },
    ...(state === 'completed'
      ? [
          {
            key: `${key}003`,
            elementId: 'EndEvent',
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
    processDefinitionKey: '3000000000000000036',
    bpmnProcessId: 'simple-business-rule-task-external',
    createdAt,
    state,
    variables,
    activeElementInstances:
      state === 'active' || state === 'failed'
        ? [{ key: `${key}002`, elementId: 'BusinessRuleTask1', elementType: 'businessRuleTask' }]
        : [],
    history,
    partition,
  };
};

export const instances: MockProcessInstance[] = [
  createInstance(
    '3100000000000000184',
    hoursAgo(2),
    'active',
    { customerType: 'premium', orderAmount: 5000 },
    1
  ),
  createInstance(
    '2251799813685330003',
    daysAgo(1),
    'completed',
    { customerType: 'standard', orderAmount: 1000, discount: 5 },
    2
  ),
  createInstance(
    '2251799813685330004',
    daysAgo(4),
    'completed',
    { customerType: 'premium', orderAmount: 10000, discount: 20 },
    1
  ),
  createInstance(
    '2251799813685330005',
    daysAgo(7),
    'completed',
    { customerType: 'new', orderAmount: 500, discount: 0 },
    3
  ),
];

export const incidents: MockIncident[] = [];

// Jobs for this process - external business rule task jobs
export const jobs = [
  {
    key: '5000000000000000029',
    elementId: 'BusinessRuleTask1',
    elementName: 'Test Simple External Business Rule Task 1',
    type: 'test-business-rule-task-job',
    processInstanceKey: '3100000000000000184',
    processDefinitionKey: '3000000000000000036',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    variables: { customerType: 'premium', orderAmount: 5000 },
    retries: 1,
  },
];
