import { getProcessInstanceJobs } from '@base/openapi';

interface FindFocusedJobPagesOptions {
  processInstanceKey: string;
  elementInstanceKey: string;
  /** Narrows the search to this job of the element instance. */
  jobKey?: string;
  /**
   * Whether the element instance may have several jobs, as one of an element
   * with execution listeners has. Ignored where a job is named.
   */
  mayHaveSeveralJobs: boolean;
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
 * one page, and so is the one job of an element without execution listeners:
 * the search ends at the first page which holds it. The jobs of an element
 * with listeners can lie on several pages, so every page is looked through:
 * the table shows one page, and its user has to be told where the others are.
 * Requests are intentionally sequential so the engine endpoint is not flooded.
 */
export async function findFocusedJobPages({
  processInstanceKey,
  elementInstanceKey,
  jobKey,
  mayHaveSeveralJobs,
  pageSize,
  totalCount,
  signal,
}: FindFocusedJobPagesOptions): Promise<FocusedJobPages | undefined> {
  if (pageSize <= 0) return undefined;
  let totalPages = Math.ceil(totalCount / pageSize);
  const pages: number[] = [];
  const onOnePage = jobKey !== undefined || !mayHaveSeveralJobs;

  for (let page = 1; page <= totalPages; page++) {
    const response = await getProcessInstanceJobs(
      processInstanceKey,
      { page, size: pageSize },
      undefined,
      signal
    );

    if (response.items?.some((job) => isFocusedJob(job, elementInstanceKey, jobKey))) {
      pages.push(page - 1);
      if (onOnePage) break;
    }

    if (response.totalCount !== undefined) {
      totalPages = Math.ceil(response.totalCount / pageSize);
    }
  }

  return pages.length > 0 ? (pages as FocusedJobPages) : undefined;
}
