// Simple Task Process - mock data
// BPMN Flow: StartEvent_1 -> id (serviceTask "Test") -> Event_1j4mcqg (EndEvent)
import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';
import { hoursAgo, daysAgo, addMinutes } from '../types';
import bpmnData from './simple_task.bpmn?raw';

export const definition: MockProcessDefinition = {
  key: '3000000000000000046',
  version: 1,
  bpmnProcessId: 'Simple_Task_Process',
  bpmnProcessName: 'Simple Task',
  bpmnResourceName: 'simple_task.bpmn',
  bpmnData,
  createdAt: '2024-12-08T15:00:00.000Z',
};

// Helper to generate history for this process
const createInstance = (
  key: string,
  createdAt: string,
  state: 'active' | 'completed' | 'terminated' | 'failed',
  variables: Record<string, unknown>,
  partition: number,
  stoppedAtTask = true // true = stopped at Task_1, false = completed
): MockProcessInstance => {
  const startCompletedAt = addMinutes(createdAt, 1);

  // For completed instances, task completed and end event completed
  const taskCompletedAt = state === 'completed' ? addMinutes(createdAt, 5) : undefined;
  const endCompletedAt = state === 'completed' ? addMinutes(createdAt, 6) : undefined;

  const history = [
    {
      key: `${key}001`,
      elementId: 'StartEvent_1',
      elementType: 'startEvent',
      state: 'completed' as const,
      startedAt: createdAt,
      completedAt: startCompletedAt,
    },
    ...(stoppedAtTask || state === 'completed'
      ? [
          {
            key: `${key}002`,
            elementId: 'id',
            elementType: 'serviceTask',
            state: (state === 'completed' ? 'completed' : state) as 'active' | 'completed' | 'terminated' | 'failed',
            startedAt: startCompletedAt,
            completedAt: taskCompletedAt,
          },
        ]
      : []),
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
    processDefinitionKey: '3000000000000000046',
    bpmnProcessId: 'Simple_Task_Process',
    createdAt,
    state,
    variables,
    activeElementInstances:
      state === 'active' || state === 'failed'
        ? [{ key: `${key}002`, elementId: 'id', elementType: 'serviceTask' }]
        : [],
    history,
    partition,
  };
};

export const instances: MockProcessInstance[] = [
  // Partition 1
  createInstance(
    '3100000000000000017',
    hoursAgo(1),
    'active',
    {
      customerId: 'NEW-001',
      customerName: 'Tech Corp Inc.',
      customerType: 'business',
    },
    1
  ),
  createInstance(
    '2097302399374458886',
    daysAgo(3),
    'completed',
    {
      customerId: 'NEW-002',
      customerName: 'Retail Shop LLC',
      result: 'success',
    },
    1
  ),
  // Partition 2
  createInstance(
    '3100000000000000025',
    hoursAgo(2),
    'active',
    {
      customerId: 'NEW-101',
      customerName: 'Global Services Ltd.',
    },
    2
  ),
  createInstance(
    '2097302399374459009',
    daysAgo(2),
    'completed',
    {
      customerId: 'NEW-102',
      customerName: 'Finance Solutions Inc.',
      result: 'success',
    },
    2
  ),
  // Partition 3
  createInstance(
    '3100000000000000030',
    hoursAgo(6),
    'active',
    {
      customerId: 'NEW-201',
      customerName: 'Healthcare Plus',
    },
    3
  ),
  // Partition 4
  createInstance(
    '3100000000000000036',
    hoursAgo(1),
    'active',
    { customerId: 'NEW-301', customerName: 'Acme Corporation' },
    4
  ),
  createInstance(
    '3100000000000000037',
    hoursAgo(2),
    'active',
    { customerId: 'NEW-302', customerName: 'Beta Industries' },
    4
  ),
  createInstance(
    '2097302399374461015',
    hoursAgo(3),
    'completed',
    { customerId: 'NEW-303', customerName: 'Gamma Solutions', result: 'success' },
    4
  ),
  createInstance(
    '2097302399374461017',
    daysAgo(1),
    'completed',
    { customerId: 'NEW-304', customerName: 'Delta Systems', result: 'success' },
    4
  ),
  createInstance(
    '3100000000000000038',
    daysAgo(2),
    'failed',
    { customerId: 'NEW-305', customerName: 'Epsilon Tech', errorMessage: 'Connection timeout' },
    4
  ),
];

export const incidents: MockIncident[] = [
  {
    key: '3097302186542891011',
    elementInstanceKey: '2097302399374458885002',
    elementId: 'id',
    processInstanceKey: '3100000000000000017',
    processDefinitionKey: '3000000000000000046',
    message: `javax.script.ScriptException: ReferenceError: "customerData" is not defined in <eval> at line number 12
\tat jdk.scripting.nashorn/jdk.nashorn.api.scripting.NashornScriptEngine.throwAsScriptException(NashornScriptEngine.java:477)
\tat jdk.scripting.nashorn/jdk.nashorn.api.scripting.NashornScriptEngine.evalImpl(NashornScriptEngine.java:461)
\tat jdk.scripting.nashorn/jdk.nashorn.api.scripting.NashornScriptEngine.evalImpl(NashornScriptEngine.java:413)
\tat jdk.scripting.nashorn/jdk.nashorn.api.scripting.NashornScriptEngine.evalImpl(NashornScriptEngine.java:409)
\tat jdk.scripting.nashorn/jdk.nashorn.api.scripting.NashornScriptEngine.eval(NashornScriptEngine.java:162)
\tat javax.script/javax.script.AbstractScriptEngine.eval(AbstractScriptEngine.java:264)
\tat io.zenbpm.engine.script.ScriptTaskExecutor.executeScript(ScriptTaskExecutor.java:89)
\tat io.zenbpm.engine.script.ScriptTaskExecutor.execute(ScriptTaskExecutor.java:45)
\tat io.zenbpm.engine.runtime.JobExecutor.executeJob(JobExecutor.java:234)
\tat io.zenbpm.engine.runtime.JobExecutor.lambda$processJob$0(JobExecutor.java:156)
\tat java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
\tat java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
\tat java.base/java.lang.Thread.run(Thread.java:833)
Caused by: jdk.nashorn.internal.runtime.ECMAException: ReferenceError: "customerData" is not defined
\tat jdk.scripting.nashorn/jdk.nashorn.internal.runtime.ECMAErrors.error(ECMAErrors.java:62)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.runtime.ECMAErrors.referenceError(ECMAErrors.java:357)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.runtime.ECMAErrors.referenceError(ECMAErrors.java:329)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.objects.Global.__noSuchProperty__(Global.java:1644)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.scripts.Script$Recompilation$1$12A$\\^eval\\_.processCustomer(<eval>:12)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.scripts.Script$\\^eval\\_.:program(<eval>:1)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.runtime.ScriptFunctionData.invoke(ScriptFunctionData.java:655)
\tat jdk.scripting.nashorn/jdk.nashorn.internal.runtime.ScriptFunction.invoke(ScriptFunction.java:513)
\t... 11 more`,
    createdAt: hoursAgo(1),
    executionToken: 'token-223456',
  },
  {
    key: '3097302186542891012',
    elementInstanceKey: '2097302399374461019002',
    elementId: 'id',
    processInstanceKey: '3100000000000000038',
    processDefinitionKey: '3000000000000000046',
    message: `org.springframework.dao.DataAccessResourceFailureException: Unable to acquire JDBC Connection; nested exception is org.hibernate.exception.JDBCConnectionException: Unable to acquire JDBC Connection
\tat org.springframework.orm.jpa.vendor.HibernateJpaDialect.convertHibernateAccessException(HibernateJpaDialect.java:277)
\tat org.springframework.orm.jpa.vendor.HibernateJpaDialect.translateExceptionIfPossible(HibernateJpaDialect.java:233)
\tat org.springframework.orm.jpa.AbstractEntityManagerFactoryBean.translateExceptionIfPossible(AbstractEntityManagerFactoryBean.java:551)
\tat org.springframework.dao.support.ChainedPersistenceExceptionTranslator.translateExceptionIfPossible(ChainedPersistenceExceptionTranslator.java:61)
\tat org.springframework.dao.support.DataAccessUtils.translateIfNecessary(DataAccessUtils.java:242)
\tat org.springframework.dao.support.PersistenceExceptionTranslationInterceptor.invoke(PersistenceExceptionTranslationInterceptor.java:152)
\tat org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)
\tat org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:691)
\tat com.zenbpm.repository.CustomerRepository$$EnhancerBySpringCGLIB$$a1b2c3d4.findById(<generated>)
\tat com.zenbpm.services.CustomerService.getCustomer(CustomerService.java:67)
\tat com.zenbpm.handlers.CRMIntegrationHandler.syncCustomer(CRMIntegrationHandler.java:134)
\tat io.zenbpm.engine.runtime.JobExecutor.executeJob(JobExecutor.java:234)
\tat java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
\tat java.base/java.lang.Thread.run(Thread.java:833)
Caused by: org.hibernate.exception.JDBCConnectionException: Unable to acquire JDBC Connection
\tat org.hibernate.exception.internal.SQLExceptionTypeDelegate.convert(SQLExceptionTypeDelegate.java:48)
\tat org.hibernate.exception.internal.StandardSQLExceptionConverter.convert(StandardSQLExceptionConverter.java:37)
\tat org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:113)
\tat org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:99)
\tat org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.acquireConnectionIfNeeded(LogicalConnectionManagedImpl.java:111)
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:163)
\t... 12 more
Caused by: java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms.
\tat com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:696)
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:197)
\t... 6 more`,
    createdAt: daysAgo(2),
    executionToken: 'token-223457',
  },
];

// Jobs for this process - service task jobs
export const jobs = [
  {
    key: '5000000000000000008',
    elementId: 'id',
    elementName: 'Test',
    type: 'TestType',
    processInstanceKey: '3100000000000000017',
    processDefinitionKey: '3000000000000000046',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(1), 1),
    variables: { customerId: 'NEW-001', customerName: 'Tech Corp Inc.' },
    retries: 3,
  },
  {
    key: '5000000000000000015',
    elementId: 'id',
    elementName: 'Test',
    type: 'TestType',
    processInstanceKey: '3100000000000000025',
    processDefinitionKey: '3000000000000000046',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    variables: { customerId: 'NEW-101', customerName: 'Global Services Ltd.' },
    retries: 3,
  },
  {
    key: '5000000000000000018',
    elementId: 'id',
    elementName: 'Test',
    type: 'TestType',
    processInstanceKey: '3100000000000000030',
    processDefinitionKey: '3000000000000000046',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(6), 1),
    variables: { customerId: 'NEW-201', customerName: 'Healthcare Plus' },
    retries: 3,
  },
  {
    key: '5000000000000000023',
    elementId: 'id',
    elementName: 'Test',
    type: 'TestType',
    processInstanceKey: '3100000000000000036',
    processDefinitionKey: '3000000000000000046',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(1), 1),
    variables: { customerId: 'NEW-301', customerName: 'Acme Corporation' },
    retries: 3,
  },
  {
    key: '5000000000000000024',
    elementId: 'id',
    elementName: 'Test',
    type: 'TestType',
    processInstanceKey: '3100000000000000037',
    processDefinitionKey: '3000000000000000046',
    state: 'active' as const,
    createdAt: addMinutes(hoursAgo(2), 1),
    variables: { customerId: 'NEW-302', customerName: 'Beta Industries' },
    retries: 3,
  },
  {
    key: '5000000000000000025',
    elementId: 'id',
    elementName: 'Test',
    type: 'TestType',
    processInstanceKey: '3100000000000000038',
    processDefinitionKey: '3000000000000000046',
    state: 'failed' as const,
    createdAt: addMinutes(daysAgo(2), 1),
    variables: { customerId: 'NEW-305', customerName: 'Epsilon Tech' },
    retries: 0,
    errorMessage: 'Failed to connect to external CRM system: Connection timeout after 30s',
  },
];
