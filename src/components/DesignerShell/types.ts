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
  autoOpenOnError?: boolean;
}
