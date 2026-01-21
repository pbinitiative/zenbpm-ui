export type EditorMode = 'diagram' | 'xml';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export type ConsoleMessageType = 'success' | 'error' | 'info' | 'warning';

export interface ConsoleMessageLink {
  text: string;
  url: string;
}

export interface ConsoleMessage {
  id: string;
  type: ConsoleMessageType;
  message: string;
  details?: string;
  link?: ConsoleMessageLink;
  timestamp: Date;
}
