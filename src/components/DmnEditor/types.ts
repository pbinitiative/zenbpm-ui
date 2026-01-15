export interface DmnEditorProps {
  /** Initial DMN XML to load */
  initialXml?: string;
  /** Callback when diagram changes */
  onChange?: (xml: string) => void;
  /** Height of the editor container */
  height?: number | string;
}

export interface DmnEditorRef {
  /** Get current DMN XML */
  getXml: () => Promise<string>;
  /** Load DMN XML into editor */
  importXml: (xml: string) => Promise<void>;
  /** Create new empty diagram */
  createNew: () => Promise<void>;
}

// Internal types for dmn-js
export interface DmnCanvas {
  zoom: (type: string) => void;
}

export interface DmnEventBus {
  on: (event: string, callback: () => void) => void;
}

export interface DmnViewer {
  get: <T = unknown>(name: string) => T;
}
