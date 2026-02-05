export type EditorMode = 'diagram' | 'xml';

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

export interface AddConsoleMessageOptions {
  details?: string;
  link?: ConsoleMessageLink;
  preventOpenConsole?: boolean;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  link?: ConsoleMessageLink;
  severity: 'success' | 'error';
}
