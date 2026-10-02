// Engine-like job retry behaviour for the mocks: setting retries, failures
// without an error code, and resolving the incident a job raised. It follows
// zenbpm's job retries (docs/reference/jobs.md, "Failures and retries") so that
// the browser tests can assert outcomes, not only requests. State lives in the
// page's memory and starts afresh with every page load.
import { parseIsoBackoff } from '@base/utils/isoDuration';
import { findJobByKey, jobFailures, jobs, type MockJob } from './jobs';
import { incidents } from './incidents';
import { findProcessInstanceByKey } from './processInstances';
import type { MockIncident } from './types';

/** `jobs.defaultRetries` of the engine: one attempt, the first failure creates an incident. */
const DEFAULT_RETRIES = 1;

/** Engine default of `jobs.maxRetries`. */
export const MAX_RETRIES = 100;

/** Engine default of `jobs.maxRetryBackoff`. */
export const MAX_RETRY_BACKOFF_MS = 24 * 60 * 60 * 1000;

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

/**
 * The message of a request the engine refused after passing it on to the
 * leader of the partition: a line naming the call, then the reason.
 */
export const leaderCallFailure = (call: string, reason: string): string => `client call to ${call} failed\n${reason}`;

/** The name the engine gives a job state in its messages, e.g. `ActivityStateCompleted`. */
export const engineStateName = (state: string): string => `ActivityState${state.charAt(0).toUpperCase()}${state.slice(1)}`;

/**
 * The engine's reason for refusing retries an operator sets for a job, by the
 * retries endpoint or with the resolution of its incident: outside 1 to
 * `jobs.maxRetries`, or a `retryAt` beyond `jobs.maxRetryBackoff` from now.
 * Undefined when the engine accepts them.
 */
export const operatorRetriesRefusal = (jobKey: string, retries: unknown, retryAt: unknown): string | undefined => {
  if (typeof retries !== 'number' || !Number.isInteger(retries) || retries < 1 || retries > MAX_RETRIES) {
    return `retries of job ${jobKey} must be between 1 and ${MAX_RETRIES} (jobs.maxRetries), got ${String(retries)}`;
  }
  if (typeof retryAt === 'string' && Date.parse(retryAt) > Date.now() + MAX_RETRY_BACKOFF_MS) {
    return `retryAt of job ${jobKey} must not be later than 24h0m0s from now (jobs.maxRetryBackoff), got ${retryAt}`;
  }
  return undefined;
};

/** Sets the remaining retries of an active or failed job and when it is handed out next. */
export const updateMockJobRetries = (job: MockJob, retries: number, retryAt: string | undefined): void => {
  const now = Date.now();
  job.retries = retries;
  job.retryAt = isAhead(retryAt, now) ? retryAt : undefined;
  job.retriesSetByOperator = true;
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
    job.retriesSetByOperator = false;
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
 * The engine's refusal to resolve an incident whose resolution would evaluate
 * the retries of the task definition, as it does when they no longer evaluate.
 * Retries an operator set since the job failed, or gives with the resolution,
 * are kept instead of evaluated, so they lift the refusal. Undefined when the
 * resolution evaluates nothing.
 */
export const definitionRetriesNotEvaluable = (
  incident: MockIncident,
  job: MockJob | undefined
): string | undefined => {
  if (job?.state !== 'failed' || job.retriesSetByOperator) return undefined;
  return leaderCallFailure(
    'resolve incident',
    `incident cannot be resolved as things stand: the retries of job ${job.key} no longer evaluate ` +
      '(retries expression "=attemptsAllowed + 1": evaluated to <nil> (<nil>), which is not an integer); ' +
      'correct the variables they read and resolve the incident again, or resolve it with the job\'s retries ' +
      `given ("retries" in the body of POST /v1/incidents/${incident.key}/resolve)`
  );
};

/** States of a job the engine still waits on, the legacy fixtures' waiting states included. */
const PENDING_STATES = new Set<MockJob['state']>(['active', 'activatable', 'activated', 'failed']);

/**
 * The job the resolution of an incident leaves waiting, as the engine picks
 * it: the job the incident names, or else the pending job on the incident's
 * token, such as the task's job under the incident of a boundary event.
 */
export const jobOfMockIncident = (incident: MockIncident): MockJob | undefined => {
  if (incident.jobKey) return findJobByKey(incident.jobKey);
  return jobs.find(
    (job) =>
      PENDING_STATES.has(job.state) &&
      job.processInstanceKey === incident.processInstanceKey &&
      (incident.executionToken === `token-${job.key}` || elementInstanceKeyOf(job) === incident.elementInstanceKey)
  );
};

/**
 * The engine's refusal of retries given with a resolution for a job which no
 * longer waits, as `POST /v1/jobs/{jobKey}/retries` refuses them. Undefined
 * for a job the engine still waits on.
 */
export const jobNoLongerWaitsRefusal = (job: MockJob): string | undefined =>
  PENDING_STATES.has(job.state)
    ? undefined
    : leaderCallFailure(
        'resolve incident',
        `job no longer waits for a worker or an operator: cannot update the retries of job ${job.key} ` +
          `in state ${engineStateName(job.state)}`
      );

/** The engine's refusal of a resolution of an incident which is resolved already. */
export const incidentAlreadyResolved = (incident: MockIncident): string =>
  leaderCallFailure(
    'resolve incident',
    `incident already resolved: incident ${incident.key} was resolved at ` +
      `${(incident.resolvedAt ?? '').replace(/\.\d{3}Z$/, 'Z')}; nothing was changed`
  );

/**
 * The engine's refusal of retries given with the resolution of an incident
 * which leaves no job waiting, such as one of an expression.
 */
export const incidentWithoutJobRefusesRetries = (incident: MockIncident): string =>
  leaderCallFailure(
    'resolve incident',
    `incident ${incident.key} leaves no job waiting; retries can only be given with the resolution of the incident of a job`
  );

/**
 * Resolves an incident. The failed job which raised it becomes active again
 * with a new series of attempts: retries set since it failed, or given with
 * the resolution through updateMockJobRetries, are kept with a `retryAt` still
 * ahead, otherwise the task definition's retries apply and the job is handed
 * out at once.
 */
export const resolveMockIncident = (incident: MockIncident, job: MockJob | undefined): void => {
  const now = Date.now();
  incident.resolvedAt = new Date(now).toISOString();
  if (job?.state === 'failed') {
    job.attempts = 0;
    if (job.retriesSetByOperator) {
      job.retriesSetByOperator = false;
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
