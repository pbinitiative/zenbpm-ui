// Task Listeners - mock data
// BPMN Flow: OrderReceived -> ShipOrder (serviceTask) -> ConfirmDelivery (userTask) -> OrderDelivered
// ShipOrder carries two start and two end execution listeners, ConfirmDelivery one start listener.
// As in the engine, the jobs of one element follow each other, one at a time: its start
// listeners in the order of the model, the element's own job, its end listeners. They share
// the element's id, type and element instance key; `listenerEventType` tells a listener's job
// from the element's own. The history row of the element stays open until its last job is done.
import type { MockElementInstance, MockIncident, MockProcessDefinition, MockProcessInstance } from '../types';
import { addMinutes, hoursAgo } from '../types';
import type { MockJob, MockJobFailure } from '../jobs';
import { TEST_ZEN_FORM } from '../forms';
import {
  TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY,
  TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY,
  TASK_LISTENERS_COMPLETED_START_LISTENER_JOB_KEY,
  TASK_LISTENERS_END_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
  TASK_LISTENERS_PROCESS_DEFINITION_KEY,
  TASK_LISTENERS_START_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_USER_TASK_INSTANCE_KEY,
  TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY,
  TASK_LISTENERS_USER_TASK_OWN_JOB_KEY,
} from '../well-known-keys';
import bpmnData from './task-listeners.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
  version: 1,
  bpmnProcessId: 'task-listeners',
  bpmnProcessName: 'Task Listeners',
  bpmnResourceName: 'task-listeners.bpmn',
  bpmnData,
  createdAt: '2026-11-12T10:00:00.000Z',
};

// The jobs of ShipOrder in the order the engine creates them, and of ConfirmDelivery behind them.
const SHIP_ORDER_JOBS = [
  { type: 'reserve-stock', listenerEventType: 'start' },
  { type: 'check-credit', listenerEventType: 'start' },
  { type: 'ship-order' },
  { type: 'notify-customer', listenerEventType: 'end', definitionRetries: 2 },
  { type: 'archive-order', listenerEventType: 'end' },
] as const;

const CONFIRM_DELIVERY_JOBS = [
  { type: 'prepare-confirmation', listenerEventType: 'start' },
  { type: 'confirm-delivery' },
] as const;

type JobOfTheModel = (typeof SHIP_ORDER_JOBS)[number] | (typeof CONFIRM_DELIVERY_JOBS)[number];

const shipOrderKey = (instanceKey: string) => `${instanceKey}002`;
const confirmDeliveryKey = (instanceKey: string) => `${instanceKey}003`;

// The form of the user task comes from its input mapping, so each job of the user task
// carries it, the job of its start listener included.
const instanceVariables = (orderId: string) => ({ orderId, deliveryForm: TEST_ZEN_FORM });

// What the jobs of an element see: the instance's variables, the results of the element's
// input mappings, and what its earlier jobs were completed with.
const shipOrderVariables = (orderId: string, jobIndex: number) => ({
  ...instanceVariables(orderId),
  ...(jobIndex > 0 ? { reserved: true } : {}),
  ...(jobIndex > 1 ? { creditChecked: true } : {}),
  ...(jobIndex > 2 ? { trackingId: 'TRK-1' } : {}),
});

const confirmDeliveryVariables = (orderId: string, jobIndex: number) => ({
  ...instanceVariables(orderId),
  stockReserved: true,
  ZEN_FORM: TEST_ZEN_FORM,
  ...(jobIndex > 0 ? { recipient: 'jane.smith' } : {}),
});

interface Scenario {
  instanceKey: string;
  orderId: string;
  createdAt: string;
  partition: number;
  /** Keys of the instance's jobs in the order they were created; the last one is the job the instance waits behind. */
  jobKeys: string[];
  /** State of the last job; the earlier ones are completed. */
  lastJobState: 'active' | 'failed';
}

const startListenerCreatedAt = hoursAgo(1);
const endListenerCreatedAt = hoursAgo(2);
const failedEndListenerCreatedAt = hoursAgo(3);
const userTaskListenerCreatedAt = hoursAgo(4);
const userTaskCreatedAt = hoursAgo(5);

const scenarios: Scenario[] = [
  // ShipOrder waits behind its second start listener.
  {
    instanceKey: TASK_LISTENERS_START_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7101',
    createdAt: startListenerCreatedAt,
    partition: 1,
    jobKeys: [TASK_LISTENERS_COMPLETED_START_LISTENER_JOB_KEY, TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY],
    lastJobState: 'active',
  },
  // ShipOrder did its own work and waits behind its first end listener.
  {
    instanceKey: TASK_LISTENERS_END_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7102',
    createdAt: endListenerCreatedAt,
    partition: 2,
    jobKeys: ['5000000000000000044', '5000000000000000045', '5000000000000000046', TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY],
    lastJobState: 'active',
  },
  // The first end listener of ShipOrder spent its retries: an incident stands on ShipOrder.
  {
    instanceKey: TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7103',
    createdAt: failedEndListenerCreatedAt,
    partition: 3,
    jobKeys: ['5000000000000000048', '5000000000000000049', '5000000000000000050', TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY],
    lastJobState: 'failed',
  },
  // ConfirmDelivery waits behind its start listener: the user task's own job does not exist yet.
  {
    instanceKey: TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7104',
    createdAt: userTaskListenerCreatedAt,
    partition: 1,
    jobKeys: [
      '5000000000000000052', '5000000000000000053', '5000000000000000054', '5000000000000000055', '5000000000000000056',
      TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY,
    ],
    lastJobState: 'active',
  },
  // ConfirmDelivery waits behind its own job, which is the one a user is assigned to.
  {
    instanceKey: TASK_LISTENERS_USER_TASK_INSTANCE_KEY,
    orderId: 'ORD-7105',
    createdAt: userTaskCreatedAt,
    partition: 2,
    jobKeys: [
      '5000000000000000058', '5000000000000000059', '5000000000000000060', '5000000000000000061', '5000000000000000062',
      '5000000000000000063',
      TASK_LISTENERS_USER_TASK_OWN_JOB_KEY,
    ],
    lastJobState: 'active',
  },
];

const hasLeftShipOrder = (scenario: Scenario) => scenario.jobKeys.length > SHIP_ORDER_JOBS.length;

const historyOf = (scenario: Scenario): MockElementInstance[] => {
  const { instanceKey, createdAt } = scenario;
  const shipOrderLeftAt = addMinutes(createdAt, 1 + SHIP_ORDER_JOBS.length);
  const history: MockElementInstance[] = [
    {
      key: `${instanceKey}001`,
      elementId: 'OrderReceived',
      elementType: 'startEvent',
      state: 'completed',
      startedAt: createdAt,
      completedAt: addMinutes(createdAt, 1),
    },
    {
      key: shipOrderKey(instanceKey),
      elementId: 'ShipOrder',
      elementType: 'serviceTask',
      state: hasLeftShipOrder(scenario) ? 'completed' : 'active',
      startedAt: addMinutes(createdAt, 1),
      completedAt: hasLeftShipOrder(scenario) ? shipOrderLeftAt : undefined,
      inputVariables: instanceVariables(scenario.orderId),
      // the outputs show from the completion of the task's own job on
      outputVariables: scenario.jobKeys.length > 3 ? { stockReserved: true } : undefined,
    },
  ];
  if (hasLeftShipOrder(scenario)) {
    history.push({
      key: confirmDeliveryKey(instanceKey),
      elementId: 'ConfirmDelivery',
      elementType: 'userTask',
      state: 'active',
      startedAt: shipOrderLeftAt,
      inputVariables: { ZEN_FORM: TEST_ZEN_FORM },
    });
  }
  return history;
};

export const instances: MockProcessInstance[] = scenarios.map((scenario) => {
  const history = historyOf(scenario);
  const waitingElement = history[history.length - 1];
  return {
    key: scenario.instanceKey,
    processDefinitionKey: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
    bpmnProcessId: 'task-listeners',
    createdAt: scenario.createdAt,
    // as in the engine, the instance stays active while a job of it has failed with an incident
    state: 'active',
    processType: 'default' as const,
    variables: {
      ...instanceVariables(scenario.orderId),
      ...(scenario.jobKeys.length > 3 ? { stockReserved: true } : {}),
    },
    activeElementInstances: [
      { key: waitingElement.key, elementId: waitingElement.elementId, elementType: waitingElement.elementType },
    ],
    history,
    partition: scenario.partition,
  };
});

const jobsOf = (scenario: Scenario): MockJob[] =>
  scenario.jobKeys.map((key, index) => {
    const ofShipOrder = index < SHIP_ORDER_JOBS.length;
    const jobIndex = ofShipOrder ? index : index - SHIP_ORDER_JOBS.length;
    const jobOfTheModel: JobOfTheModel = ofShipOrder ? SHIP_ORDER_JOBS[jobIndex] : CONFIRM_DELIVERY_JOBS[jobIndex];
    const isLast = index === scenario.jobKeys.length - 1;
    const createdAt = addMinutes(scenario.createdAt, 1 + index);
    const definitionRetries = 'definitionRetries' in jobOfTheModel ? jobOfTheModel.definitionRetries : 1;
    const failed = isLast && scenario.lastJobState === 'failed';
    return {
      key,
      elementInstanceKey: ofShipOrder ? shipOrderKey(scenario.instanceKey) : confirmDeliveryKey(scenario.instanceKey),
      elementId: ofShipOrder ? 'ShipOrder' : 'ConfirmDelivery',
      elementName: ofShipOrder ? 'Ship order' : 'Confirm delivery',
      type: jobOfTheModel.type,
      // a listener's job carries the type of its element, as the element's own job does
      elementType: ofShipOrder ? 'SERVICE_TASK' : 'USER_TASK',
      listenerEventType: 'listenerEventType' in jobOfTheModel ? jobOfTheModel.listenerEventType : undefined,
      processInstanceKey: scenario.instanceKey,
      processDefinitionKey: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
      state: isLast ? scenario.lastJobState : 'completed',
      createdAt,
      completedAt: isLast ? undefined : addMinutes(createdAt, 1),
      inputVariables: ofShipOrder
        ? shipOrderVariables(scenario.orderId, jobIndex)
        : confirmDeliveryVariables(scenario.orderId, jobIndex),
      definitionRetries,
      retries: failed ? 0 : definitionRetries,
      attempts: failed ? definitionRetries : 0,
      lastFailureMessage: failed ? 'mail server unavailable' : undefined,
      deliveryToken: failed ? definitionRetries : undefined,
    };
  });

export const jobs: MockJob[] = scenarios.flatMap(jobsOf);

// The incident of a listener's job stands on the listener's element and names the job.
export const incidents: MockIncident[] = [
  {
    key: TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY,
    elementInstanceKey: shipOrderKey(TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY),
    elementId: 'ShipOrder',
    processInstanceKey: TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
    processDefinitionKey: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
    message: 'mail server unavailable',
    createdAt: addMinutes(failedEndListenerCreatedAt, 7),
    executionToken: '7100000000000223491',
    jobKey: TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
  },
];

export const jobFailures: MockJobFailure[] = [1, 2].map((attempt) => ({
  key: `52000000000000000${43 + attempt}`,
  jobKey: TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
  processInstanceKey: TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
  attempt,
  failedAt: addMinutes(failedEndListenerCreatedAt, 4 + attempt),
  message: 'mail server unavailable',
  incidentKey: attempt === 2 ? TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY : undefined,
}));
