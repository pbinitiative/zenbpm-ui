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
