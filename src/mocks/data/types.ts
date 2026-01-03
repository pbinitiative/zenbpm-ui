// Shared types for mock data
// Keys are stored as strings but will be serialized as JSON numbers to simulate real int64 behavior

export interface MockProcessDefinition {
  key: string;
  version: number;
  bpmnProcessId: string;
  bpmnProcessName?: string;
  bpmnResourceName?: string;
  bpmnData: string;
  createdAt: string;
}

export interface MockElementInstance {
  key: string;
  elementId: string;
  elementType: string;
  state: 'active' | 'completed' | 'terminated' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface MockProcessInstance {
  key: string;
  processDefinitionKey: string;
  bpmnProcessId: string;
  createdAt: string;
  state: 'active' | 'completed' | 'terminated' | 'failed';
  variables: Record<string, unknown>;
  activeElementInstances: Array<{
    key: string;
    elementId: string;
    elementType: string;
  }>;
  /** History of all element instances that have been executed (optional for backward compatibility) */
  history?: MockElementInstance[];
  partition: number;
}

export interface MockIncident {
  key: string;
  elementInstanceKey: string;
  elementId: string;
  processInstanceKey: string;
  processDefinitionKey: string;
  bpmnProcessId?: string;
  errorType?: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
  executionToken: string;
}

// Helper to generate dates in the past
export const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const hoursAgo = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

export const minutesAgo = (minutes: number): string => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
};

// Helper to add time offset to a date string
export const addMinutes = (dateStr: string, minutes: number): string => {
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};
