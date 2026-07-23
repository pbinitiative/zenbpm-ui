import { getProcessInstanceJobs } from '@base/openapi';

interface FindFocusedJobPageOptions {
  processInstanceKey: string;
  elementInstanceKey: string;
  pageSize: number;
  totalCount: number;
  signal?: AbortSignal;
}

/**
 * Find the zero-based UI page containing a Job correlated to an element instance.
 * Requests are intentionally sequential so the engine endpoint is not flooded.
 */
export async function findFocusedJobPage({
  processInstanceKey,
  elementInstanceKey,
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

    if (response.items?.some((job) => job.elementInstanceKey === elementInstanceKey)) {
      return page - 1;
    }

    if (response.totalCount !== undefined) {
      totalPages = Math.ceil(response.totalCount / pageSize);
    }
  }

  return undefined;
}
