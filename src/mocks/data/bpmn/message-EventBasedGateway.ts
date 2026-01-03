// Message Event Based Gateway - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { daysAgo, hoursAgo } from '../types';
import bpmnData from './message-EventBasedGateway.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000018',
  version: 1,
  bpmnProcessId: 'message-EventBasedGateway',
  bpmnProcessName: 'Message Event Based Gateway',
  bpmnResourceName: 'message-EventBasedGateway.bpmn',
  bpmnData,
  createdAt: '2024-12-09T20:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  {
    key: '3100000000000000128',
    processDefinitionKey: '3000000000000000018',
    bpmnProcessId: 'message-EventBasedGateway',
    createdAt: hoursAgo(4),
    state: 'active',
    variables: { correlationId: 'CORR-001', waitingFor: ['MessageA', 'MessageB'] },
    activeElementInstances: [{ key: '3100000000000000129', elementId: 'EventBasedGateway_1', elementType: 'eventBasedGateway' }],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000130',
    processDefinitionKey: '3000000000000000018',
    bpmnProcessId: 'message-EventBasedGateway',
    createdAt: daysAgo(1),
    state: 'completed',
    variables: { correlationId: 'CORR-002', receivedMessage: 'MessageA' },
    activeElementInstances: [],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000131',
    processDefinitionKey: '3000000000000000018',
    bpmnProcessId: 'message-EventBasedGateway',
    createdAt: daysAgo(3),
    state: 'completed',
    variables: { correlationId: 'CORR-003', receivedMessage: 'MessageB' },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
];

export const incidents: MockIncident[] = [];
