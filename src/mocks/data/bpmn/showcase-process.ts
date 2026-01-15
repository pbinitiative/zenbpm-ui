// Showcase Process - mock data
// BPMN Flow: StartEvent_1 -> task-a (userTask "Base approval") -> Gateway_01wr5g0 (exclusive)
//   If price > 50000: -> task-b (userTask "High value approval") -> Gateway_1dkelqq -> Event_196zxhe
//   If price <= 50000: -> Gateway_1dkelqq -> Event_196zxhe
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo, addMinutes } from '../types';
import bpmnData from './showcase-process.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000033',
  version: 1,
  bpmnProcessId: 'showcase-process',
  bpmnProcessName: 'Showcase Process',
  bpmnResourceName: 'showcase-process.bpmn',
  bpmnData,
  createdAt: '2024-12-09T05:00:00.000Z',
};

type StoppedAt = 'task-a' | 'task-b' | 'completed';

// Helper to generate history for showcase process
const createInstance = (
  key: string,
  createdAt: string,
  state: 'active' | 'completed' | 'terminated' | 'failed',
  variables: Record<string, unknown>,
  partition: number,
  stoppedAt: StoppedAt = 'task-a',
  isHighValue = false // Determines if it goes through task-b (price > 50000)
): MockProcessInstance => {
  const startCompletedAt = addMinutes(createdAt, 1);
  const taskACompletedAt = stoppedAt !== 'task-a' ? addMinutes(createdAt, 30) : undefined;
  const gatewayCompletedAt = taskACompletedAt ? addMinutes(taskACompletedAt, 1) : undefined;
  const taskBCompletedAt = stoppedAt === 'completed' && isHighValue ? addMinutes(gatewayCompletedAt!, 60) : undefined;
  const joinGatewayCompletedAt = stoppedAt === 'completed'
    ? (isHighValue ? addMinutes(taskBCompletedAt!, 1) : addMinutes(gatewayCompletedAt!, 1))
    : undefined;
  const endCompletedAt = joinGatewayCompletedAt ? addMinutes(joinGatewayCompletedAt, 1) : undefined;

  const history = [
    // Start Event always completed
    {
      key: `${key}001`,
      elementId: 'StartEvent_1',
      elementType: 'startEvent',
      state: 'completed' as const,
      startedAt: createdAt,
      completedAt: startCompletedAt,
    },
    // Task A (Base approval)
    {
      key: `${key}002`,
      elementId: 'task-a',
      elementType: 'userTask',
      state: (stoppedAt === 'task-a' ? state : 'completed'),
      startedAt: startCompletedAt,
      completedAt: taskACompletedAt,
    },
    // Gateway (only if task-a completed)
    ...(stoppedAt !== 'task-a'
      ? [
          {
            key: `${key}003`,
            elementId: 'Gateway_01wr5g0',
            elementType: 'exclusiveGateway',
            state: 'completed' as const,
            startedAt: taskACompletedAt!,
            completedAt: gatewayCompletedAt,
          },
        ]
      : []),
    // Task B (High value approval) - only for high value path
    ...(isHighValue && stoppedAt !== 'task-a'
      ? [
          {
            key: `${key}004`,
            elementId: 'task-b',
            elementType: 'userTask',
            state: (stoppedAt === 'task-b' ? state : 'completed'),
            startedAt: gatewayCompletedAt!,
            completedAt: taskBCompletedAt,
          },
        ]
      : []),
    // Join Gateway (only if completed)
    ...(stoppedAt === 'completed'
      ? [
          {
            key: `${key}005`,
            elementId: 'Gateway_1dkelqq',
            elementType: 'exclusiveGateway',
            state: 'completed' as const,
            startedAt: isHighValue ? taskBCompletedAt! : gatewayCompletedAt!,
            completedAt: joinGatewayCompletedAt,
          },
          {
            key: `${key}006`,
            elementId: 'Event_196zxhe',
            elementType: 'endEvent',
            state: 'completed' as const,
            startedAt: joinGatewayCompletedAt!,
            completedAt: endCompletedAt,
          },
        ]
      : []),
  ];

  // Determine active element
  let activeElementInstances: Array<{ key: string; elementId: string; elementType: string }> = [];
  if (state === 'active' || state === 'failed') {
    if (stoppedAt === 'task-a') {
      activeElementInstances = [{ key: `${key}002`, elementId: 'task-a', elementType: 'userTask' }];
    } else if (stoppedAt === 'task-b') {
      activeElementInstances = [{ key: `${key}004`, elementId: 'task-b', elementType: 'userTask' }];
    }
  }

  return {
    key,
    processDefinitionKey: '3000000000000000033',
    bpmnProcessId: 'showcase-process',
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
    '3100000000000000014',
    hoursAgo(2),
    'active',
    {
      customerId: 'CUST-001',
      customerName: 'John Smith',
      loanAmount: 50000,
      loanType: 'personal',
    },
    1,
    'task-a'
  ),
  createInstance(
    '3100000000000000015',
    hoursAgo(5),
    'active',
    {
      customerId: 'CUST-002',
      customerName: 'Jane Doe',
      loanAmount: 75000,
      loanType: 'auto',
      price: 75000, // High value
    },
    1,
    'task-b',
    true // High value path
  ),
  createInstance(
    '2097302399374458883',
    daysAgo(1),
    'completed',
    {
      customerId: 'CUST-003',
      customerName: 'Bob Wilson',
      loanAmount: 100000,
      price: 100000,
      approved: true,
    },
    1,
    'completed',
    true // High value path
  ),
  createInstance(
    '3100000000000000016',
    daysAgo(2),
    'failed',
    {
      customerId: 'CUST-004',
      customerName: 'Alice Brown',
      loanAmount: 15000,
      errorMessage: 'Credit check service unavailable',
    },
    1,
    'task-a'
  ),
  // Partition 2
  createInstance(
    '3100000000000000023',
    hoursAgo(1),
    'active',
    {
      customerId: 'CUST-101',
      customerName: 'Emma Watson',
      loanAmount: 75000,
      price: 75000,
    },
    2,
    'task-b',
    true
  ),
  createInstance(
    '3100000000000000024',
    hoursAgo(3),
    'active',
    {
      customerId: 'CUST-102',
      customerName: 'Oliver Jones',
      loanAmount: 35000,
    },
    2,
    'task-a'
  ),
  createInstance(
    '2097302399374459005',
    daysAgo(1),
    'completed',
    {
      customerId: 'CUST-103',
      customerName: 'Sophia Miller',
      loanAmount: 20000,
      approved: true,
    },
    2,
    'completed',
    false // Low value path
  ),
  // Partition 3
  createInstance(
    '3100000000000000029',
    hoursAgo(4),
    'active',
    {
      customerId: 'CUST-201',
      customerName: 'Liam Brown',
      loanAmount: 45000,
    },
    3,
    'task-a'
  ),
  createInstance(
    '2097302399374460003',
    daysAgo(2),
    'completed',
    {
      customerId: 'CUST-202',
      customerName: 'Ava Taylor',
      loanAmount: 120000,
      price: 120000,
      approved: true,
    },
    3,
    'completed',
    true // High value path
  ),
  // Partition 4
  createInstance(
    '3100000000000000032',
    hoursAgo(1),
    'active',
    { customerId: 'CUST-301', customerName: 'Noah Davis', loanAmount: 60000, price: 60000 },
    4,
    'task-b',
    true
  ),
  createInstance(
    '3100000000000000033',
    hoursAgo(2),
    'active',
    { customerId: 'CUST-302', customerName: 'Isabella Garcia', loanAmount: 30000 },
    4,
    'task-a'
  ),
  createInstance(
    '2097302399374461005',
    hoursAgo(3),
    'completed',
    { customerId: 'CUST-303', customerName: 'Mason Martinez', loanAmount: 95000, price: 95000, approved: true },
    4,
    'completed',
    true
  ),
  createInstance(
    '3100000000000000034',
    hoursAgo(4),
    'active',
    { customerId: 'CUST-304', customerName: 'Charlotte Anderson', loanAmount: 55000, price: 55000 },
    4,
    'task-b',
    true
  ),
  createInstance(
    '3100000000000000035',
    hoursAgo(5),
    'failed',
    { customerId: 'CUST-305', customerName: 'Elijah Thomas', loanAmount: 30000, errorMessage: 'Document validation failed' },
    4,
    'task-a'
  ),
];

export const incidents: MockIncident[] = [
  {
    key: '3097302399374458881',
    elementInstanceKey: '2097302399374458884002',
    elementId: 'task-a',
    processInstanceKey: '3100000000000000016',
    processDefinitionKey: '3000000000000000033',
    message: `java.net.SocketTimeoutException: Connection timed out after 30000ms
\tat java.base/sun.nio.ch.NioSocketImpl.timedFinishConnect(NioSocketImpl.java:546)
\tat java.base/sun.nio.ch.NioSocketImpl.connect(NioSocketImpl.java:597)
\tat java.base/java.net.SocksSocketImpl.connect(SocksSocketImpl.java:327)
\tat java.base/java.net.Socket.connect(Socket.java:633)
\tat org.apache.http.conn.ssl.SSLConnectionSocketFactory.connectSocket(SSLConnectionSocketFactory.java:368)
\tat org.apache.http.impl.conn.DefaultHttpClientConnectionOperator.connect(DefaultHttpClientConnectionOperator.java:142)
\tat org.apache.http.impl.conn.PoolingHttpClientConnectionManager.connect(PoolingHttpClientConnectionManager.java:376)
\tat org.apache.http.impl.execchain.MainClientExec.establishRoute(MainClientExec.java:393)
\tat org.apache.http.impl.execchain.MainClientExec.execute(MainClientExec.java:236)
\tat org.apache.http.impl.execchain.ProtocolExec.execute(ProtocolExec.java:186)
\tat org.apache.http.impl.execchain.RetryExec.execute(RetryExec.java:89)
\tat org.apache.http.impl.execchain.RedirectExec.execute(RedirectExec.java:110)
\tat org.apache.http.impl.client.InternalHttpClient.doExecute(InternalHttpClient.java:185)
\tat org.apache.http.impl.client.CloseableHttpClient.execute(CloseableHttpClient.java:83)
\tat com.zenbpm.services.credit.CreditCheckService.checkCredit(CreditCheckService.java:127)
\tat com.zenbpm.handlers.LoanApprovalHandler.validateCustomer(LoanApprovalHandler.java:89)
\tat com.zenbpm.handlers.LoanApprovalHandler.handle(LoanApprovalHandler.java:45)
\tat io.zenbpm.engine.runtime.JobExecutor.executeJob(JobExecutor.java:234)
\tat io.zenbpm.engine.runtime.JobExecutor.lambda$processJob$0(JobExecutor.java:156)
\tat java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
\tat java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
\tat java.base/java.lang.Thread.run(Thread.java:833)
Caused by: java.net.ConnectException: Connection refused (Connection refused)
\tat java.base/sun.nio.ch.Net.pollConnect(Native Method)
\tat java.base/sun.nio.ch.Net.pollConnectNow(Net.java:672)
\tat java.base/sun.nio.ch.NioSocketImpl.timedFinishConnect(NioSocketImpl.java:542)
\t... 21 more`,
    createdAt: daysAgo(2),
    executionToken: 'token-123456',
  },
  {
    key: '3097302399374458882',
    elementInstanceKey: '2097302399374461009002',
    elementId: 'task-a',
    processInstanceKey: '3100000000000000035',
    processDefinitionKey: '3000000000000000033',
    message: `com.zenbpm.exceptions.DocumentValidationException: Required document "ID_PROOF" is missing
\tat com.zenbpm.services.document.DocumentValidator.validateRequired(DocumentValidator.java:156)
\tat com.zenbpm.services.document.DocumentValidator.validate(DocumentValidator.java:89)
\tat com.zenbpm.handlers.DocumentUploadHandler.processDocuments(DocumentUploadHandler.java:234)
\tat com.zenbpm.handlers.DocumentUploadHandler.handle(DocumentUploadHandler.java:67)
\tat io.zenbpm.engine.runtime.JobExecutor.executeJob(JobExecutor.java:234)
\tat io.zenbpm.engine.runtime.JobExecutor.lambda$processJob$0(JobExecutor.java:156)
\tat java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
\tat java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
\tat java.base/java.lang.Thread.run(Thread.java:833)`,
    createdAt: hoursAgo(5),
    executionToken: 'token-123457',
  },
];

// Jobs (User Tasks) for this process
export const jobs = [
  // task-a (Base approval) jobs
  {
    key: '5000000000000000005',
    elementId: 'task-a',
    elementName: 'Base approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000014',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    variables: { customerId: 'CUST-001', customerName: 'John Smith', loanAmount: 50000 },
    candidateGroups: ['loan-reviewers'],
  },
  {
    key: '5000000000000000014',
    elementId: 'task-a',
    elementName: 'Base approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000024',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(3), 1),
    variables: { customerId: 'CUST-102', customerName: 'Oliver Jones', loanAmount: 35000 },
    candidateGroups: ['loan-reviewers'],
  },
  {
    key: '5000000000000000017',
    elementId: 'task-a',
    elementName: 'Base approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000029',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(4), 1),
    variables: { customerId: 'CUST-201', customerName: 'Liam Brown', loanAmount: 45000 },
    candidateGroups: ['loan-reviewers'],
  },
  {
    key: '5000000000000000020',
    elementId: 'task-a',
    elementName: 'Base approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000033',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    variables: { customerId: 'CUST-302', customerName: 'Isabella Garcia', loanAmount: 30000 },
    candidateGroups: ['loan-reviewers'],
  },
  {
    key: '5000000000000000007',
    elementId: 'task-a',
    elementName: 'Base approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000016',
    processDefinitionKey: '3000000000000000033',
    state: 'failed' as const,
    createdAt: addMinutes(daysAgo(2), 1),
    variables: { customerId: 'CUST-004', customerName: 'Alice Brown', loanAmount: 15000 },
    candidateGroups: ['loan-reviewers'],
    errorMessage: 'External credit service unavailable: Connection timeout after 30000ms',
    retries: 0,
  },
  {
    key: '5000000000000000022',
    elementId: 'task-a',
    elementName: 'Base approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000035',
    processDefinitionKey: '3000000000000000033',
    state: 'failed' as const,
    createdAt: addMinutes(hoursAgo(5), 1),
    variables: { customerId: 'CUST-305', customerName: 'Elijah Thomas', loanAmount: 30000 },
    candidateGroups: ['loan-reviewers'],
    errorMessage: 'Document validation failed: Required document "ID_PROOF" is missing',
    retries: 0,
  },
  // task-b (High value approval) jobs
  {
    key: '5000000000000000006',
    elementId: 'task-b',
    elementName: 'High value approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000015',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(5), 31),
    variables: { customerId: 'CUST-002', customerName: 'Jane Doe', loanAmount: 75000 },
    candidateGroups: ['loan-managers'],
  },
  {
    key: '5000000000000000013',
    elementId: 'task-b',
    elementName: 'High value approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000023',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(1), 31),
    variables: { customerId: 'CUST-101', customerName: 'Emma Watson', loanAmount: 75000 },
    candidateGroups: ['loan-managers'],
  },
  {
    key: '5000000000000000019',
    elementId: 'task-b',
    elementName: 'High value approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000032',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(1), 31),
    variables: { customerId: 'CUST-301', customerName: 'Noah Davis', loanAmount: 60000 },
    candidateGroups: ['loan-managers'],
  },
  {
    key: '5000000000000000021',
    elementId: 'task-b',
    elementName: 'High value approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000034',
    processDefinitionKey: '3000000000000000033',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(4), 31),
    variables: { customerId: 'CUST-304', customerName: 'Charlotte Anderson', loanAmount: 55000 },
    candidateGroups: ['loan-managers'],
  },
];
