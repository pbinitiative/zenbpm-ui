import { useEffect, useRef, useCallback, useState } from 'react';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { themeColors } from '@base/theme';

// bpmn-js type definitions (library has poor TypeScript support)
interface BpmnElement {
  id: string;
  type: string;
  businessObject?: {
    outgoing?: Array<{ id: string }>;
    targetRef?: { id: string };
  };
}

interface BpmnCanvas {
  addMarker: (elementId: string, marker: string) => void;
  removeMarker: (elementId: string, marker: string) => void;
  zoom: (type: string) => void;
}

interface BpmnElementRegistry {
  get: (elementId: string) => BpmnElement | undefined;
  getAll: () => BpmnElement[];
}

interface BpmnOverlays {
  add: (elementId: string, type: string, config: { position: { top?: number; right?: number; bottom?: number; left?: number }; html: string }) => void;
  clear: () => void;
}

interface BpmnEventBus {
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

export const BpmnDiagram = ({
  diagramData,
  elementStatistics,
  history = [],
  activeElements = [],
  selectedElement,
  onElementClick,
  height,
  minHeight = 250,
  interactive,
}: BpmnDiagramProps) => {
  // Default interactive to true if onElementClick is provided
  const isInteractive = interactive ?? !!onElementClick;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive height based on screen size
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate responsive height if not explicitly provided
  const responsiveHeight = height ?? (isMobile ? 280 : isTablet ? 350 : 450);

  // Store props in refs to avoid re-initializing the viewer when they change
  const onElementClickRef = useRef(onElementClick);
  const elementStatisticsRef = useRef(elementStatistics);
  const historyRef = useRef(history);
  const activeElementsRef = useRef(activeElements);
  const selectedElementRef = useRef(selectedElement);

  useEffect(() => {
    onElementClickRef.current = onElementClick;
  }, [onElementClick]);

  useEffect(() => {
    elementStatisticsRef.current = elementStatistics;
  }, [elementStatistics]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    activeElementsRef.current = activeElements;
  }, [activeElements]);

  useEffect(() => {
    selectedElementRef.current = selectedElement;
  }, [selectedElement]);

  // Apply history markers (completed elements and connecting sequence flows)
  const applyHistory = useCallback(() => {
    if (!viewerRef.current || !historyRef.current.length) return;
    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;
    const elementRegistry = viewerRef.current.get('elementRegistry') as BpmnElementRegistry;

    // Create a set of completed element IDs for quick lookup
    const completedElementIds = new Set(historyRef.current.map(h => h.elementId));
    const markedConnections = new Set<string>();

    historyRef.current.forEach(({ elementId }) => {
      const element = elementRegistry.get(elementId);
      if (!element) return;

      try {
        // Mark the element as completed
        canvas.addMarker(elementId, 'element-completed');

        // Mark outgoing sequence flows that lead to other completed elements
        const outgoing = element.businessObject?.outgoing || [];
        outgoing.forEach((flow) => {
          // Get the target of this flow
          const flowElement = elementRegistry.get(flow.id);
          if (flowElement && !markedConnections.has(flow.id)) {
            // Check if the target element is also completed
            const flowBusinessObject = flowElement.businessObject as { targetRef?: { id: string } } | undefined;
            const targetId = flowBusinessObject?.targetRef?.id;
            if (targetId && completedElementIds.has(targetId)) {
              canvas.addMarker(flow.id, 'connection-completed');
              markedConnections.add(flow.id);
            }
          }
        });
      } catch (err) {
        console.warn(`Failed to add marker for element ${elementId}:`, err);
      }
    });
  }, []);

  // Apply active element markers
  const applyActiveElements = useCallback(() => {
    if (!viewerRef.current || !activeElementsRef.current.length) return;
    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;
    const elementRegistry = viewerRef.current.get('elementRegistry') as BpmnElementRegistry;

    activeElementsRef.current.forEach(({ elementId }) => {
      const element = elementRegistry.get(elementId);
      if (!element) return;
      try {
        canvas.addMarker(elementId, 'element-active');
      } catch (err) {
        console.warn(`Failed to add marker for element ${elementId}:`, err);
      }
    });
  }, []);

  // Apply element statistics overlays (count badges)
  const applyElementStatistics = useCallback(() => {
    if (!viewerRef.current || !elementStatisticsRef.current) return;
    const stats = elementStatisticsRef.current;
    if (Object.keys(stats).length === 0) return;

    const overlays = viewerRef.current.get('overlays') as BpmnOverlays;
    const elementRegistry = viewerRef.current.get('elementRegistry') as BpmnElementRegistry;

    Object.entries(stats).forEach(([elementId, { activeCount, incidentCount }]) => {
      // Check if element exists in the diagram before adding overlay
      const element = elementRegistry.get(elementId);
      if (!element) {
        return;
      }

      try {
        // Both badges in top right corner
        // If both exist: incidents on left, instances on right
        // If only one: centered in top right area
        const hasIncidents = incidentCount > 0;
        const hasActive = activeCount > 0;

        // Active count badge (green) - top right, offset left if incidents also exist
        if (hasActive) {
          overlays.add(elementId, 'active-count', {
            position: { top: -8, right: hasIncidents ? 32 : 8 },
            html: `<div class="bpmn-overlay count-badge running-badge">${activeCount}</div>`,
          });
        }

        // Incident count badge (red) - top right corner (shown second/rightmost)
        if (hasIncidents) {
          overlays.add(elementId, 'incident-count', {
            position: { top: -8, right: 8 },
            html: `<div class="bpmn-overlay count-badge failed-badge">${incidentCount}</div>`,
          });
        }
      } catch (err) {
        console.warn(`Failed to add statistics overlay for element ${elementId}:`, err);
      }
    });
  }, []);

  // Apply selected element marker
  const applySelectedElement = useCallback(() => {
    if (!viewerRef.current) return;
    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;
    const elementRegistry = viewerRef.current.get('elementRegistry') as BpmnElementRegistry;

    // Remove previous selected marker from all elements
    elementRegistry.getAll().forEach((el: BpmnElement) => {
      try {
        canvas.removeMarker(el.id, 'element-selected');
      } catch {
        // Ignore errors
      }
    });

    // Add marker to selected element
    if (selectedElementRef.current) {
      const element = elementRegistry.get(selectedElementRef.current);
      if (element) {
        try {
          canvas.addMarker(selectedElementRef.current, 'element-selected');
        } catch (err) {
          console.warn(`Failed to add selected marker for element ${selectedElementRef.current}:`, err);
        }
      }
    }
  }, []);

  // Track if viewer has been initialized and if component is mounted
  const viewerInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Initialize viewer and import diagram
  useEffect(() => {
    if (!containerRef.current || !diagramData) return;

    // Capture container reference for use in async function
    const container = containerRef.current;

    // Track if this specific effect is still active (not cleaned up)
    let isEffectActive = true;
    isMountedRef.current = true;

    const initViewer = async () => {
      setLoading(true);
      setError(null);

      // Clean up existing viewer
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        viewerRef.current = null;
      }

      // Check if effect was cleaned up during cleanup
      if (!isEffectActive || !isMountedRef.current) return;

      // Create new viewer
      const viewer = new BpmnViewer({
        container,
      });

      // Store reference immediately
      viewerRef.current = viewer;

      try {
        // Decode XML inline to avoid dependency issues
        let xml = diagramData;
        if (!diagramData.startsWith('<')) {
          try {
            xml = new TextDecoder().decode(
              Uint8Array.from(atob(diagramData), (c) => c.charCodeAt(0))
            );
          } catch {
            // Use as-is if decoding fails
          }
        }

        await viewer.importXML(xml);

        // Check if effect was cleaned up during async import
        if (!isEffectActive || !isMountedRef.current || viewerRef.current !== viewer) {
          // Viewer was replaced or component unmounted, destroy this viewer
          try {
            viewer.destroy();
          } catch {
            // Ignore
          }
          return;
        }

        // Zoom to fit
        const canvas = viewer.get('canvas') as BpmnCanvas;
        canvas.zoom('fit-viewport');

        // Apply overlays
        applyHistory();
        applyActiveElements();
        applyElementStatistics();

        // Setup click handler using ref to avoid dependency
        const eventBus = viewer.get('eventBus') as BpmnEventBus;
        eventBus.on('element.click', (e: { element: BpmnElement }) => {
          if (e.element.type !== 'bpmn:Process' && onElementClickRef.current) {
            onElementClickRef.current(e.element.id);
          }
        });

        viewerInitializedRef.current = true;
        setLoading(false);
        setError(null);
      } catch (err) {
        // Only log error if this effect is still active
        if (isEffectActive && isMountedRef.current) {
          console.error('Failed to import BPMN diagram:', err);
          setError('Failed to load diagram');
          setLoading(false);
        }
      }
    };

    void initViewer();

    return () => {
      isEffectActive = false;
      isMountedRef.current = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        viewerRef.current = null;
        viewerInitializedRef.current = false;
      }
    };
  // Only re-initialize when diagramData changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramData]);

  // Update overlays when data changes (without re-initializing the viewer)
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    // Clear existing overlays and reapply
    const overlays = viewerRef.current.get('overlays') as BpmnOverlays;
    overlays.clear();
    applyHistory();
    applyActiveElements();
    applyElementStatistics();
  }, [elementStatistics, history, activeElements, loading, applyHistory, applyActiveElements, applyElementStatistics]);

  // Update selected element highlighting (without re-initializing)
  useEffect(() => {
    if (!viewerRef.current || loading) return;
    applySelectedElement();
  }, [selectedElement, loading, applySelectedElement]);

  // Re-zoom when container size changes (responsive resize)
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;

    // Small delay to let the container resize first
    const timeoutId = setTimeout(() => {
      try {
        canvas.zoom('fit-viewport');
      } catch {
        // Ignore errors if canvas is not ready
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [responsiveHeight, loading]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: responsiveHeight, minHeight }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            color: 'error.main',
          }}
        >
          {error}
        </Box>
      )}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          // Remove focus outlines
          '& *:focus': {
            outline: 'none',
          },
          '& .djs-container:focus': {
            outline: 'none',
          },
          '& .bpmn-overlay': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '12px',
            borderRadius: '50%',
          },
          '& .count-badge': {
            width: '24px',
            height: '24px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: `0 2px 4px ${themeColors.shadows.dark}`,
          },
          '& .running-badge': {
            backgroundColor: themeColors.bpmn.runningBadge,
          },
          '& .failed-badge': {
            backgroundColor: themeColors.bpmn.failedBadge,
          },
          // Highlight completed elements (green path)
          '& .element-completed .djs-visual rect, & .element-completed .djs-visual polygon, & .element-completed .djs-visual circle': {
            stroke: `${themeColors.bpmn.completedStroke} !important`,
            strokeWidth: '2px !important',
          },
          '& .element-completed .djs-visual path': {
            stroke: `${themeColors.bpmn.completedStroke} !important`,
          },
          // Highlight completed connections (sequence flows) - green path
          '& .connection-completed .djs-visual path': {
            stroke: `${themeColors.bpmn.completedStroke} !important`,
            strokeWidth: '2px !important',
          },
          // Highlight active elements - same glow effect as selected
          '& .element-active .djs-visual': {
            filter: `drop-shadow(0 0 4px ${themeColors.bpmn.selectionGlow}) drop-shadow(0 0 8px ${themeColors.bpmn.selectionGlowLight}) !important`,
          },
          // Highlight selected element (from filter) - shadow/glow effect
          '& .element-selected .djs-visual': {
            filter: `drop-shadow(0 0 4px ${themeColors.bpmn.selectionGlow}) drop-shadow(0 0 8px ${themeColors.bpmn.selectionGlowLight}) !important`,
          },
          // Interactive styles (hover effect and pointer cursor) - only when interactive
          ...(isInteractive && {
            // Hover effect for clickable elements - subtle glow with transition
            '& .djs-element:not(.djs-connection) .djs-visual': {
              transition: 'filter 170ms ease-in-out',
            },
            '& .djs-element:not(.djs-connection):not(.element-selected):hover .djs-visual': {
              filter: `drop-shadow(0 0 4px ${themeColors.bpmn.hoverGlow}) !important`,
            },
            // Pointer cursor for clickable elements
            '& .djs-element:not(.djs-connection)': {
              cursor: 'pointer !important',
            },
            '& .djs-element:not(.djs-connection) *': {
              cursor: 'pointer !important',
            },
            '& .djs-hit': {
              cursor: 'pointer !important',
            },
          }),
        }}
      />
    </Box>
  );
};
