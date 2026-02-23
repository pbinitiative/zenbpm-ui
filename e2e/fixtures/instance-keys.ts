/**
 * Centralized process instance key fixture for e2e tests.
 *
 * In mock mode (default): keys are imported from src/mocks/data/well-known-keys.ts,
 * which is the single source of truth shared with the mock data files. Changing a
 * key there propagates automatically to both the mocks and the tests.
 *
 * In live mode: keys are read from environment variables that must be populated
 * by the CI/CD seeding script before running the tests:
 *
 *   E2E_MODE=live
 *   E2E_ACTIVE_INSTANCE_KEY=<key of an active instance in the test environment>
 *   E2E_COMPLETED_INSTANCE_KEY=<key of a completed instance in the test environment>
 *   E2E_TERMINATED_INSTANCE_KEY=<key of a terminated instance in the test environment>
 *   E2E_SHOWCASE_PROCESS_DEFINITION_KEY=<key of the showcase process definition>
 */

import {
  SHOWCASE_PROCESS_DEFINITION_KEY,
  SHOWCASE_ACTIVE_INSTANCE_KEY,
  SHOWCASE_COMPLETED_INSTANCE_KEY,
  USER_TASKS_TERMINATED_INSTANCE_KEY,
} from '../../src/mocks/data/well-known-keys';

const E2E_MODE = process.env.E2E_MODE ?? 'mocks';

function keysFromMocks() {
  return {
    ACTIVE_INSTANCE_KEY: SHOWCASE_ACTIVE_INSTANCE_KEY,
    COMPLETED_INSTANCE_KEY: SHOWCASE_COMPLETED_INSTANCE_KEY,
    TERMINATED_INSTANCE_KEY: USER_TASKS_TERMINATED_INSTANCE_KEY,
    SHOWCASE_PROCESS_DEFINITION_KEY,
  };
}

function keysFromEnv() {
  const required = [
    'E2E_ACTIVE_INSTANCE_KEY',
    'E2E_COMPLETED_INSTANCE_KEY',
    'E2E_TERMINATED_INSTANCE_KEY',
    'E2E_SHOWCASE_PROCESS_DEFINITION_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `E2E_MODE=live but the following environment variables are not set: ${missing.join(', ')}\n` +
      'Populate them from your seeded test environment before running e2e tests.'
    );
  }
  return {
    ACTIVE_INSTANCE_KEY: process.env.E2E_ACTIVE_INSTANCE_KEY!,
    COMPLETED_INSTANCE_KEY: process.env.E2E_COMPLETED_INSTANCE_KEY!,
    TERMINATED_INSTANCE_KEY: process.env.E2E_TERMINATED_INSTANCE_KEY!,
    SHOWCASE_PROCESS_DEFINITION_KEY: process.env.E2E_SHOWCASE_PROCESS_DEFINITION_KEY!,
  };
}

export const instanceKeys = E2E_MODE === 'mocks' ? keysFromMocks() : keysFromEnv();
