// Types for Process Instance Detail page
// Re-export and extend OpenAPI generated types

import { themeColors } from '@base/theme';
import {
  type ProcessInstance as ApiProcessInstance,
  type ProcessInstanceState as ApiProcessInstanceState,
  type ElementInstance as ApiElementInstance,
  type ProcessDefinitionDetail as ApiProcessDefinitionDetail,
  type Job as ApiJob,
  type JobState as ApiJobState,
  type FlowElementHistory as ApiFlowElementHistory,
  type Incident as ApiIncident,
} from '@base/openapi';

// Re-export API types directly when they match our needs
export type ProcessInstance = ApiProcessInstance;
export type ProcessInstanceState = ApiProcessInstanceState;
export type ElementInstance = ApiElementInstance;

// ProcessDefinition - use the detail type which includes bpmnData
export type ProcessDefinition = ApiProcessDefinitionDetail;

// JobState - the API type may have fewer values, so we define UI-specific states
// that might come from different sources or be computed
export type JobState = ApiJobState | 'activatable' | 'activated' | 'canceled';

// Job - extend API type with UI-specific fields and override state type
export interface Job extends Omit<ApiJob, 'state'> {
  /** Job state (extended with UI-specific states) */
  state: JobState;
  /** Element name (resolved from BPMN) */
  elementName?: string;
  /** Candidate groups for user tasks */
  candidateGroups?: string[];
  /** When the job was completed */
  completedAt?: string;
  /** Error message if job failed */
  errorMessage?: string;
}

// FlowElementHistory - extend API type with additional fields
export interface FlowElementHistory extends ApiFlowElementHistory {
  /** When the element was completed */
  completedAt?: string;
  /** Element state */
  state?: string;
}

// Incident - extend API type with additional fields
export interface Incident extends ApiIncident {
  /** Process definition key */
  processDefinitionKey?: number;
  /** Error type classification */
  errorType?: string;
  /** Partition number */
  partition?: number;
}

// Variable - UI-specific type for variable display
export interface Variable {
  name: string;
  value: unknown;
  scope?: 'process' | 'local';
}

// Job state colors for UI display
export const JOB_STATE_COLORS: Record<JobState, string> = {
  activatable: themeColors.stateBadge.created,
  activated: themeColors.stateBadge.terminated,
  active: themeColors.stateBadge.active,
  completed: themeColors.stateBadge.completed,
  failed: themeColors.stateBadge.failed,
  canceled: themeColors.stateBadge.completed,
  terminated: themeColors.stateBadge.completed,
};
