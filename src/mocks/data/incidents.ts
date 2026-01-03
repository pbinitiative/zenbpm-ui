// Mock data for incidents
// Aggregated from per-process files in ./bpmn/

export type { MockIncident } from './types';
import { allIncidents } from './bpmn';

// Re-export all incidents
export const incidents = allIncidents;

// Helper to find incidents by process instance key
export const getIncidentsByProcessInstanceKey = (processInstanceKey: string) => {
  return incidents.filter((i) => i.processInstanceKey === processInstanceKey);
};

// Helper to get unresolved incidents
export const getUnresolvedIncidents = () => {
  return incidents.filter((i) => !i.resolvedAt);
};

// Helper to get resolved incidents
export const getResolvedIncidents = () => {
  return incidents.filter((i) => i.resolvedAt);
};

// Helper to find incident by key
export const findIncidentByKey = (key: string) => {
  return incidents.find((i) => i.key === key);
};
