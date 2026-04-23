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

// Process instance keys — multi-instance sectioned pagination test
// Parent has 2 multiInstance children, each with 8 history entries (> default pageSize of 5).
export const MULTI_INSTANCE_PARENT_KEY = '5100000000000000001';
export const MULTI_INSTANCE_CHILD_A_KEY = '5100000000000000002';
export const MULTI_INSTANCE_CHILD_B_KEY = '5100000000000000003';
export const MULTI_INSTANCE_PROCESS_DEFINITION_KEY = '5000000000000000001';
