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

// Helper type for state colors
export const STATE_COLORS: Record<ProcessInstanceState, string> = {
  active: '#26A69A',
  completed: '#66BB6A',
  terminated: '#EF5350',
  failed: '#EF5350',
};

export const JOB_STATE_COLORS: Record<JobState, string> = {
  activatable: '#42A5F5',
  activated: '#FFA726',
  active: '#26A69A',
  completed: '#66BB6A',
  failed: '#EF5350',
  canceled: '#9E9E9E',
  terminated: '#9E9E9E',
};
