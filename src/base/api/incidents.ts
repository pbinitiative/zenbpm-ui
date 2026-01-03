/**
 * Incidents API service
 * Wraps the generated API and provides additional endpoints not in the OpenAPI spec
 */
import { AXIOS_INSTANCE } from '@base/openapi/axios-instance';
import type { Incident, IncidentPage } from '@base/openapi';
import { resolveIncident as generatedResolveIncident } from '@base/openapi';

export type { Incident, IncidentPage };

export interface GetGlobalIncidentsParams {
  page?: number;
  size?: number;
  resolved?: boolean;
  bpmnProcessId?: string;
  processInstanceKey?: string;
}

export interface GlobalIncidentsResponse {
  items: Incident[];
  page: number;
  size: number;
  count: number;
  totalCount: number;
}

/**
 * Get global list of incidents (not scoped to a process instance)
 * Note: This endpoint is not in the OpenAPI spec - it's a custom endpoint
 */
export const getGlobalIncidents = async (
  params?: GetGlobalIncidentsParams
): Promise<GlobalIncidentsResponse> => {
  const response = await AXIOS_INSTANCE.get<GlobalIncidentsResponse>('/incidents', { params });
  return response.data;
};

/**
 * Get incidents for a specific process instance
 */
export const getProcessInstanceIncidents = async (
  processInstanceKey: number | string,
  params?: { page?: number; size?: number; resolved?: boolean }
): Promise<IncidentPage> => {
  const response = await AXIOS_INSTANCE.get<IncidentPage>(
    `/process-instances/${processInstanceKey}/incidents`,
    { params }
  );
  return response.data;
};

/**
 * Resolve an incident
 */
export const resolveIncident = generatedResolveIncident;
