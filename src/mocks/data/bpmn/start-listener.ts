// Start Listener - mock data
// BPMN Flow: OrderReceived (startEvent, end execution listener) -> ShipOrder (serviceTask) -> OrderShipped
// While the listener's job waits, the token stays at the start event: it reads active in
// the history, and nothing behind the start event has run yet. As in the engine, the
// instance stays active when the listener's job fails with an incident.
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { addMinutes, hoursAgo } from '../types';
import type { MockJob, MockJobFailure } from '../jobs';
import {
  START_LISTENER_FAILED_INSTANCE_KEY,
  START_LISTENER_FAILED_JOB_INCIDENT_KEY,
  START_LISTENER_FAILED_JOB_KEY,
  START_LISTENER_PROCESS_DEFINITION_KEY,
  START_LISTENER_WAITING_INSTANCE_KEY,
  START_LISTENER_WAITING_JOB_KEY,
} from '../well-known-keys';
import bpmnData from './start-listener.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: START_LISTENER_PROCESS_DEFINITION_KEY,
  version: 1,
  bpmnProcessId: 'start-listener',
  bpmnProcessName: 'Start Listener',
  bpmnResourceName: 'start-listener.bpmn',
  bpmnData,
  createdAt: '2026-11-08T10:00:00.000Z',
};

const createWaitingInstance = (
  key: string,
  createdAt: string,
  variables: Record<string, unknown>,
  partition: number
): MockProcessInstance => ({
  key,
  processDefinitionKey: START_LISTENER_PROCESS_DEFINITION_KEY,
  bpmnProcessId: 'start-listener',
  createdAt,
  state: 'active',
  processType: 'default' as const,
  variables,
  activeElementInstances: [{ key: `${key}001`, elementId: 'OrderReceived', elementType: 'startEvent' }],
  history: [
    {
      key: `${key}001`,
      elementId: 'OrderReceived',
      elementType: 'startEvent',
      state: 'active',
      startedAt: createdAt,
    },
  ],
  partition,
});

const waitingCreatedAt = hoursAgo(1);
const failedCreatedAt = hoursAgo(3);

export const instances: MockProcessInstance[] = [
  createWaitingInstance(START_LISTENER_WAITING_INSTANCE_KEY, waitingCreatedAt, { orderId: 'ORD-7001' }, 1),
  createWaitingInstance(START_LISTENER_FAILED_INSTANCE_KEY, failedCreatedAt, { orderId: 'ORD-7002' }, 2),
];

export const incidents: MockIncident[] = [
  {
    key: START_LISTENER_FAILED_JOB_INCIDENT_KEY,
    elementInstanceKey: `${START_LISTENER_FAILED_INSTANCE_KEY}001`,
    elementId: 'OrderReceived',
    processInstanceKey: START_LISTENER_FAILED_INSTANCE_KEY,
    processDefinitionKey: START_LISTENER_PROCESS_DEFINITION_KEY,
    message: 'order service unavailable',
    createdAt: addMinutes(failedCreatedAt, 3),
    executionToken: '7100000000000223490',
    jobKey: START_LISTENER_FAILED_JOB_KEY,
  },
];

// A listener job's element type is that of its start event, and its input
// variables are the instance's variables.
export const jobs: MockJob[] = [
  {
    key: START_LISTENER_WAITING_JOB_KEY,
    elementInstanceKey: `${START_LISTENER_WAITING_INSTANCE_KEY}001`,
    elementId: 'OrderReceived',
    elementName: 'Order received',
    type: 'order-started',
    elementType: 'START_EVENT',
    listenerEventType: 'end',
    processInstanceKey: START_LISTENER_WAITING_INSTANCE_KEY,
    processDefinitionKey: START_LISTENER_PROCESS_DEFINITION_KEY,
    state: 'active',
    createdAt: waitingCreatedAt,
    inputVariables: { orderId: 'ORD-7001' },
    definitionRetries: 3,
    retries: 3,
  },
  {
    key: START_LISTENER_FAILED_JOB_KEY,
    elementInstanceKey: `${START_LISTENER_FAILED_INSTANCE_KEY}001`,
    elementId: 'OrderReceived',
    elementName: 'Order received',
    type: 'order-started',
    elementType: 'START_EVENT',
    listenerEventType: 'end',
    processInstanceKey: START_LISTENER_FAILED_INSTANCE_KEY,
    processDefinitionKey: START_LISTENER_PROCESS_DEFINITION_KEY,
    state: 'failed',
    createdAt: failedCreatedAt,
    inputVariables: { orderId: 'ORD-7002' },
    definitionRetries: 3,
    retries: 0,
    attempts: 3,
    lastFailureMessage: 'order service unavailable',
    deliveryToken: 3,
  },
];

export const jobFailures: MockJobFailure[] = [1, 2, 3].map((attempt) => ({
  key: `52000000000000000${40 + attempt}`,
  jobKey: START_LISTENER_FAILED_JOB_KEY,
  processInstanceKey: START_LISTENER_FAILED_INSTANCE_KEY,
  attempt,
  failedAt: addMinutes(failedCreatedAt, attempt),
  message: 'order service unavailable',
  incidentKey: attempt === 3 ? START_LISTENER_FAILED_JOB_INCIDENT_KEY : undefined,
}));
