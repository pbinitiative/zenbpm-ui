// MSW handlers for jobs endpoints
import { delay, http, HttpResponse } from 'msw';
import { jobs, findJobByKey, getJobFailuresByJobKey } from '../data/jobs';
import { parseIsoBackoff } from '@base/utils/isoDuration';
import {
  MAX_RETRIES,
  engineStateName,
  failMockJobWithoutErrorCode,
  leaderCallFailure,
  operatorRetriesRefusal,
  retryAtSchemaRefusal,
  updateMockJobRetries,
} from '../data/jobRetries';
import type { MockJob } from '../data/jobs';
import { withValidation } from '../validation';
import { hasScenario } from './scenarios';

const BASE_URL = '/v1';

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
      const page = Number.parseInt(url.searchParams.get('page') || '1', 10);
      const size = Number.parseInt(url.searchParams.get('size') || '10', 10);
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
      // Retries above jobs.maxRetries are capped, not refused.
      const retries = typeof body.retries === 'number' ? body.retries : undefined;
      if (retries !== undefined && retries < 0) {
        return HttpResponse.json(
          {
            code: 'BAD_REQUEST',
            message: 'request body has an error: doesn\'t match schema: Error at "/retries": number must be at least 0',
          },
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
            message: leaderCallFailure(
              `fail job ${String(jobKey)}`,
              `failed to fail job ${String(jobKey)}: job no longer waits for a worker or an operator: ` +
                `job ${String(jobKey)} is already ${job.state}`
            ),
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
        retries === undefined ? undefined : Math.min(retries, MAX_RETRIES),
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
      const schemaRefusal = retryAtSchemaRefusal(body.retryAt);
      if (schemaRefusal !== undefined) {
        return HttpResponse.json({ code: 'BAD_REQUEST', message: schemaRefusal }, { status: 400 });
      }

      const call = `update retries of job ${String(jobKey)}`;
      const job = findJobByKey(jobKey as string);
      if (!job) {
        return HttpResponse.json(
          { code: 'NOT_FOUND', message: leaderCallFailure(call, `job ${String(jobKey)} not found`) },
          { status: 404 }
        );
      }

      const refusal = operatorRetriesRefusal(job.key, body.retries, body.retryAt);
      if (refusal !== undefined) {
        return HttpResponse.json({ code: 'BAD_REQUEST', message: leaderCallFailure(call, refusal) }, { status: 400 });
      }
      const retries = body.retries as number;
      if (job.state !== 'active' && job.state !== 'failed') {
        return HttpResponse.json(
          {
            code: 'CONFLICT',
            message: leaderCallFailure(
              call,
              `failed to update retries of job ${String(jobKey)}: job no longer waits for a worker or an operator: ` +
                `cannot update the retries of job ${String(jobKey)} in state ${engineStateName(job.state)}`
            ),
          },
          { status: 409 }
        );
      }

      updateMockJobRetries(job, retries, typeof body.retryAt === 'string' ? body.retryAt : undefined);
      // the answer arrives late, e.g. after the operator moved on to another instance
      if (hasScenario(request, 'slowRetriesAnswer')) await delay(1500);
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // GET /jobs/:jobKey/failures - List the failures of a job, newest first
  http.get(
    `${BASE_URL}/jobs/:jobKey/failures`,
    withValidation(({ params, request }) => {
      const { jobKey } = params;
      const url = new URL(request.url);
      const page = Number.parseInt(url.searchParams.get('page') || '1', 10);
      const size = Number.parseInt(url.searchParams.get('size') || '10', 10);

      if (!findJobByKey(jobKey as string)) {
        return jobNotFound(jobKey);
      }
      if (hasScenario(request, 'failureHistoryFails')) {
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
