// Mock data for process instances
// Aggregated from per-process files in ./bpmn/

export type { MockProcessInstance } from './types';
import { allInstances } from './bpmn';

// Re-export all process instances
export const processInstances = allInstances;

// Helper to find a process instance by key
export const findProcessInstanceByKey = (key: string) => {
  return processInstances.find((pi) => pi.key === key);
};

// Helper to filter instances by process definition key
export const getInstancesByProcessDefinitionKey = (processDefinitionKey: string) => {
  return processInstances.filter((pi) => pi.processDefinitionKey === processDefinitionKey);
};

// Helper to get instances by state
export const getInstancesByState = (state: 'active' | 'completed' | 'terminated' | 'failed') => {
  return processInstances.filter((pi) => pi.state === state);
};
