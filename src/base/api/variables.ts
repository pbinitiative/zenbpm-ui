/**
 * Variables API service
 * API for managing process instance variables
 */
import { AXIOS_INSTANCE } from '@base/openapi/axios-instance';

/**
 * Update variables for a process instance
 */
export const updateProcessInstanceVariables = async (
  processInstanceKey: number | string,
  variables: Record<string, unknown>
): Promise<void> => {
  await AXIOS_INSTANCE.put(`/process-instances/${processInstanceKey}/variables`, { variables });
};

/**
 * Delete a variable from a process instance
 */
export const deleteProcessInstanceVariable = async (
  processInstanceKey: number | string,
  variableName: string
): Promise<void> => {
  await AXIOS_INSTANCE.delete(
    `/process-instances/${processInstanceKey}/variables/${variableName}`
  );
};
