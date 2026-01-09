/**
 * Process Definitions API service
 * Wraps the generated API and provides additional functionality
 */
import { AXIOS_INSTANCE } from '@base/openapi/axios-instance';
import type {
  ProcessDefinitionDetail,
  ProcessDefinitionSimple,
  ProcessDefinitionsPage,
  CreateProcessDefinitionBody
} from '@base/openapi';

import { createProcessDefinition as createProcessDefinitionApi } from '@base/openapi';

export type { ProcessDefinitionDetail, ProcessDefinitionSimple, ProcessDefinitionsPage };

// Statistics types
export interface ProcessDefinitionCounts {
  instanceCounts: {
    total: number;
    active: number;
    completed: number;
    terminated: number;
    failed: number;
  };
  incidentCounts: {
    total: number;
    unresolved: number;
  };
}

export type ProcessDefinitionStatisticsMap = Record<string, ProcessDefinitionCounts>;

export interface GetProcessDefinitionsParams {
  page?: number;
  size?: number;
  bpmnProcessId?: string;
  onlyLatest?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get list of process definitions
 */
export const getProcessDefinitions = async (
  params?: GetProcessDefinitionsParams
): Promise<ProcessDefinitionsPage> => {
  const response = await AXIOS_INSTANCE.get<ProcessDefinitionsPage>('/process-definitions', {
    params,
  });
  return response.data;
};

/**
 * Get statistics for process definitions
 * @param keys Optional array of process definition keys to get statistics for
 * @returns Map of processDefinitionKey -> statistics
 */
export const getProcessDefinitionStatisticsMap = async (
  keys?: string[]
): Promise<ProcessDefinitionStatisticsMap> => {
  const params = keys?.length ? { keys: keys.join(',') } : undefined;
  const response = await AXIOS_INSTANCE.get<ProcessDefinitionStatisticsMap>(
    '/process-definitions/statistics',
    { params }
  );
  return response.data;
};

/**
 * Get a single process definition by key
 */
export const getProcessDefinition = async (
  processDefinitionKey: number | string
): Promise<ProcessDefinitionDetail> => {
  const response = await AXIOS_INSTANCE.get<ProcessDefinitionDetail>(
    `/process-definitions/${processDefinitionKey}`
  );
  return response.data;
};

/**
 * Deploy a process definition
 */
export const createProcessDefinition = async (xml: string): Promise<ProcessDefinitionDetail> => {
  // Convert XML string to Blob
  const blob = new Blob([xml], { type: 'application/xml' });
  
  // Create request body for the generated client
  const requestBody: CreateProcessDefinitionBody = {
    resource: blob
  };

  // Call the generated client
  const response = await createProcessDefinitionApi(requestBody);
  const processDefinitionKey  = response.processDefinitionKey;
  
  const detailResponse = await getProcessDefinition(processDefinitionKey);
  return detailResponse;
};
