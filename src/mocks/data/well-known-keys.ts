/**
 * Well-known mock data keys.
 *
 * This file contains only plain string constants — no Vite-specific imports,
 * no ?raw assets — so it can be imported by both the Vite app (src/) and
 * Playwright e2e tests (which run in plain Node.js).
 *
 * These keys are the single source of truth for the identifiers used in
 * mock data and e2e tests. If you need to change a key, change it here
 * and the change propagates everywhere automatically.
 */

// Process definition keys
export const SHOWCASE_PROCESS_DEFINITION_KEY = '3000000000000000033';

// Process instance keys — showcase-process
export const SHOWCASE_ACTIVE_INSTANCE_KEY = '3100000000000000014';
export const SHOWCASE_COMPLETED_INSTANCE_KEY = '2097302399374458883';

// Process instance keys — user-tasks-with-assignments
export const USER_TASKS_TERMINATED_INSTANCE_KEY = '2097302399374461029';

// Process instance keys — simple-user-task
export const SIMPLE_USER_TASK_CUSTOM_TYPE_INSTANCE_KEY = '3100000000000000210';
export const SIMPLE_USER_TASK_DEFAULT_TYPE_INSTANCE_KEY = '3100000000000000211';
export const SIMPLE_USER_TASK_PROCESS_DEFINITION_KEY = '3000000000000000047';

// Process instance keys — user-task-classification-tree
export const USER_TASK_CLASSIFICATION_PROCESS_DEFINITION_KEY = '3000000000000000092';
export const USER_TASK_CLASSIFICATION_ROOT_INSTANCE_KEY = '3100000000000000300';
export const USER_TASK_CLASSIFICATION_CHILD_INSTANCE_KEY = '3100000000000000301';
// Second child under the classification root — uses the simple-user-task
// definition (which has a real `bpmn:userTask id="user-task"`) so the
// fixture exercises a true positive: a child process whose own definition
// classifies its jobs as User Tasks.
export const USER_TASK_CLASSIFICATION_CHILD_USER_TASK_INSTANCE_KEY = '3100000000000000302';
export const SIMPLE_TASK_ACTIVE_INSTANCE_KEY = '3100000000000000017';
// Its service job, never handed out to a worker.
export const SIMPLE_TASK_ACTIVE_JOB_KEY = '5000000000000000008';
// Second active simple-task instance — used to verify falsy ZEN_FORM retains the generic completion dialog.
export const SIMPLE_TASK_FALSY_FORM_INSTANCE_KEY = '3100000000000000025';
// Simple-task instance whose service job failed once and waits out a retry backoff.
export const SIMPLE_TASK_BACKOFF_INSTANCE_KEY = '3100000000000000036';
export const SIMPLE_TASK_BACKOFF_JOB_KEY = '5000000000000000023';
// Failed simple-task instance whose service job exhausted its retries and raised an incident.
export const SIMPLE_TASK_FAILED_INSTANCE_KEY = '3100000000000000038';
export const SIMPLE_TASK_FAILED_JOB_KEY = '5000000000000000025';
export const SIMPLE_TASK_FAILED_JOB_INCIDENT_KEY = '3097302186542891012';
// Resolved incident of an earlier series of attempts of the same job.
export const SIMPLE_TASK_FAILED_JOB_EARLIER_INCIDENT_KEY = '3097302186542891013';

// Process instance keys — multi-instance sectioned pagination test
// Parent has 2 multiInstance children, each with 8 history entries (> default pageSize of 5).
export const MULTI_INSTANCE_PARENT_KEY = '5100000000000000001';
export const MULTI_INSTANCE_CHILD_A_KEY = '5100000000000000002';
export const MULTI_INSTANCE_CHILD_B_KEY = '5100000000000000003';
export const MULTI_INSTANCE_PROCESS_DEFINITION_KEY = '5000000000000000001';

// Start event execution listener: one instance waits for its listener job, one has
// spent the listener job's retries and carries an incident on its start event.
export const START_LISTENER_PROCESS_DEFINITION_KEY = '3000000000000000094';
export const START_LISTENER_WAITING_INSTANCE_KEY = '3100000000000000310';
export const START_LISTENER_WAITING_JOB_KEY = '5000000000000000040';
export const START_LISTENER_FAILED_INSTANCE_KEY = '3100000000000000311';
export const START_LISTENER_FAILED_JOB_KEY = '5000000000000000041';
export const START_LISTENER_FAILED_JOB_INCIDENT_KEY = '3097302186542891020';

// Execution listeners of tasks: a service task with two start and two end listeners, then a
// user task with one start listener. Each instance waits behind another job of the chain.
export const TASK_LISTENERS_PROCESS_DEFINITION_KEY = '3000000000000000095';
// The service task waits behind its second start listener; the first one is completed.
export const TASK_LISTENERS_START_LISTENER_INSTANCE_KEY = '3100000000000000312';
export const TASK_LISTENERS_COMPLETED_START_LISTENER_JOB_KEY = '5000000000000000042';
export const TASK_LISTENERS_ACTIVE_START_LISTENER_JOB_KEY = '5000000000000000043';
// The service task did its own work and waits behind its first end listener.
export const TASK_LISTENERS_END_LISTENER_INSTANCE_KEY = '3100000000000000313';
export const TASK_LISTENERS_ACTIVE_END_LISTENER_JOB_KEY = '5000000000000000047';
// The first end listener spent its retries: its incident stands on the service task.
export const TASK_LISTENERS_FAILED_END_LISTENER_INSTANCE_KEY = '3100000000000000314';
export const TASK_LISTENERS_FAILED_END_LISTENER_JOB_KEY = '5000000000000000051';
export const TASK_LISTENERS_FAILED_END_LISTENER_INCIDENT_KEY = '3097302186542891021';
// A row gone stale: the second start listener's job still reads failed, although its incident
// is resolved, and the only open incident on the service task names no job: it is the task's own.
export const TASK_LISTENERS_ELEMENT_INCIDENT_INSTANCE_KEY = '3100000000000000317';
export const TASK_LISTENERS_ELEMENT_INCIDENT_LISTENER_JOB_KEY = '5000000000000000066';
export const TASK_LISTENERS_ELEMENT_INCIDENT_KEY = '3097302186542891022';
// The user task waits behind its start listener; its own job does not exist yet.
export const TASK_LISTENERS_USER_TASK_LISTENER_INSTANCE_KEY = '3100000000000000315';
export const TASK_LISTENERS_USER_TASK_LISTENER_JOB_KEY = '5000000000000000057';
// The user task waits behind its own job; the job of its start listener is completed.
export const TASK_LISTENERS_USER_TASK_INSTANCE_KEY = '3100000000000000316';
export const TASK_LISTENERS_USER_TASK_OWN_JOB_KEY = '5000000000000000064';
