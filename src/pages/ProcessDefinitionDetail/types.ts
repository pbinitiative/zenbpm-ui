import { type ProcessDefinitionDetail } from '@base/openapi';

// Re-export the API type for use in this page
export type ProcessDefinition = ProcessDefinitionDetail;

export interface SnackbarState {
  open: boolean;
  message: string;
  key?: string;
}
