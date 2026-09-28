// MSW handlers for jobs endpoints
import { http, HttpResponse } from 'msw';
import { jobs, findJobByKey, getJobFailuresByJobKey } from '../data/jobs';
import { parseIsoBackoff } from '@base/utils/isoDuration';
import { failMockJobWithoutErrorCode, updateMockJobRetries } from '../data/jobRetries';
import type { MockJob } from '../data/jobs';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// Engine defaults of jobs.maxRetries and jobs.maxRetryBackoff
const MAX_RETRIES = 100;
const MAX_RETRY_BACKOFF_MS = 24 * 60 * 60 * 1000;

// E2E tests name a scenario in the page URL, e.g. `?jobRetriesScenario=failureHistoryFails`.
const getScenario = (request: Request): string | null => {
  if (import.meta.env.VITE_E2E_TEST !== 'true' || !request.referrer) {
    return null;
  }

  return new URL(request.referrer).searchParams.get('jobRetriesScenario');
};

// Legacy fixtures use the UI-only waiting states next to the engine's `active`.
const WAITING_STATES = new Set(['active', 'activatable', 'activated']);

const jobNotFound = (jobKey: unknown) =>
  HttpResponse.json(
    {
      code: 'NOT_FOUND',
      message: `Job with key ${String(jobKey)} not found`,
    },
    { status: 404 }
  );

export const jobHandlers = [
  // GET /jobs - List jobs
  http.get(
    `${BASE_URL}/jobs`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const jobType = url.searchParams.get('jobType');
      const state = url.searchParams.get('state') as MockJob['state'] | null;

      let filteredJobs = [...jobs];

      // Filter by job type if provided
      if (jobType) {
        filteredJobs = filteredJobs.filter((j) => j.type === jobType);
      }

      // Filter by state if provided
      if (state) {
        filteredJobs = filteredJobs.filter((j) => j.state === state);
      }

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = filteredJobs.slice(startIndex, endIndex);

      // Format as partitioned response (single partition for mock)
      const items = paginatedItems.map((job) => ({
        key: job.key,
        elementInstanceKey: job.elementInstanceKey ?? job.key,
        elementId: job.elementId,
        elementName: job.elementName,
        type: job.type,
        elementType: job.elementType,
        processInstanceKey: job.processInstanceKey,
        processDefinitionKey: job.processDefinitionKey,
        state: job.state,
        retries: job.retries ?? 3,
        attempts: job.attempts ?? 0,
        retryAt: job.retryAt,
        lastFailureMessage: job.lastFailureMessage,
        retryBackoff: job.retryBackoff,
        assignee: job.assignee,
        candidateGroups: job.candidateGroups,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        inputVariables: job.inputVariables,
      }));

      return HttpResponse.json({
        partitions: [
          {
            partition: 1,
            totalCount: filteredJobs.length,
            items,
          },
        ],
        page,
        size,
        count: items.length,
        totalCount: filteredJobs.length,
      });
    })
  ),

  // POST /jobs/:jobKey/complete - Complete a job
  http.post(
    `${BASE_URL}/jobs/:jobKey/complete`,
    withValidation(async ({ params, request }) => {
      const { jobKey } = params;
      await request.json(); // Consume body

      const job = findJobByKey(jobKey as string);

      if (!job) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Job with key ${jobKey} not found`,
          },
          { status: 404 }
        );
      }

      // In a real implementation, we'd update the job state
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 201 });
    })
  ),

  // POST /jobs/:jobKey/assign - Assign a job to a user
  http.post(
    `${BASE_URL}/jobs/:jobKey/assign`,
    withValidation(async ({ params, request }) => {
      const { jobKey } = params;
      await request.json(); // Consume body

      const job = findJobByKey(jobKey as string);

      if (!job) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Job with key ${jobKey} not found`,
          },
          { status: 404 }
        );
      }

      // In a real implementation, we'd update the job's assignee
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // POST /jobs/:jobKey/fail - Fail a job
  http.post(
    `${BASE_URL}/jobs/:jobKey/fail`,
    withValidation(async ({ params, request }) => {
      const { jobKey } = params;
      const body = (await request.json()) as {
        errorCode?: unknown;
        message?: unknown;
        retries?: unknown;
        retryBackoff?: unknown;
        variables?: unknown;
      };

      const job = findJobByKey(jobKey as string);

      if (!job) {
        return jobNotFound(jobKey);
      }

      // Like the engine, the retry fields are validated whatever the error code.
      const retries = typeof body.retries === 'number' ? body.retries : undefined;
      if (retries !== undefined && retries < 0) {
        return HttpResponse.json(
          { code: 'BAD_REQUEST', message: `retries must not be negative, got ${retries}` },
          { status: 400 }
        );
      }
      let retryBackoffMs: number | undefined;
      if (typeof body.retryBackoff === 'string') {
        retryBackoffMs = parseIsoBackoff(body.retryBackoff);
        if (retryBackoffMs === undefined) {
          return HttpResponse.json(
            { code: 'BAD_REQUEST', message: `retryBackoff: invalid ISO-8601 duration ${body.retryBackoff}` },
            { status: 400 }
          );
        }
      }
      if (!WAITING_STATES.has(job.state)) {
        return HttpResponse.json(
          {
            code: 'CONFLICT',
            message: `job ${String(jobKey)} no longer waits for a worker or an operator`,
          },
          { status: 409 }
        );
      }

      // A BPMN error is caught by an error event or fails the job with an
      // incident, depending on the model, which the mocks do not evaluate.
      if (typeof body.errorCode === 'string' && body.errorCode !== '') {
        return new HttpResponse(null, { status: 204 });
      }

      failMockJobWithoutErrorCode(
        job,
        typeof body.message === 'string' ? body.message : '',
        typeof body.variables === 'object' && body.variables !== null
          ? (body.variables as Record<string, unknown>)
          : undefined,
        retries,
        retryBackoffMs
      );
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // POST /jobs/:jobKey/retries - Set the remaining retries of an active or failed job
  http.post(
    `${BASE_URL}/jobs/:jobKey/retries`,
    withValidation(async ({ params, request }) => {
      const { jobKey } = params;
      const body = (await request.json()) as { retries?: unknown; retryAt?: unknown };

      const job = findJobByKey(jobKey as string);
      if (!job) {
        return jobNotFound(jobKey);
      }

      const retries = body.retries;
      if (typeof retries !== 'number' || !Number.isInteger(retries) || retries < 1 || retries > MAX_RETRIES) {
        return HttpResponse.json(
          {
            code: 'BAD_REQUEST',
            message: `retries of job ${String(jobKey)} must be between 1 and ${MAX_RETRIES} (jobs.maxRetries), got ${String(retries)}`,
          },
          { status: 400 }
        );
      }
      if (typeof body.retryAt === 'string' && Date.parse(body.retryAt) > Date.now() + MAX_RETRY_BACKOFF_MS) {
        return HttpResponse.json(
          {
            code: 'BAD_REQUEST',
            message: `retryAt of job ${String(jobKey)} must not be later than 24h0m0s from now (jobs.maxRetryBackoff), got ${body.retryAt}`,
          },
          { status: 400 }
        );
      }
      if (job.state !== 'active' && job.state !== 'failed') {
        return HttpResponse.json(
          {
            code: 'CONFLICT',
            message: `cannot update the retries of job ${String(jobKey)} in state ${job.state}`,
          },
          { status: 409 }
        );
      }

      updateMockJobRetries(job, retries, typeof body.retryAt === 'string' ? body.retryAt : undefined);
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // GET /jobs/:jobKey/failures - List the failures of a job, newest first
  http.get(
    `${BASE_URL}/jobs/:jobKey/failures`,
    withValidation(({ params, request }) => {
      const { jobKey } = params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);

      if (!findJobByKey(jobKey as string)) {
        return jobNotFound(jobKey);
      }
      if (getScenario(request) === 'failureHistoryFails') {
        return HttpResponse.json(
          { code: 'INTERNAL', message: 'failed to read the failures of the job' },
          { status: 500 }
        );
      }

      const failures = getJobFailuresByJobKey(jobKey as string);
      const items = failures.slice((page - 1) * size, page * size);

      return HttpResponse.json({
        items,
        page,
        size,
        count: items.length,
        totalCount: failures.length,
      });
    })
  ),
];
