import { getProcessInstanceJobs } from '@base/openapi';

interface FindFocusedJobPageOptions {
  processInstanceKey: string;
  elementInstanceKey: string;
  /** Narrows the search to this job of the element instance. */
  jobKey?: string;
  pageSize: number;
  totalCount: number;
  signal?: AbortSignal;
}

/**
 * Whether a job is one the Jobs tab is focused on. An element instance has
 * several jobs where the element carries execution listeners: their jobs and
 * the element's own share it. So a focus by element instance means all of
 * them, and a focus which also names a job means that job alone.
 */
export function isFocusedJob(
  job: { key: string; elementInstanceKey: string },
  elementInstanceKey: string,
  jobKey?: string
): boolean {
  return jobKey ? job.key === jobKey : job.elementInstanceKey === elementInstanceKey;
}

/** Tells one request to focus the Jobs tab from another, for the page which resolves each only once. */
export function jobFocusRequestKey(
  processInstanceKey: string | undefined,
  elementInstanceKey: string,
  jobKey?: string
): string {
  return `${processInstanceKey}:${elementInstanceKey}:${jobKey ?? ''}`;
}

/**
 * Find the zero-based UI page containing a focused Job: the given one, or the
 * first of the element instance where no job is named.
 * Requests are intentionally sequential so the engine endpoint is not flooded.
 */
export async function findFocusedJobPage({
  processInstanceKey,
  elementInstanceKey,
  jobKey,
  pageSize,
  totalCount,
  signal,
}: FindFocusedJobPageOptions): Promise<number | undefined> {
  if (pageSize <= 0) return undefined;
  let totalPages = Math.ceil(totalCount / pageSize);

  for (let page = 1; page <= totalPages; page++) {
    const response = await getProcessInstanceJobs(
      processInstanceKey,
      { page, size: pageSize },
      undefined,
      signal
    );

    if (response.items?.some((job) => isFocusedJob(job, elementInstanceKey, jobKey))) {
      return page - 1;
    }

    if (response.totalCount !== undefined) {
      totalPages = Math.ceil(response.totalCount / pageSize);
    }
  }

  return undefined;
}
