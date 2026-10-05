import axios from 'axios';
import { GetIncidentsState, getIncidents } from '@base/openapi';
import type { Incident, Job } from '../types';

/** Page size used while looking up the open incident of a failed job. */
const INCIDENT_LOOKUP_PAGE_SIZE = 100;

/** Largest value of an `int32` field, such as the `retries` of the API. */
export const MAX_INT32 = 2_147_483_647;

/** Latest moment a JavaScript date can represent, in epoch milliseconds. */
const MAX_DATE_MS = 8.64e15;

export interface JobRetriesRequest {
  /** Retries the job has from now on; absent leaves the retries as they are. */
  retries?: number;
  /** When the job is handed out next; absent means at once. */
  retryAt?: string;
}

/** Setting the retries of an active job always names them. */
export type UpdateJobRetriesRequest = Required<Pick<JobRetriesRequest, 'retries'>> & Pick<JobRetriesRequest, 'retryAt'>;

/**
 * Thrown when resolving the incident of a failed job without retries of the
 * operator's own was refused because the retries of the task definition no
 * longer evaluate for it. Nothing changed; giving the job retries with the
 * resolution is the way out, as the engine then does not evaluate the
 * definition's.
 */
export class DefinitionRetriesNotEvaluableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DefinitionRetriesNotEvaluableError';
  }
}

/**
 * True when the engine refused a resolution because it conflicts with the
 * state of the incident or its job (`409`). Nothing was changed, unlike after
 * other errors, which may follow a resolution that succeeded and raised a new
 * incident. The incident is either still open, when the retries of the task
 * definition no longer evaluate for the job the resolution would hand out
 * again, or it was resolved already, by somebody else or by an earlier attempt.
 */
export function isResolutionRefused(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

/**
 * True when the engine refused a request for what it asks (`400`), such as
 * retries above `jobs.maxRetries` given with a resolution. Nothing was changed.
 */
export function isBadRequest(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 400;
}

/** A whole number from 1 to `max`, or undefined for anything else. */
export function parsePositiveInteger(value: string, max: number = Number.MAX_SAFE_INTEGER): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : undefined;
}

/**
 * The moment `delayMs` from now as an ISO timestamp, or undefined when that
 * moment lies beyond what a date can represent.
 */
export function timestampAfter(delayMs: number, now: number = Date.now()): string | undefined {
  const at = now + delayMs;
  return Number.isFinite(at) && at <= MAX_DATE_MS ? new Date(at).toISOString() : undefined;
}

/**
 * True while an active job waits out a retry backoff: the engine does not hand
 * it to a worker before `retryAt`. A job which ended during its backoff keeps
 * `retryAt`, so the state is checked as well.
 */
export function isWaitingOutBackoff(job: Pick<Job, 'state' | 'retryAt'>, now: number = Date.now()): boolean {
  if (job.state !== 'active' || !job.retryAt) return false;
  const retryAt = Date.parse(job.retryAt);
  return !Number.isNaN(retryAt) && retryAt > now;
}

/** Formats a timestamp down to the second, as backoffs are often only seconds long. */
export function formatDateTimeWithSeconds(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * The first line the engine puts in front of the reason when a request passed
 * on to the leader of a partition fails, e.g. `client call to fail job 42
 * failed`. It names the transport, not what the operator has to change.
 */
const TRANSPORT_PREFIX = /^client call to [^\n]* failed\n/;

/**
 * The message of a refused API request. The engine names the exact limit or
 * state in it (for example `jobs.maxRetries`), which a generic text would hide.
 * The line naming the transport is left out.
 */
export function apiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') {
      const message = data.message.replace(TRANSPORT_PREFIX, '');
      if (message !== '') return message;
    }
  }
  if (error instanceof Error && error.message !== '') return error.message;
  return undefined;
}

/**
 * Pages through the unresolved incidents of a process instance for the first
 * one `matches` accepts. Only when no page holds one does the first incident
 * `fallback` accepts count, wherever it was seen. The last page is the one
 * shorter than a full page or reaching `totalCount`.
 */
async function findOpenIncident(
  processInstanceKey: string,
  matches: (incident: Incident) => boolean,
  fallback: (incident: Incident) => boolean = () => false
): Promise<Incident | undefined> {
  let fallbackIncident: Incident | undefined;
  for (let page = 1; ; page++) {
    const result = await getIncidents(processInstanceKey, {
      state: GetIncidentsState.unresolved,
      page,
      size: INCIDENT_LOOKUP_PAGE_SIZE,
    });
    const items = result.items ?? [];
    const incident = items.find(matches);
    if (incident) return incident;
    fallbackIncident ??= items.find(fallback);
    if (items.length < INCIDENT_LOOKUP_PAGE_SIZE || page * INCIDENT_LOOKUP_PAGE_SIZE >= result.totalCount) {
      return fallbackIncident;
    }
  }
}

/**
 * Finds the unresolved incident a failed job raised. Incidents created by the
 * engine carry the job's key; an incident created before they did is matched
 * by its element instance instead, but only when no incident on any page
 * carries the job's key.
 */
export function findOpenIncidentOfJob(job: Job): Promise<Incident | undefined> {
  return findOpenIncident(
    job.processInstanceKey,
    (candidate) => candidate.jobKey === job.key,
    (candidate) => !candidate.jobKey && candidate.elementInstanceKey === job.elementInstanceKey
  );
}

/** True while the incident is unresolved. */
export async function isIncidentOpen(processInstanceKey: string, incidentKey: string): Promise<boolean> {
  const incident = await findOpenIncident(processInstanceKey, (candidate) => candidate.key === incidentKey);
  return incident !== undefined;
}
