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
// Second active simple-task instance — used to verify falsy ZEN_FORM retains the generic completion dialog.
export const SIMPLE_TASK_FALSY_FORM_INSTANCE_KEY = '3100000000000000025';

// Process instance keys — multi-instance sectioned pagination test
// Parent has 2 multiInstance children, each with 8 history entries (> default pageSize of 5).
export const MULTI_INSTANCE_PARENT_KEY = '5100000000000000001';
export const MULTI_INSTANCE_CHILD_A_KEY = '5100000000000000002';
export const MULTI_INSTANCE_CHILD_B_KEY = '5100000000000000003';
export const MULTI_INSTANCE_PROCESS_DEFINITION_KEY = '5000000000000000001';
