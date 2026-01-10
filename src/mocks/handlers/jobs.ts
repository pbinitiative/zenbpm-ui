// MSW handlers for jobs endpoints
import { http, HttpResponse } from 'msw';
import { jobs, findJobByKey } from '../data/jobs';
import type { MockJob } from '../data/jobs';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

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
        elementId: job.elementId,
        elementName: job.elementName,
        type: job.type,
        processInstanceKey: job.processInstanceKey,
        processDefinitionKey: job.processDefinitionKey,
        state: job.state,
        retries: job.retries ?? 3,
        assignee: job.assignee,
        candidateGroups: job.candidateGroups,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        variables: job.variables,
        errorMessage: job.errorMessage,
      }));

      return HttpResponse.json({
        partitions: [
          {
            partition: 1,
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
      return new HttpResponse(null, { status: 200 });
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
      return new HttpResponse(null, { status: 200 });
    })
  ),

  // POST /jobs/:jobKey/retries - Update job retries
  http.post(
    `${BASE_URL}/jobs/:jobKey/retries`,
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

      // In a real implementation, we'd update the job's retries
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 200 });
    })
  ),
];
