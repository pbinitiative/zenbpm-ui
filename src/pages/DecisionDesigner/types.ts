export type EditorMode = 'diagram' | 'xml';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}
