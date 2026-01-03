/**
 * Jobs API service
 * Wraps the generated API and provides additional functionality
 */
import { AXIOS_INSTANCE } from '@base/openapi/axios-instance';
import type { Job, JobPage } from '@base/openapi';

export type { Job, JobPage };

export interface GetJobsParams {
  page?: number;
  size?: number;
  state?: string;
  type?: string;
}

/**
 * Get list of jobs
 */
export const getJobs = async (params?: GetJobsParams): Promise<JobPage> => {
  const response = await AXIOS_INSTANCE.get<JobPage>('/jobs', { params });
  return response.data;
};

/**
 * Get jobs for a specific process instance
 */
export const getProcessInstanceJobs = async (
  processInstanceKey: number | string,
  params?: { page?: number; size?: number }
): Promise<JobPage> => {
  const response = await AXIOS_INSTANCE.get<JobPage>(
    `/process-instances/${processInstanceKey}/jobs`,
    { params }
  );
  return response.data;
};

/**
 * Complete a job
 */
export const completeJob = async (
  jobKey: number | string,
  variables?: Record<string, unknown>
): Promise<void> => {
  await AXIOS_INSTANCE.post(`/jobs/${jobKey}/complete`, { variables });
};

/**
 * Fail a job
 */
export const failJob = async (
  jobKey: number | string,
  errorMessage?: string,
  retries?: number
): Promise<void> => {
  await AXIOS_INSTANCE.post(`/jobs/${jobKey}/fail`, { errorMessage, retries });
};

/**
 * Assign a job to a worker
 */
export const assignJob = async (jobKey: number | string, assignee: string): Promise<void> => {
  await AXIOS_INSTANCE.post(`/jobs/${jobKey}/assign`, { assignee });
};

/**
 * Update job retries
 */
export const updateJobRetries = async (jobKey: number | string, retries: number): Promise<void> => {
  await AXIOS_INSTANCE.post(`/jobs/${jobKey}/retries`, { retries });
};
