// bpmn-js type definitions (library has poor TypeScript support)
export interface BpmnElement {
  id: string;
  type: string;
  businessObject?: {
    outgoing?: Array<{ id: string }>;
    targetRef?: { id: string };
  };
}

export interface BpmnCanvas {
  addMarker: (elementId: string, marker: string) => void;
  removeMarker: (elementId: string, marker: string) => void;
  zoom: (type: string) => void;
}

export interface BpmnElementRegistry {
  get: (elementId: string) => BpmnElement | undefined;
  getAll: () => BpmnElement[];
}

export interface BpmnOverlays {
  add: (
    elementId: string,
    type: string,
    config: {
      position: { top?: number; right?: number; bottom?: number; left?: number };
      html: string;
    }
  ) => void;
  clear: () => void;
}

export interface BpmnEventBus {
  on: (event: string, callback: (e: { element: BpmnElement }) => void) => void;
}

// Element statistics from API - map of elementId to counts
export type ElementStatistics = Record<string, { activeCount: number; incidentCount: number }>;

export interface BpmnDiagramProps {
  /** BPMN XML data (string or base64 encoded) */
  diagramData: string;
  /** Element statistics for overlays (map of elementId to activeCount/incidentCount) */
  elementStatistics?: ElementStatistics;
  /** History elements to highlight (completed elements) */
  history?: Array<{ elementId: string }>;
  /** Active elements to highlight */
  activeElements?: Array<{ elementId: string }>;
  /** Selected element to highlight (from filter) */
  selectedElement?: string;
  /** Callback when an element is clicked */
  onElementClick?: (elementId: string) => void;
  /** Height of the diagram container (default: responsive based on screen size) */
  height?: number | string;
  /** Minimum height of the diagram container */
  minHeight?: number | string;
  /** Enable hover effects and pointer cursor for clickable elements (default: true if onElementClick is provided) */
  interactive?: boolean;
}
