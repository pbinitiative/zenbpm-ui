// Engine-like job retry behaviour for the mocks: setting retries, failures
// without an error code, and resolving the incident a job raised. It follows
// zenbpm's job retries (docs/reference/jobs.md, "Failures and retries") so that
// the browser tests can assert outcomes, not only requests. State lives in the
// page's memory and starts afresh with every page load.
import { parseIsoBackoff } from '@base/utils/isoDuration';
import { jobFailures, type MockJob } from './jobs';
import { incidents } from './incidents';
import { findProcessInstanceByKey } from './processInstances';
import type { MockIncident } from './types';

/** `jobs.defaultRetries` of the engine: one attempt, the first failure creates an incident. */
const DEFAULT_RETRIES = 1;

let nextKey = 5300000000000000000n;
const generateKey = (): string => String(nextKey++);

/** The backoff after the n-th failure: the n-th entry of the policy, its last entry repeating. */
const backoffForAttempt = (job: MockJob, attempt: number, requestedMs: number | undefined): number => {
  if (requestedMs !== undefined) return requestedMs;
  const policy = (job.retryBackoff ?? '')
    .split(',')
    .map((entry) => parseIsoBackoff(entry))
    .filter((entry): entry is number => entry !== undefined);
  return policy.length > 0 ? policy[Math.min(attempt, policy.length) - 1] : 0;
};

const elementInstanceKeyOf = (job: MockJob): string =>
  job.elementInstanceKey ??
  findProcessInstanceByKey(job.processInstanceKey)?.activeElementInstances.find(
    (elementInstance) => elementInstance.elementId === job.elementId
  )?.key ??
  job.key;

const isAhead = (timestamp: string | undefined, now: number): boolean =>
  timestamp !== undefined && Date.parse(timestamp) > now;

/** Sets the remaining retries of an active or failed job and when it is handed out next. */
export const updateMockJobRetries = (job: MockJob, retries: number, retryAt: string | undefined): void => {
  const now = Date.now();
  job.retries = retries;
  job.retryAt = isAhead(retryAt, now) ? retryAt : undefined;
  job.retriesUpdatedAt = new Date(now).toISOString();
};

/**
 * Spends one attempt of an active job. With retries left it stays active and
 * waits out its backoff; the failure which leaves none fails it with an
 * incident carrying the job's key.
 */
export const failMockJobWithoutErrorCode = (
  job: MockJob,
  message: string,
  variables: Record<string, unknown> | undefined,
  retries: number | undefined,
  retryBackoffMs: number | undefined
): void => {
  const now = Date.now();
  const remaining = retries ?? Math.max((job.retries ?? job.definitionRetries ?? DEFAULT_RETRIES) - 1, 0);
  job.attempts = (job.attempts ?? 0) + 1;
  job.retries = remaining;
  job.lastFailureMessage = message;
  const failure = {
    key: generateKey(),
    jobKey: job.key,
    processInstanceKey: job.processInstanceKey,
    attempt: job.attempts,
    failedAt: new Date(now).toISOString(),
    message,
  };

  if (remaining === 0) {
    job.retryAt = undefined;
    job.state = 'failed';
    job.retriesUpdatedAt = undefined;
    if (variables !== undefined) job.outputVariables = variables;
    const attempts = job.attempts === 1 ? '1 attempt' : `${job.attempts} attempts`;
    const incident: MockIncident = {
      key: generateKey(),
      elementInstanceKey: elementInstanceKeyOf(job),
      elementId: job.elementId,
      processInstanceKey: job.processInstanceKey,
      processDefinitionKey: job.processDefinitionKey,
      message: message === ''
        ? `job ${job.key} failed without a message (${attempts}, retries exhausted)`
        : `${message} (job ${job.key}: ${attempts}, retries exhausted)`,
      createdAt: new Date(now).toISOString(),
      executionToken: `token-${job.key}`,
      jobKey: job.key,
    };
    incidents.push(incident);
    jobFailures.push({ ...failure, incidentKey: incident.key });
    return;
  }

  const backoff = backoffForAttempt(job, job.attempts, retryBackoffMs);
  job.retryAt = backoff > 0 ? new Date(now + backoff).toISOString() : undefined;
  jobFailures.push({ ...failure, retryAt: job.retryAt });
};

/**
 * Resolves an incident. The failed job which raised it becomes active again
 * with a new series of attempts: retries set since it failed are kept with a
 * `retryAt` still ahead, otherwise the task definition's retries apply and the
 * job is handed out at once.
 */
export const resolveMockIncident = (incident: MockIncident, job: MockJob | undefined): void => {
  const now = Date.now();
  incident.resolvedAt = new Date(now).toISOString();
  if (job?.state === 'failed') {
    job.attempts = 0;
    if (job.retriesUpdatedAt !== undefined) {
      job.retriesUpdatedAt = undefined;
      if (!isAhead(job.retryAt, now)) job.retryAt = undefined;
    } else {
      job.retryAt = undefined;
      job.retries = job.definitionRetries ?? DEFAULT_RETRIES;
    }
    job.state = 'active';
  }
  const instance = findProcessInstanceByKey(incident.processInstanceKey);
  if (instance) instance.state = 'active';
};
