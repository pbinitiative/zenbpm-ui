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
 * Thrown when the retries of a failed job were saved but resolving its
 * incident failed: the job stays failed, and a later resolution keeps the
 * saved retries and `retryAt` instead of the task definition's.
 */
export class RetriesSavedButIncidentOpenError extends Error {
  readonly saved: JobRetriesRequest;

  constructor(message: string, saved: JobRetriesRequest, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RetriesSavedButIncidentOpenError';
    this.saved = saved;
  }
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
 * The message of a refused API request. The engine names the exact limit or
 * state in it (for example `jobs.maxRetries`), which a generic text would hide.
 */
export function apiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string' && data.message !== '') return data.message;
  }
  if (error instanceof Error && error.message !== '') return error.message;
  return undefined;
}

/**
 * Finds the unresolved incident a failed job raised. Incidents created by the
 * engine carry the job's key; an incident created before they did is matched
 * by its element instance instead.
 */
export async function findOpenIncidentOfJob(job: Job): Promise<Incident | undefined> {
  for (let page = 1; ; page++) {
    const result = await getIncidents(job.processInstanceKey, {
      state: GetIncidentsState.unresolved,
      page,
      size: INCIDENT_LOOKUP_PAGE_SIZE,
    });
    const items = result.items ?? [];
    const incident =
      items.find((candidate) => candidate.jobKey === job.key) ??
      items.find((candidate) => !candidate.jobKey && candidate.elementInstanceKey === job.elementInstanceKey);
    if (incident) return incident;
    if (items.length < INCIDENT_LOOKUP_PAGE_SIZE || page * INCIDENT_LOOKUP_PAGE_SIZE >= (result.totalCount ?? 0)) {
      return undefined;
    }
  }
}
