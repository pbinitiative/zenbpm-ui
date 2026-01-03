// Exclusive Gateway Multiple Tasks No Default - mock data
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo } from '../types';
import bpmnData from './exclusive-gateway-multiple-tasks-no-default.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000005',
  version: 1,
  bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
  bpmnProcessName: 'Exclusive Gateway Multiple Tasks No Default',
  bpmnResourceName: 'exclusive-gateway-multiple-tasks-no-default.bpmn',
  bpmnData,
  createdAt: '2024-12-10T08:00:00.000Z',
};

export const instances: MockProcessInstance[] = [
  // Partition 1
  {
    key: '3100000000000000020',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(4),
    state: 'active',
    variables: {
      orderId: 'ORD-2024-001',
      orderTotal: 299.99,
    },
    activeElementInstances: [
      { key: '3100000000000000005', elementId: 'task-a', elementType: 'task' },
    ],
    history: [],
    partition: 1,
  },
  {
    key: '3100000000000000021',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(6),
    state: 'completed',
    variables: {
      orderId: 'ORD-2024-002',
      orderTotal: 149.50,
    },
    activeElementInstances: [],
    history: [],
    partition: 1,
  },
  // Partition 2
  {
    key: '3100000000000000027',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(7),
    state: 'active',
    variables: {
      orderId: 'ORD-2024-101',
      orderTotal: 599.99,
    },
    activeElementInstances: [
      { key: '3100000000000000006', elementId: 'task-b', elementType: 'task' },
    ],
    history: [],
    partition: 2,
  },
  {
    key: '3100000000000000028',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: daysAgo(1),
    state: 'failed',
    variables: {
      orderId: 'ORD-2024-102',
      orderTotal: 89.99,
      errorMessage: 'Payment gateway timeout',
    },
    activeElementInstances: [
      { key: '3100000000000000007', elementId: 'task-a', elementType: 'task' },
    ],
    history: [],
    partition: 2,
  },
  // Partition 3
  {
    key: '3100000000000000031',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(9),
    state: 'active',
    variables: {
      orderId: 'ORD-2024-201',
      orderTotal: 1299.99,
    },
    activeElementInstances: [
      { key: '3100000000000000008', elementId: 'task-a', elementType: 'task' },
    ],
    history: [],
    partition: 3,
  },
  // Partition 4
  {
    key: '3100000000000000042',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(1),
    state: 'active',
    variables: { orderId: 'ORD-2024-301', orderTotal: 459.99 },
    activeElementInstances: [{ key: '3100000000000000009', elementId: 'task-a', elementType: 'task' }],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000043',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(2),
    state: 'active',
    variables: { orderId: 'ORD-2024-302', orderTotal: 789.50 },
    activeElementInstances: [{ key: '3100000000000000010', elementId: 'task-b', elementType: 'task' }],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000044',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(3),
    state: 'completed',
    variables: { orderId: 'ORD-2024-303', orderTotal: 129.00 },
    activeElementInstances: [],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000045',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(5),
    state: 'active',
    variables: { orderId: 'ORD-2024-304', orderTotal: 2499.99 },
    activeElementInstances: [{ key: '3100000000000000011', elementId: 'task-a', elementType: 'task' }],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000046',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(7),
    state: 'completed',
    variables: { orderId: 'ORD-2024-305', orderTotal: 349.99 },
    activeElementInstances: [],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000047',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: hoursAgo(8),
    state: 'active',
    variables: { orderId: 'ORD-2024-306', orderTotal: 899.00 },
    activeElementInstances: [{ key: '3100000000000000012', elementId: 'task-b', elementType: 'task' }],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000048',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: daysAgo(1),
    state: 'terminated',
    variables: { orderId: 'ORD-2024-307', orderTotal: 59.99 },
    activeElementInstances: [],
    history: [],
    partition: 4,
  },
  {
    key: '3100000000000000049',
    processDefinitionKey: '3000000000000000005',
    bpmnProcessId: 'exclusive-gateway-multiple-tasks-no-default',
    createdAt: daysAgo(2),
    state: 'completed',
    variables: { orderId: 'ORD-2024-308', orderTotal: 1599.00 },
    activeElementInstances: [],
    history: [],
    partition: 4,
  },
];

export const incidents: MockIncident[] = [
  {
    key: '3097302376817491971',
    elementInstanceKey: '3100000000000000005',
    elementId: 'task-a',
    processInstanceKey: '3100000000000000028',
    processDefinitionKey: '3000000000000000005',
    message: 'Database constraint violation: Duplicate order ID "ORD-2024-102"',
    createdAt: hoursAgo(4),
    executionToken: 'token-423456',
  },
];
