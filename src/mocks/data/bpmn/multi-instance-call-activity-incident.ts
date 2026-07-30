import type { MockIncident, MockProcessDefinition, MockProcessInstance } from '../types';
import bpmnData from './multi-instance-call-activity-incident.bpmn?raw';

export const ROOT_INSTANCE_KEY = '3100000000000000290';
export const MULTI_INSTANCE_KEY = '3100000000000000291';
export const CALLED_INSTANCE_KEY = '3100000000000000292';

export const definition: MockProcessDefinition = {
  key: '3000000000000000090',
  version: 1,
  bpmnProcessId: 'multi_instance_call_incident',
  bpmnProcessName: 'Multi-instance call activity incident',
  bpmnResourceName: 'multi-instance-call-activity-incident.bpmn',
  bpmnData,
  createdAt: '2026-01-01T09:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: ROOT_INSTANCE_KEY,
    processDefinitionKey: definition.key,
    bpmnProcessId: definition.bpmnProcessId,
    createdAt: '2026-01-01T10:00:00.000Z',
    state: 'active',
    processType: 'default',
    variables: { items: ['one'] },
    activeElementInstances: [
      { key: '3100000000000000293', elementId: 'Activity_044v303', elementType: 'subProcess' },
    ],
    history: [
      {
        key: '3100000000000000294',
        elementId: 'StartEvent_1',
        elementType: 'startEvent',
        state: 'completed',
        startedAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T10:00:10.000Z',
      },
      {
        key: '3100000000000000295',
        elementId: 'Activity_044v303',
        elementType: 'subProcess',
        state: 'active',
        startedAt: '2026-01-01T10:00:30.000Z',
      },
    ],
    partition: 1,
  },
  {
    key: MULTI_INSTANCE_KEY,
    processDefinitionKey: definition.key,
    bpmnProcessId: definition.bpmnProcessId,
    createdAt: '2026-01-01T10:01:00.000Z',
    state: 'active',
    processType: 'multiInstance',
    variables: { item: 'one' },
    activeElementInstances: [
      { key: '3100000000000000296', elementId: 'CallActivity', elementType: 'callActivity' },
    ],
    history: [
      {
        key: '3100000000000000297',
        elementId: 'NestedStartEvent',
        elementType: 'startEvent',
        state: 'completed',
        startedAt: '2026-01-01T10:01:00.000Z',
        completedAt: '2026-01-01T10:01:10.000Z',
      },
      {
        key: '3100000000000000298',
        elementId: 'CallActivity',
        elementType: 'callActivity',
        state: 'active',
        startedAt: '2026-01-01T10:02:00.000Z',
      },
    ],
    partition: 1,
    parentProcessInstanceKey: ROOT_INSTANCE_KEY,
  },
  {
    key: CALLED_INSTANCE_KEY,
    processDefinitionKey: '3000000000000000091',
    bpmnProcessId: 'called_incident_process',
    createdAt: '2026-01-01T10:03:00.000Z',
    state: 'active',
    processType: 'callActivity',
    variables: {},
    activeElementInstances: [
      { key: '3100000000000000299', elementId: 'CalledServiceTask', elementType: 'serviceTask' },
    ],
    history: [],
    partition: 1,
    parentProcessInstanceKey: MULTI_INSTANCE_KEY,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '4100000000000000290',
    elementInstanceKey: '3100000000000000299',
    elementId: 'CalledServiceTask',
    processInstanceKey: CALLED_INSTANCE_KEY,
    processDefinitionKey: '3000000000000000091',
    bpmnProcessId: 'called_incident_process',
    errorType: 'JOB_NO_RETRIES',
    message: 'Called service task failed',
    createdAt: '2026-01-01T10:04:00.000Z',
    executionToken: '3100000000000000299',
  },
];
