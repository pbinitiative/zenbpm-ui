export interface ProcessDefinition {
  key: number;
  version: number;
  bpmnProcessId: string;
  bpmnData?: string;
  bpmnProcessName?: string;
  bpmnResourceName?: string;
  createdAt?: string;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  key?: string;
}
