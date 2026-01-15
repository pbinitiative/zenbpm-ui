import { useEffect, useRef, useCallback } from 'react';
import type BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import type {
  BpmnCanvas,
  BpmnElementRegistry,
  BpmnOverlays,
  BpmnElement,
  ElementStatistics,
} from '../types';

interface UseBpmnMarkersOptions {
  viewerRef: React.RefObject<BpmnViewer | null>;
  loading: boolean;
  elementStatistics?: ElementStatistics;
  history?: Array<{ elementId: string }>;
  activeElements?: Array<{ elementId: string }>;
  selectedElement?: string;
}

/**
 * Hook that manages BPMN diagram markers and overlays
 */
export function useBpmnMarkers({
  viewerRef,
  loading,
  elementStatistics,
  history = [],
  activeElements = [],
  selectedElement,
}: UseBpmnMarkersOptions): void {
  // Store props in refs to use in callbacks without re-creating them
  const elementStatisticsRef = useRef(elementStatistics);
  const historyRef = useRef(history);
  const activeElementsRef = useRef(activeElements);
  const selectedElementRef = useRef(selectedElement);

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
    const completedElementIds = new Set(historyRef.current.map((h) => h.elementId));
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
            const flowBusinessObject = flowElement.businessObject as
              | { targetRef?: { id: string } }
              | undefined;
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
  }, [viewerRef]);

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
  }, [viewerRef]);

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
  }, [viewerRef]);

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
  }, [viewerRef]);

  // Apply overlays when data changes (without re-initializing the viewer)
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    // Clear existing overlays and reapply
    const overlays = viewerRef.current.get('overlays') as BpmnOverlays;
    overlays.clear();
    applyHistory();
    applyActiveElements();
    applyElementStatistics();
  }, [elementStatistics, history, activeElements, loading, applyHistory, applyActiveElements, applyElementStatistics, viewerRef]);

  // Update selected element highlighting (without re-initializing)
  useEffect(() => {
    if (!viewerRef.current || loading) return;
    applySelectedElement();
  }, [selectedElement, loading, applySelectedElement, viewerRef]);
}
