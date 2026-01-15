import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type DmnJS from 'dmn-js/lib/NavigatedViewer';
import { themeColors } from '@base/theme';
import { DecisionDataOverlay } from '../components/DecisionDataOverlay';
import { createOverlayElement, calculatePanelHeight } from '../utils/createOverlayElement';
import type {
  DecisionOverlay,
  DmnActiveViewer,
  DmnOverlaysApi,
  DmnCanvas,
  DmnElementRegistry,
} from '../types';

interface UseDmnOverlaysOptions {
  viewerRef: React.RefObject<DmnJS | null>;
  overlays?: DecisionOverlay[];
  loading: boolean;
  currentView: string;
  overlayPadding?: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOverlayClick?: (
    decisionId: string,
    inputs: Array<{ name: string; value: unknown }>,
    outputs: Array<{ name: string; value: unknown }>
  ) => void;
}

/**
 * Hook that manages DMN overlays for decision data display
 */
export function useDmnOverlays({
  viewerRef,
  overlays: overlaysProp,
  loading,
  currentView,
  overlayPadding,
  containerRef,
  onOverlayClick,
}: UseDmnOverlaysOptions): void {
  const overlayRootsRef = useRef<Root[]>([]);

  // Store overlay click callback in ref
  const onOverlayClickRef = useRef(onOverlayClick);
  useEffect(() => {
    onOverlayClickRef.current = onOverlayClick;
  }, [onOverlayClick]);

  // Store overlays in ref
  const overlaysRef = useRef(overlaysProp);
  useEffect(() => {
    overlaysRef.current = overlaysProp;
  }, [overlaysProp]);

  // Apply overlays to decision elements and highlight matched rows
  useEffect(() => {
    if (!viewerRef.current || loading || !overlaysProp) return;

    const activeViewer = viewerRef.current.getActiveViewer() as DmnActiveViewer | null;
    if (!activeViewer) return;

    const activeView = viewerRef.current.getActiveView();

    // If we're viewing a decision table, highlight matched rows
    if (activeView?.type === 'decisionTable') {
      const decisionId = (activeView.element as { id?: string })?.id;
      const overlay = overlaysProp.find((o) => o.decisionId === decisionId);
      if (overlay?.matchedRuleIndices && overlay.matchedRuleIndices.length > 0) {
        // Apply highlighting to matched rows after a short delay for DOM to be ready
        setTimeout(() => {
          const rows = containerRef.current?.querySelectorAll('.dmn-decision-table-container tbody tr');
          if (rows) {
            rows.forEach((row, index) => {
              if (overlay.matchedRuleIndices?.includes(index)) {
                (row as HTMLElement).style.backgroundColor = themeColors.dmn.highlightBg;
                // Also style all cells in the row
                row.querySelectorAll('td').forEach((td) => {
                  (td as HTMLElement).style.backgroundColor = themeColors.dmn.highlightBg;
                });
              }
            });
          }
        }, 150);
      }
      return; // Don't add DRD overlays when viewing decision table
    }

    try {
      const overlaysApi = activeViewer.get<DmnOverlaysApi>('overlays');

      // Cleanup previous React roots
      overlayRootsRef.current.forEach((root) => root.unmount());
      overlayRootsRef.current = [];

      // Remove existing overlays
      overlaysApi.remove({ type: 'decision-data' });

      // Add overlays for evaluated decisions
      overlaysProp.forEach((overlay) => {
        if (!overlay.evaluated) return;
        if ((!overlay.inputs || overlay.inputs.length === 0) && (!overlay.outputs || overlay.outputs.length === 0)) return;

        const inputs = overlay.inputs || [];
        const outputs = overlay.outputs || [];

        // Calculate panel dimensions
        const panelWidth = 190;
        const estimatedHeight = calculatePanelHeight(inputs.length, outputs.length);

        // Initial position: top-left of DMN element (offset so panel is above-left)
        const initialOffsetX = -300; // panel to the left
        const initialOffsetY = -estimatedHeight - 110; // panel above

        // Create content container for React
        const contentContainer = document.createElement('div');

        // Render React component into content container
        const root = createRoot(contentContainer);
        root.render(<DecisionDataOverlay inputs={inputs} outputs={outputs} />);
        overlayRootsRef.current.push(root);

        // Create the overlay element with drag functionality
        const { element } = createOverlayElement({
          decisionId: overlay.decisionId,
          panelWidth,
          estimatedHeight,
          initialOffsetX,
          initialOffsetY,
          contentContainer,
          onClick: () => {
            if (onOverlayClickRef.current) {
              onOverlayClickRef.current(overlay.decisionId, overlay.inputs || [], overlay.outputs || []);
            }
          },
        });

        overlaysApi.add(overlay.decisionId, 'decision-data', {
          position: { top: initialOffsetY, left: initialOffsetX },
          html: element,
        });
      });

      // After adding overlays, zoom and center to show all elements including overlay panels
      zoomToFitWithOverlays(activeViewer, overlaysProp, overlayPadding);
    } catch {
      // Overlays API might not be available
    }

    // Cleanup on unmount
    return () => {
      overlayRootsRef.current.forEach((root) => root.unmount());
      overlayRootsRef.current = [];
    };
  }, [overlaysProp, loading, currentView, overlayPadding, viewerRef, containerRef]);
}

/**
 * Zooms and centers the canvas to show all elements including overlay panels
 */
function zoomToFitWithOverlays(
  activeViewer: DmnActiveViewer,
  overlays: DecisionOverlay[],
  overlayPadding?: number
): void {
  const hasOverlaysWithData = overlays.some(
    (o) => o.evaluated && ((o.inputs && o.inputs.length > 0) || (o.outputs && o.outputs.length > 0))
  );

  if (!hasOverlaysWithData) return;

  const canvas = activeViewer.get<DmnCanvas>('canvas');
  const elementRegistry = activeViewer.get<DmnElementRegistry>('elementRegistry');

  // Delay to ensure diagram and overlays are fully rendered
  setTimeout(() => {
    try {
      // Get bounding box of all DMN elements
      const elements = elementRegistry.getAll().filter(
        (el) => el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined
      );

      if (elements.length === 0) {
        canvas.zoom('fit-viewport');
        return;
      }

      // Calculate bounds of all DMN elements
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      elements.forEach((el) => {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + el.width);
          maxY = Math.max(maxY, el.y + el.height);
        }
      });

      // Expand bounds to include overlay panels
      const overlayLeftOffset = 320; // Panel width + gap
      const overlayTopOffset = 280; // Panel height + gap + arrow space
      const padding = overlayPadding ?? 40; // Extra padding around everything

      // Calculate the content bounds including overlays
      const contentMinX = minX - overlayLeftOffset;
      const contentMinY = minY - overlayTopOffset;
      const contentMaxX = maxX;
      const contentMaxY = maxY;

      const contentWidth = contentMaxX - contentMinX + padding * 2;
      const contentHeight = contentMaxY - contentMinY + padding * 2;

      // Get container size
      const viewbox = canvas.viewbox();
      const containerWidth = viewbox.outer.width;
      const containerHeight = viewbox.outer.height;

      // Calculate zoom to fit all content
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const newZoom = Math.min(scaleX, scaleY) * 1.2; // Zoom in slightly for better visibility

      // Calculate centered viewbox
      const viewWidth = containerWidth / newZoom;
      const viewHeight = containerHeight / newZoom;

      // Center the content in the viewbox, shifted up slightly
      const contentCenterX = (contentMinX + contentMaxX) / 2;
      const contentCenterY = (contentMinY + contentMaxY) / 2;
      const verticalShift = 30; // Shift up to show bottom of larger diagrams

      canvas.viewbox({
        x: contentCenterX - viewWidth / 2,
        y: contentCenterY - viewHeight / 2 + verticalShift,
        width: viewWidth,
        height: viewHeight,
      });
    } catch {
      // Fallback to simple fit-viewport
      canvas.zoom('fit-viewport');
    }
  }, 150);
}
