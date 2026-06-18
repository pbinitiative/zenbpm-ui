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
  activeSubscriptions?: Array<{ elementId: string }>;
  selectedElement?: string;
  showProgress?: boolean;
}

/** Returns true when the element is a multi-instance activity */
function isMultiInstance(element: BpmnElement): boolean {
  return element.businessObject?.loopCharacteristics?.$type === 'bpmn:MultiInstanceLoopCharacteristics';
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
  activeSubscriptions = [],
  selectedElement,
  showProgress = true,
}: UseBpmnMarkersOptions): void {
  // Store props in refs to use in callbacks without re-creating them
  const elementStatisticsRef = useRef(elementStatistics);
  const historyRef = useRef(history);
  const activeElementsRef = useRef(activeElements);
  const activeSubscriptionsRef = useRef(activeSubscriptions);
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
    activeSubscriptionsRef.current = activeSubscriptions;
  }, [activeSubscriptions]);

  useEffect(() => {
    selectedElementRef.current = selectedElement;
  }, [selectedElement]);

  // Apply history markers (completed elements and sequence flows)
  const applyHistory = useCallback(() => {
    if (!viewerRef.current || !historyRef.current.length) return;
    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;
    const elementRegistry = viewerRef.current.get('elementRegistry') as BpmnElementRegistry;

    historyRef.current.forEach(({ elementId }) => {
      const element = elementRegistry.get(elementId);
      if (!element) return;

      try {
        if (element.waypoints) {
          // Sequence flow — mark with connection style
          canvas.addMarker(elementId, 'connection-completed');
        } else {
          // Flow node (task, event, gateway) — mark with element style
          canvas.addMarker(elementId, 'element-completed');
        }
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

    Object.entries(stats).forEach(([elementId, { activeCount, incidentCount, completedCount, terminatedCount }]) => {
      // Check if element exists in the diagram before adding overlay
      const element = elementRegistry.get(elementId);
      if (!element) {
        return;
      }

      try {
        const hasIncidents = incidentCount > 0;
        const doneCount = (completedCount ?? 0) + (terminatedCount ?? 0);
        const total = activeCount + doneCount;
        // Show progress (done/total) only when enabled AND the element is multi-instance
        const hasProgress = showProgress && total > 1 && isMultiInstance(element);
        const hasActive = activeCount > 0;

        if (hasActive || hasProgress) {
          // When progress is enabled on a multi-instance element, show "done/total" (e.g. "2/3")
          const label = hasProgress ? `${doneCount}/${total}` : `${activeCount}`;
          overlays.add(elementId, 'active-count', {
            position: { bottom: 12, right: 8 },
            html: `<div class="bpmn-overlay count-badge running-badge" style="width:auto;min-width:24px;padding:0 4px;">${label}</div>`,
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
  }, [viewerRef, showProgress]);

  // Apply subscription badges for elements that have active subscriptions but no active token
  const applySubscriptionBadges = useCallback(() => {
    if (!viewerRef.current || !activeSubscriptionsRef.current?.length) return;

    const overlays = viewerRef.current.get('overlays') as BpmnOverlays;
    const elementRegistry = viewerRef.current.get('elementRegistry') as BpmnElementRegistry;
    const stats = elementStatisticsRef.current;

    // Count subscriptions per elementId
    const countByElement = (activeSubscriptionsRef.current ?? []).reduce<Record<string, number>>(
      (acc, { elementId }) => {
        acc[elementId] = (acc[elementId] ?? 0) + 1;
        return acc;
      },
      {}
    );

    Object.entries(countByElement).forEach(([elementId, count]) => {
      // Skip elements that already have an active token — the running-badge covers them
      if (stats && (stats[elementId]?.activeCount ?? 0) > 0) return;

      const element = elementRegistry.get(elementId);
      if (!element) return;

      try {
        overlays.add(elementId, 'subscription-count', {
          position: { bottom: 12, right: 8 },
          html: `<div class="bpmn-overlay count-badge subscription-badge">${count}</div>`,
        });
      } catch (err) {
        console.warn(`Failed to add subscription badge for element ${elementId}:`, err);
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

    // Add marker to selected element and scroll it into view
    if (selectedElementRef.current) {
      const element = elementRegistry.get(selectedElementRef.current);
      if (element) {
        try {
          canvas.addMarker(selectedElementRef.current, 'element-selected');
          canvas.scrollToElement(selectedElementRef.current);
        } catch (err) {
          console.warn(`Failed to add selected marker for element ${selectedElementRef.current}:`, err);
        }
      }
    }
  }, [viewerRef]);

  // Apply overlays when data changes (without re-initializing the viewer)
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    // Remove only the overlays managed by this hook (badges),
    // keeping drilldown overlays from the built-in subprocess
    // navigation intact.
    const overlays = viewerRef.current.get('overlays') as BpmnOverlays;
    overlays.remove({ type: 'active-count' });
    overlays.remove({ type: 'incident-count' });
    overlays.remove({ type: 'subscription-count' });
    applyHistory();
    applyActiveElements();
    applyElementStatistics();
    applySubscriptionBadges();
  }, [elementStatistics, history, activeElements, activeSubscriptions, loading, applyHistory, applyActiveElements, applyElementStatistics, applySubscriptionBadges, viewerRef]);

  // Update selected element highlighting (without re-initializing)
  useEffect(() => {
    if (!viewerRef.current || loading) return;
    applySelectedElement();
  }, [selectedElement, loading, applySelectedElement, viewerRef]);
}
