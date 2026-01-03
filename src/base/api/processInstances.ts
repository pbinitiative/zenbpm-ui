/**
 * Process Instances API service
 * Wraps the generated API and provides additional functionality
 */
import { AXIOS_INSTANCE } from '@base/openapi/axios-instance';
import type { ProcessInstance, ProcessInstancePage } from '@base/openapi';

export type { ProcessInstance, ProcessInstancePage };

export interface GetProcessInstancesParams {
  page?: number;
  size?: number;
  processDefinitionKey?: string;
  bpmnProcessId?: string;
  state?: string;
  search?: string;
  activityId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get list of process instances with extended filtering
 * Note: Some params may not be in the OpenAPI spec yet
 */
export const getProcessInstances = async (
  params?: GetProcessInstancesParams
): Promise<ProcessInstancePage> => {
  const response = await AXIOS_INSTANCE.get<ProcessInstancePage>('/process-instances', { params });
  return response.data;
};

/**
 * Get a single process instance by key
 */
export const getProcessInstance = async (
  processInstanceKey: number | string
): Promise<ProcessInstance> => {
  const response = await AXIOS_INSTANCE.get<ProcessInstance>(
    `/process-instances/${processInstanceKey}`
  );
  return response.data;
};

/**
 * Create a new process instance
 */
export const createProcessInstance = async (
  processDefinitionKey: number | string,
  variables?: Record<string, unknown>
): Promise<ProcessInstance> => {
  const response = await AXIOS_INSTANCE.post<ProcessInstance>('/process-instances', {
    processDefinitionKey,
    variables,
  });
  return response.data;
};
