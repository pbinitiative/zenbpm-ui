export interface BpmnEditorProps {
  /** Initial BPMN XML to load */
  initialXml?: string;
  /** Callback when diagram changes */
  onChange?: (xml: string) => void;
  /** Height of the editor container */
  height?: number | string;
}

export interface BpmnEditorRef {
  /** Get current BPMN XML */
  getXml: () => Promise<string>;
  /** Load BPMN XML into editor */
  importXml: (xml: string) => Promise<void>;
  /** Create new empty diagram */
  createNew: () => Promise<void>;
  /** Update the ZEN_FORM zeebe:Property on a user task element */
  updateZenFormProperty: (elementId: string, value: string) => void;
}

// Internal types for bpmn-js
export interface BpmnCanvas {
  zoom: (type: string) => void;
}

export interface BpmnEventBus {
  on: (event: string, callback: () => void) => void;
}
