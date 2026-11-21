import { getProcessInstanceJobs } from '@base/openapi';

/** The most jobs the engine hands out with one request. */
const SEARCH_PAGE_SIZE = 100;

interface FindFocusedJobPagesOptions {
  processInstanceKey: string;
  /** The element instance whose jobs are looked for; none where a job is named without one. */
  elementInstanceKey?: string;
  /** Narrows the search to this job. */
  jobKey?: string;
  /**
   * The most jobs the focus can mean, where that is known: one for a named
   * job, and for an element what its model gives it. The search ends once it
   * has found that many, and looks through every job otherwise.
   */
  mostJobs?: number;
  /** How many jobs the Jobs tab shows to a page. */
  pageSize: number;
  totalCount: number;
  signal?: AbortSignal;
}

/** Where the Jobs tab shows the focused jobs. */
export interface FocusedJobPages {
  /** The zero-based pages of the Jobs tab which hold a focused job, in ascending order. */
  pages: [number, ...number[]];
  /**
   * False where the engine failed to answer after jobs were found: the jobs
   * behind that point were not looked through, and may hold more of them.
   */
  complete: boolean;
}

/**
 * Whether a job is one the Jobs tab is focused on. An element instance has
 * several jobs where the element carries execution listeners: their jobs and
 * the element's own share it. So a focus by element instance means all of
 * them, and a focus which names a job means that job alone.
 */
export function isFocusedJob(
  job: { key: string; elementInstanceKey: string },
  elementInstanceKey: string | undefined,
  jobKey?: string
): boolean {
  return jobKey ? job.key === jobKey : job.elementInstanceKey === elementInstanceKey;
}

/** Tells one request to focus the Jobs tab from another, for the page which resolves each only once. */
export function jobFocusRequestKey(
  processInstanceKey: string | undefined,
  elementInstanceKey: string | undefined,
  jobKey?: string
): string {
  return `${processInstanceKey}:${elementInstanceKey ?? ''}:${jobKey ?? ''}`;
}

/**
 * Find the pages of the Jobs tab which hold a focused job; undefined where
 * the process instance has none. The jobs of an element with execution
 * listeners can lie on several pages: the table shows one page, and its user
 * has to be told where the others are.
 *
 * The engine cannot be asked for the jobs of one element instance, so the
 * jobs of the process instance are read in its order, a hundred at a time
 * whatever the table shows to a page, and the place of a job among them tells
 * its page of the table. Requests are intentionally sequential so the engine
 * endpoint is not flooded. One which fails after jobs were found ends the
 * search with what it found.
 */
export async function findFocusedJobPages({
  processInstanceKey,
  elementInstanceKey,
  jobKey,
  mostJobs,
  pageSize,
  totalCount,
  signal,
}: FindFocusedJobPagesOptions): Promise<FocusedJobPages | undefined> {
  if (pageSize <= 0) return undefined;
  const pages: number[] = [];
  let found = 0;
  let complete = true;
  let jobsOfTheInstance = totalCount;

  for (let searchPage = 1; (searchPage - 1) * SEARCH_PAGE_SIZE < jobsOfTheInstance; searchPage++) {
    let response: Awaited<ReturnType<typeof getProcessInstanceJobs>>;
    try {
      response = await getProcessInstanceJobs(
        processInstanceKey,
        { page: searchPage, size: SEARCH_PAGE_SIZE },
        undefined,
        signal
      );
    } catch (error) {
      if (found === 0 || signal?.aborted) throw error;
      complete = false;
      break;
    }

    (response.items ?? []).forEach((job, index) => {
      if (!isFocusedJob(job, elementInstanceKey, jobKey)) return;
      found++;
      const page = Math.floor(((searchPage - 1) * SEARCH_PAGE_SIZE + index) / pageSize);
      if (pages.at(-1) !== page) pages.push(page);
    });
    if (mostJobs !== undefined && found >= mostJobs) break;

    if (response.totalCount !== undefined) jobsOfTheInstance = response.totalCount;
  }

  const [first, ...others] = pages;
  return first === undefined ? undefined : { pages: [first, ...others], complete };
}
