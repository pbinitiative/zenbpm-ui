import { getProcessInstanceJobs } from '@base/openapi';

interface FindFocusedJobPagesOptions {
  processInstanceKey: string;
  elementInstanceKey: string;
  /** Narrows the search to this job of the element instance. */
  jobKey?: string;
  pageSize: number;
  totalCount: number;
  signal?: AbortSignal;
}

/** The zero-based UI pages of the Jobs tab which hold a focused job, in ascending order; never empty. */
export type FocusedJobPages = [number, ...number[]];

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
 * Find the pages of the Jobs tab which hold a focused job. A named job is on
 * one page, so the search ends there. The jobs of an element instance can lie
 * on several, so every page is looked through: the table shows one page, and
 * its user has to be told where the others are.
 * Requests are intentionally sequential so the engine endpoint is not flooded.
 */
export async function findFocusedJobPages({
  processInstanceKey,
  elementInstanceKey,
  jobKey,
  pageSize,
  totalCount,
  signal,
}: FindFocusedJobPagesOptions): Promise<FocusedJobPages | undefined> {
  if (pageSize <= 0) return undefined;
  let totalPages = Math.ceil(totalCount / pageSize);
  const pages: number[] = [];

  for (let page = 1; page <= totalPages; page++) {
    const response = await getProcessInstanceJobs(
      processInstanceKey,
      { page, size: pageSize },
      undefined,
      signal
    );

    if (response.items?.some((job) => isFocusedJob(job, elementInstanceKey, jobKey))) {
      pages.push(page - 1);
      if (jobKey) break;
    }

    if (response.totalCount !== undefined) {
      totalPages = Math.ceil(response.totalCount / pageSize);
    }
  }

  return pages.length > 0 ? (pages as FocusedJobPages) : undefined;
}
