// Types for Process Instance Detail page

export interface ProcessInstance {
  key: number;
  processDefinitionKey: number;
  bpmnProcessId?: string;
  createdAt: string;
  state: ProcessInstanceState;
  variables: Record<string, unknown>;
  activeElementInstances: ElementInstance[];
}

export type ProcessInstanceState = 'active' | 'completed' | 'terminated' | 'failed';

export interface ElementInstance {
  elementInstanceKey: number;
  createdAt: string;
  state: string;
  elementId: string;
}

export interface ProcessDefinition {
  key: number;
  version: number;
  bpmnProcessId: string;
  bpmnData?: string;
  bpmnProcessName?: string;
  bpmnResourceName?: string;
}

export interface Job {
  key: number;
  elementId: string;
  elementName?: string;
  type: string;
  processInstanceKey: number;
  state: JobState;
  retries?: number;
  assignee?: string;
  candidateGroups?: string[];
  createdAt: string;
  completedAt?: string;
  variables: Record<string, unknown>;
  errorMessage?: string;
}

export type JobState = 'activatable' | 'activated' | 'active' | 'completed' | 'failed' | 'canceled' | 'terminated';

export interface FlowElementHistory {
  key: number;
  elementId: string;
  processInstanceKey: number;
  createdAt: string;
  completedAt?: string;
  state?: string;
}

export interface Incident {
  key: number;
  elementInstanceKey: number;
  elementId: string;
  processInstanceKey: number;
  processDefinitionKey?: number;
  bpmnProcessId?: string;
  errorType?: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
  executionToken?: number;
  partition?: number;
}

export interface Variable {
  name: string;
  value: unknown;
  scope?: 'process' | 'local';
}

import { themeColors } from '@base/theme';

// Helper type for state colors - using theme stateBadge colors
export const STATE_COLORS: Record<ProcessInstanceState, string> = {
  active: themeColors.stateBadge.active,
  completed: themeColors.stateBadge.completed,
  terminated: themeColors.stateBadge.terminated,
  failed: themeColors.stateBadge.failed,
};

export const JOB_STATE_COLORS: Record<JobState, string> = {
  activatable: themeColors.stateBadge.created,
  activated: themeColors.stateBadge.terminated,
  active: themeColors.stateBadge.active,
  completed: themeColors.stateBadge.completed,
  failed: themeColors.stateBadge.failed,
  canceled: themeColors.stateBadge.completed,
  terminated: themeColors.stateBadge.completed,
};
