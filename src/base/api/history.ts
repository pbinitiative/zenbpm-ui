/**
 * History API service
 * API for process instance history
 */
import { AXIOS_INSTANCE } from '@base/openapi/axios-instance';
import type { FlowElementHistoryPage } from '@base/openapi';

export type { FlowElementHistoryPage };

export interface GetHistoryParams {
  page?: number;
  size?: number;
}

/**
 * Get history for a process instance
 */
export const getProcessInstanceHistory = async (
  processInstanceKey: number | string,
  params?: GetHistoryParams
): Promise<FlowElementHistoryPage> => {
  const response = await AXIOS_INSTANCE.get<FlowElementHistoryPage>(
    `/process-instances/${processInstanceKey}/history`,
    { params }
  );
  return response.data;
};
