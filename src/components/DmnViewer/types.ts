export interface DecisionOverlay {
  /** Decision element ID */
  decisionId: string;
  /** Whether this decision was evaluated */
  evaluated?: boolean;
  /** Whether rules were matched */
  hasMatchedRules?: boolean;
  /** Input values for this decision */
  inputs?: Array<{ name: string; value: unknown }>;
  /** Output values for this decision */
  outputs?: Array<{ name: string; value: unknown }>;
  /** Matched rule indices (0-based) */
  matchedRuleIndices?: number[];
}

export interface DmnViewerProps {
  /** DMN XML data (string or base64 encoded) */
  diagramData: string;
  /** Height of the diagram container (default: responsive based on screen size) */
  height?: number | string;
  /** Minimum height of the diagram container */
  minHeight?: number | string;
  /** Callback when a decision element is clicked */
  onElementClick?: (elementId: string) => void;
  /** Overlays to show on decision elements */
  overlays?: DecisionOverlay[];
  /** Callback when a decision data panel is clicked */
  onOverlayClick?: (decisionId: string, inputs: Array<{ name: string; value: unknown }>, outputs: Array<{ name: string; value: unknown }>) => void;
  /** Extra padding to account for overlays when zooming (default: 150 if overlays present) */
  overlayPadding?: number;
}

// Internal types for dmn-js API
export interface DmnCanvas {
  zoom: (type: string | number) => number;
  viewbox: (box?: DmnViewbox) => DmnViewboxResult;
}

export interface DmnViewbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DmnViewboxResult extends DmnViewbox {
  outer: { width: number; height: number };
}

export interface DmnElementRegistry {
  getAll: () => DmnElement[];
}

export interface DmnElement {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface DmnOverlaysApi {
  add: (elementId: string, type: string, overlay: { position: { top: number; left: number }; html: HTMLElement }) => string;
  remove: (filter: { type: string }) => void;
}

export interface DmnEventBus {
  on: (event: string, callback: (e: { element: { id: string; type: string } }) => void) => void;
}

export interface DmnActiveViewer {
  get<T = unknown>(name: string): T;
}

export interface DmnActiveView {
  type: string;
  element?: { id?: string };
}
