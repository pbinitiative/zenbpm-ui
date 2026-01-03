// Mock data for process definitions
// Aggregated from per-process files in ./bpmn/

export type { MockProcessDefinition } from './types';
import { allDefinitions } from './bpmn';

// Re-export all process definitions
export const processDefinitions = allDefinitions;

// Helper to find a process definition by key
export const findProcessDefinitionByKey = (key: string) => {
  return processDefinitions.find((pd) => pd.key === key);
};

// Get all versions of a process definition
export const getProcessDefinitionVersions = (bpmnProcessId: string) => {
  return processDefinitions
    .filter((pd) => pd.bpmnProcessId === bpmnProcessId)
    .sort((a, b) => b.version - a.version);
};
