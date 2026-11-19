// Task Listeners - mock data
// BPMN Flow: OrderReceived (startEvent) -> ShipOrder (serviceTask) -> ConfirmDelivery (userTask) -> OrderDelivered
// OrderReceived carries an end execution listener, ShipOrder two start and two end listeners,
// ConfirmDelivery one start listener.
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
  TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY,
  TASK_LISTENERS_ELEMENT_INCIDENT_KEY,
  TASK_LISTENERS_ELEMENT_INCIDENT_LISTENER_JOB_KEY,
  TASK_LISTENERS_END_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
  TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
  TASK_LISTENERS_PROCESS_DEFINITION_KEY,
  TASK_LISTENERS_START_EVENT_LISTENER_JOB_KEY,
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

interface ElementOfTheModel {
  id: string;
  name: string;
  /** As a job names it. A listener's job carries the type of its element, as the element's own job does. */
  jobElementType: string;
  /** As the history names it. */
  historyElementType: string;
  /** Last three digits of the key of its element instance, behind the key of the process instance. */
  keySuffix: string;
}

const ORDER_RECEIVED: ElementOfTheModel = {
  id: 'OrderReceived', name: 'Order received', jobElementType: 'START_EVENT', historyElementType: 'startEvent', keySuffix: '001',
};
const SHIP_ORDER: ElementOfTheModel = {
  id: 'ShipOrder', name: 'Ship order', jobElementType: 'SERVICE_TASK', historyElementType: 'serviceTask', keySuffix: '002',
};
const CONFIRM_DELIVERY: ElementOfTheModel = {
  id: 'ConfirmDelivery', name: 'Confirm delivery', jobElementType: 'USER_TASK', historyElementType: 'userTask', keySuffix: '003',
};
const ELEMENTS = [ORDER_RECEIVED, SHIP_ORDER, CONFIRM_DELIVERY];

interface JobOfTheModel {
  element: ElementOfTheModel;
  type: string;
  /** Absent for the element's own job. */
  listenerEventType?: 'start' | 'end';
  /** Retries the model names; the engine default is 1. */
  definitionRetries?: number;
  /** What the job is completed with, which the later jobs of its element see. */
  completedWith?: Record<string, unknown>;
}

// Every job of an instance in the order the engine creates it.
const JOBS_OF_THE_MODEL: JobOfTheModel[] = [
  { element: ORDER_RECEIVED, type: 'order-started', listenerEventType: 'end', definitionRetries: 3 },
  { element: SHIP_ORDER, type: 'reserve-stock', listenerEventType: 'start', completedWith: { reserved: true } },
  { element: SHIP_ORDER, type: 'check-credit', listenerEventType: 'start', completedWith: { creditChecked: true } },
  { element: SHIP_ORDER, type: 'ship-order', completedWith: { trackingId: 'TRK-1' } },
  { element: SHIP_ORDER, type: 'notify-customer', listenerEventType: 'end', definitionRetries: 2 },
  { element: SHIP_ORDER, type: 'archive-order', listenerEventType: 'end' },
  { element: CONFIRM_DELIVERY, type: 'prepare-confirmation', listenerEventType: 'start', completedWith: { recipient: 'jane.smith' } },
  { element: CONFIRM_DELIVERY, type: 'confirm-delivery' },
];
const SHIP_ORDER_OWN_JOB_INDEX = JOBS_OF_THE_MODEL.findIndex((job) => job.type === 'ship-order');

const elementInstanceKey = (instanceKey: string, element: ElementOfTheModel) => `${instanceKey}${element.keySuffix}`;

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
const elementIncidentCreatedAt = hoursAgo(6);

const scenarios: Scenario[] = [
  // ShipOrder waits behind its second start listener.
  {
    instanceKey: TASK_LISTENERS_START_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7101',
    createdAt: startListenerCreatedAt,
    partition: 1,
    jobKeys: [
      '5000000000000000067',
      TASK_LISTENERS_COMPLETED_START_LISTENER_JOB_KEY,
      TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY,
    ],
    lastJobState: 'active',
  },
  // ShipOrder did its own work and waits behind its first end listener.
  {
    instanceKey: TASK_LISTENERS_END_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7102',
    createdAt: endListenerCreatedAt,
    partition: 2,
    jobKeys: [
      '5000000000000000068',
      '5000000000000000044', '5000000000000000045', '5000000000000000046',
      TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY,
    ],
    lastJobState: 'active',
  },
  // The first end listener of ShipOrder spent its retries: an incident stands on ShipOrder.
  {
    instanceKey: TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7103',
    createdAt: failedEndListenerCreatedAt,
    partition: 3,
    jobKeys: [
      '5000000000000000069',
      '5000000000000000048', '5000000000000000049', '5000000000000000050',
      TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
    ],
    lastJobState: 'failed',
  },
  // A row gone stale, which the engine never serves and a slow page can still show: the second
  // start listener's job reads failed, while the only open incident on ShipOrder is the task's own.
  {
    instanceKey: TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY,
    orderId: 'ORD-7106',
    createdAt: elementIncidentCreatedAt,
    partition: 3,
    jobKeys: ['5000000000000000072', '5000000000000000065', TASK_LISTENERS_ELEMENT_INCIDENT_LISTENER_JOB_KEY],
    lastJobState: 'failed',
  },
  // ConfirmDelivery waits behind its start listener: the user task's own job does not exist yet.
  {
    instanceKey: TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY,
    orderId: 'ORD-7104',
    createdAt: userTaskListenerCreatedAt,
    partition: 1,
    jobKeys: [
      '5000000000000000070',
      '5000000000000000052', '5000000000000000053', '5000000000000000054', '5000000000000000055', '5000000000000000056',
      TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY,
    ],
    lastJobState: 'active',
  },
  // ConfirmDelivery waits behind its own job, which is the one a user is assigned to. With its
  // eight jobs the instance fills more than one page of five, and the jobs of ShipOrder lie on both.
  {
    instanceKey: TASK_LISTENERS_USER_TASK_INSTANCE_KEY,
    orderId: 'ORD-7105',
    createdAt: userTaskCreatedAt,
    partition: 2,
    jobKeys: [
      TASK_LISTENERS_START_EVENT_LISTENER_JOB_KEY,
      '5000000000000000058', '5000000000000000059', '5000000000000000060', '5000000000000000061', '5000000000000000062',
      '5000000000000000063',
      TASK_LISTENERS_USER_TASK_OWN_JOB_KEY,
    ],
    lastJobState: 'active',
  },
];

// The form of the user task comes from its input mapping, so each job of the user task
// carries it, the job of its start listener included.
const instanceVariables = (orderId: string) => ({ orderId, deliveryForm: TEST_ZEN_FORM });

// The output mapping of ShipOrder writes the start listener's `reserved` to the instance once
// the task's own job is completed.
const shipOrderDidItsOwnWork = (scenario: Scenario) => scenario.jobKeys.length > SHIP_ORDER_OWN_JOB_INDEX + 1;

// What a job sees: the instance's variables as they are when the job is created, the results of
// its element's input mappings, and what the earlier jobs of its element were completed with. An
// end listener of ShipOrder is created after the output mapping wrote `stockReserved`, and so is
// every job of ConfirmDelivery.
const variablesOfJob = (scenario: Scenario, index: number): Record<string, unknown> => {
  const { element, listenerEventType } = JOBS_OF_THE_MODEL[index];
  const completedBefore = JOBS_OF_THE_MODEL
    .slice(0, index)
    .filter((earlier) => earlier.element === element)
    .reduce<Record<string, unknown>>((variables, earlier) => ({ ...variables, ...earlier.completedWith }), {});
  const createdAfterTheOutputMapping =
    element === CONFIRM_DELIVERY || (element === SHIP_ORDER && listenerEventType === 'end');
  return {
    ...instanceVariables(scenario.orderId),
    ...(createdAfterTheOutputMapping ? { stockReserved: true } : {}),
    ...(element === CONFIRM_DELIVERY ? { ZEN_FORM: TEST_ZEN_FORM } : {}),
    ...completedBefore,
  };
};

// The element the instance waits in, and the elements before it, which it has left.
const historyOf = (scenario: Scenario): MockElementInstance[] => {
  const waitingElement = JOBS_OF_THE_MODEL[scenario.jobKeys.length - 1].element;
  const entered = ELEMENTS.slice(0, ELEMENTS.indexOf(waitingElement) + 1);
  return entered.map((element) => {
    const firstJobIndex = JOBS_OF_THE_MODEL.findIndex((job) => job.element === element);
    const jobsOfElement = JOBS_OF_THE_MODEL.filter((job) => job.element === element).length;
    const left = element !== waitingElement;
    return {
      key: elementInstanceKey(scenario.instanceKey, element),
      elementId: element.id,
      elementType: element.historyElementType,
      state: left ? 'completed' as const : 'active' as const,
      startedAt: addMinutes(scenario.createdAt, firstJobIndex),
      completedAt: left ? addMinutes(scenario.createdAt, firstJobIndex + jobsOfElement) : undefined,
      inputVariables: element === CONFIRM_DELIVERY ? { ZEN_FORM: TEST_ZEN_FORM } : instanceVariables(scenario.orderId),
      // the outputs show from the completion of the task's own job on
      outputVariables: element === SHIP_ORDER && shipOrderDidItsOwnWork(scenario) ? { stockReserved: true } : undefined,
    };
  });
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
      ...(shipOrderDidItsOwnWork(scenario) ? { stockReserved: true } : {}),
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
    const jobOfTheModel = JOBS_OF_THE_MODEL[index];
    const isLast = index === scenario.jobKeys.length - 1;
    const createdAt = addMinutes(scenario.createdAt, index);
    const definitionRetries = jobOfTheModel.definitionRetries ?? 1;
    const failed = isLast && scenario.lastJobState === 'failed';
    return {
      key,
      elementInstanceKey: elementInstanceKey(scenario.instanceKey, jobOfTheModel.element),
      elementId: jobOfTheModel.element.id,
      elementName: jobOfTheModel.element.name,
      type: jobOfTheModel.type,
      elementType: jobOfTheModel.element.jobElementType,
      listenerEventType: jobOfTheModel.listenerEventType,
      processInstanceKey: scenario.instanceKey,
      processDefinitionKey: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
      state: isLast ? scenario.lastJobState : 'completed',
      createdAt,
      completedAt: isLast ? undefined : addMinutes(createdAt, 1),
      inputVariables: variablesOfJob(scenario, index),
      definitionRetries,
      retries: failed ? 0 : definitionRetries,
      attempts: failed ? definitionRetries : 0,
      lastFailureMessage: failed ? 'mail server unavailable' : undefined,
      deliveryToken: failed ? definitionRetries : undefined,
    };
  });

export const jobs: MockJob[] = scenarios.flatMap(jobsOf);

export const incidents: MockIncident[] = [
  // The incident of a listener's job stands on the listener's element and names the job.
  {
    key: TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY,
    elementInstanceKey: elementInstanceKey(TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY, SHIP_ORDER),
    elementId: SHIP_ORDER.id,
    processInstanceKey: TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY,
    processDefinitionKey: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
    // as the engine words the incident of a job whose retries are exhausted
    message: `mail server unavailable (job ${TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY}: 2 attempts, retries exhausted)`,
    createdAt: addMinutes(failedEndListenerCreatedAt, 7),
    executionToken: '7100000000000223491',
    jobKey: TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY,
  },
  // An incident of the element itself names no job.
  {
    key: TASK_LISTENERS_ELEMENT_INCIDENT_KEY,
    elementInstanceKey: elementInstanceKey(TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY, SHIP_ORDER),
    elementId: SHIP_ORDER.id,
    processInstanceKey: TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY,
    processDefinitionKey: TASK_LISTENERS_PROCESS_DEFINITION_KEY,
    message: 'failed to evaluate the input mappings of SERVICE_TASK ShipOrder',
    createdAt: addMinutes(elementIncidentCreatedAt, 4),
    executionToken: '7100000000000223492',
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
