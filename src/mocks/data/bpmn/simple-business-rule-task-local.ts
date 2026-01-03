// Simple Business Rule Task Local - mock data
// BPMN Flow: StartEvent -> BusinessRuleTask1 -> BusinessRuleTask2 -> BusinessRuleTask3 -> EndEvent
// These are local DMN decision tasks (calledDecision), not external jobs
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, addMinutes } from '../types';
import bpmnData from './simple-business-rule-task-local.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000037',
  version: 1,
  bpmnProcessId: 'simple-business-rule-task-local',
  bpmnProcessName: 'Simple Business Rule Task Local',
  bpmnResourceName: 'simple-business-rule-task-local.bpmn',
  bpmnData,
  createdAt: '2024-12-09T03:00:00.000Z',
};

// Helper to generate history for this process
// Since all tasks call local DMN decisions, they complete quickly (no jobs waiting)
const createInstance = (
  key: string,
  createdAt: string,
  state: 'active' | 'completed' | 'terminated' | 'failed',
  variables: Record<string, unknown>,
  partition: number,
  stoppedAtTask: 1 | 2 | 3 | 'completed' = 'completed'
): MockProcessInstance => {
  const startCompletedAt = addMinutes(createdAt, 1);
  const task1CompletedAt = stoppedAtTask !== 1 ? addMinutes(createdAt, 2) : undefined;
  const task2CompletedAt = stoppedAtTask !== 1 && stoppedAtTask !== 2 ? addMinutes(createdAt, 3) : undefined;
  const task3CompletedAt = stoppedAtTask === 'completed' ? addMinutes(createdAt, 4) : undefined;
  const endCompletedAt = task3CompletedAt ? addMinutes(task3CompletedAt, 1) : undefined;

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
      state: (stoppedAtTask === 1 ? state : 'completed') as 'active' | 'completed' | 'terminated' | 'failed',
      startedAt: startCompletedAt,
      completedAt: task1CompletedAt,
    },
    ...(stoppedAtTask !== 1
      ? [
          {
            key: `${key}003`,
            elementId: 'BusinessRuleTask2',
            elementType: 'businessRuleTask',
            state: (stoppedAtTask === 2 ? state : 'completed') as 'active' | 'completed' | 'terminated' | 'failed',
            startedAt: task1CompletedAt!,
            completedAt: task2CompletedAt,
          },
        ]
      : []),
    ...(stoppedAtTask !== 1 && stoppedAtTask !== 2
      ? [
          {
            key: `${key}004`,
            elementId: 'BusinessRuleTask3',
            elementType: 'businessRuleTask',
            state: (stoppedAtTask === 3 ? state : 'completed') as 'active' | 'completed' | 'terminated' | 'failed',
            startedAt: task2CompletedAt!,
            completedAt: task3CompletedAt,
          },
        ]
      : []),
    ...(stoppedAtTask === 'completed'
      ? [
          {
            key: `${key}005`,
            elementId: 'EndEvent',
            elementType: 'endEvent',
            state: 'completed' as const,
            startedAt: task3CompletedAt!,
            completedAt: endCompletedAt,
          },
        ]
      : []),
  ];

  // Determine active element
  let activeElementId = '';
  if (state === 'active' || state === 'failed') {
    if (stoppedAtTask === 1) activeElementId = 'BusinessRuleTask1';
    else if (stoppedAtTask === 2) activeElementId = 'BusinessRuleTask2';
    else if (stoppedAtTask === 3) activeElementId = 'BusinessRuleTask3';
  }

  return {
    key,
    processDefinitionKey: '3000000000000000037',
    bpmnProcessId: 'simple-business-rule-task-local',
    createdAt,
    state,
    variables,
    activeElementInstances: activeElementId
      ? [{ key: `${key}00${stoppedAtTask === 1 ? 2 : stoppedAtTask === 2 ? 3 : 4}`, elementId: activeElementId, elementType: 'businessRuleTask' }]
      : [],
    history,
    partition,
  };
};

// All instances are completed because local DMN tasks execute instantly
export const instances: MockProcessInstance[] = [
  createInstance(
    '2251799813685331001',
    daysAgo(1),
    'completed',
    { age: 25, eligibility: 'approved' },
    1
  ),
  createInstance(
    '2251799813685331002',
    daysAgo(3),
    'completed',
    { age: 17, eligibility: 'denied' },
    2
  ),
  createInstance(
    '2251799813685331003',
    daysAgo(6),
    'completed',
    { age: 65, eligibility: 'senior_discount' },
    1
  ),
];

export const incidents: MockIncident[] = [];

// No jobs for local business rule tasks - they execute immediately using the FEEL engine
export const jobs: Array<Record<string, unknown>> = [];
