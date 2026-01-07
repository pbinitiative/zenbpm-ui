import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import DmnJS from 'dmn-js/lib/NavigatedViewer';
import { DecisionDataOverlay } from './components/DecisionDataOverlay';
import { themeColors } from '@base/theme';

// Import dmn-js styles
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';

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

export const DmnViewer = ({
  diagramData,
  height,
  minHeight = 250,
  onElementClick,
  overlays: overlaysProp,
  onOverlayClick,
  overlayPadding,
}: DmnViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DmnJS | null>(null);
  const overlayRootsRef = useRef<Root[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('drd');

  // Responsive height based on screen size
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate responsive height if not explicitly provided
  const responsiveHeight = height ?? (isMobile ? 280 : isTablet ? 350 : 400);

  // Store callback in ref to avoid re-initializing
  const onElementClickRef = useRef(onElementClick);
  useEffect(() => {
    onElementClickRef.current = onElementClick;
  }, [onElementClick]);

  // Store overlays in ref
  const overlaysRef = useRef(overlaysProp);
  useEffect(() => {
    overlaysRef.current = overlaysProp;
  }, [overlaysProp]);

  // Store overlay click callback in ref
  const onOverlayClickRef = useRef(onOverlayClick);
  useEffect(() => {
    onOverlayClickRef.current = onOverlayClick;
  }, [onOverlayClick]);

  // Initialize viewer and import diagram
  useEffect(() => {
    if (!containerRef.current || !diagramData) return;

    const initViewer = async () => {
      setLoading(true);
      setError(null);

      // Clean up existing viewer
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }

      // Create new viewer
      viewerRef.current = new DmnJS({
        container: containerRef.current!,
      });

      try {
        // Decode XML if base64 encoded
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

        await viewerRef.current.importXML(xml);

        // Get the active view and zoom to fit
        const activeViewer = viewerRef.current.getActiveViewer();
        if (activeViewer) {
          const canvas = activeViewer.get('canvas') as {
            zoom: (type: string) => void;
          };
          canvas.zoom('fit-viewport');

          // Setup click handler for DRD (Decision Requirements Diagram)
          const eventBus = activeViewer.get('eventBus') as {
            on: (event: string, callback: (e: { element: { id: string; type: string } }) => void) => void;
          };
          eventBus.on('element.click', (e) => {
            if (e.element.type !== 'dmn:Definitions' && onElementClickRef.current) {
              onElementClickRef.current(e.element.id);
            }
          });
        }

        // Listen for view changes (switching between DRD and decision tables)
        const views = viewerRef.current.getViews();
        if (views.length > 0) {
          // Set initial view type
          const activeView = viewerRef.current.getActiveView();
          setCurrentView(activeView?.type || 'drd');
        }

        // Poll for view changes (covers tab clicks and element clicks that switch views)
        const viewCheckInterval = setInterval(() => {
          const activeView = viewerRef.current?.getActiveView();
          if (activeView) {
            setCurrentView(prev => {
              if (prev !== activeView.type) {
                return activeView.type;
              }
              return prev;
            });
          }
        }, 200);

        // Store interval for cleanup
        (viewerRef.current as unknown as { _viewCheckInterval?: ReturnType<typeof setInterval> })._viewCheckInterval = viewCheckInterval;

        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Failed to import DMN diagram:', err);
        setError('Failed to load diagram');
        setLoading(false);
      }
    };

    initViewer();

    return () => {
      // Cleanup React roots
      overlayRootsRef.current.forEach(root => root.unmount());
      overlayRootsRef.current = [];

      if (viewerRef.current) {
        // Clear view check interval
        const interval = (viewerRef.current as unknown as { _viewCheckInterval?: ReturnType<typeof setInterval> })._viewCheckInterval;
        if (interval) {
          clearInterval(interval);
        }
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [diagramData]);

  // Re-zoom when container size changes (responsive resize)
  // Skip if overlays with data are present - they have their own zoom logic
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    // Don't auto-zoom if overlays with data are present
    const hasOverlaysWithData = overlaysProp?.some(o =>
      o.evaluated && ((o.inputs && o.inputs.length > 0) || (o.outputs && o.outputs.length > 0))
    );
    if (hasOverlaysWithData) return;

    const activeViewer = viewerRef.current.getActiveViewer();
    if (!activeViewer) return;

    const canvas = activeViewer.get('canvas') as {
      zoom: (type: string) => void;
    };

    // Small delay to let the container resize first
    const timeoutId = setTimeout(() => {
      try {
        canvas.zoom('fit-viewport');
      } catch {
        // Ignore errors if canvas is not ready
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [responsiveHeight, loading, overlaysProp]);

  // Apply overlays to decision elements and highlight matched rows
  useEffect(() => {
    if (!viewerRef.current || loading || !overlaysProp) return;

    const activeViewer = viewerRef.current.getActiveViewer();
    if (!activeViewer) return;

    const activeView = viewerRef.current.getActiveView();

    // If we're viewing a decision table, highlight matched rows
    if (activeView?.type === 'decisionTable') {
      const decisionId = (activeView.element as { id?: string })?.id;
      const overlay = overlaysProp.find(o => o.decisionId === decisionId);
      if (overlay?.matchedRuleIndices && overlay.matchedRuleIndices.length > 0) {
        // Apply highlighting to matched rows after a short delay for DOM to be ready
        setTimeout(() => {
          const rows = containerRef.current?.querySelectorAll('.dmn-decision-table-container tbody tr');
          if (rows) {
            rows.forEach((row, index) => {
              if (overlay.matchedRuleIndices?.includes(index)) {
                (row as HTMLElement).style.backgroundColor = themeColors.dmn.highlightBg;
                // Also style all cells in the row
                row.querySelectorAll('td').forEach(td => {
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
      const overlaysApi = activeViewer.get('overlays') as {
        add: (elementId: string, type: string, overlay: { position: { top: number; left: number }; html: HTMLElement }) => string;
        remove: (filter: { type: string }) => void;
      };

      // Cleanup previous React roots
      overlayRootsRef.current.forEach(root => root.unmount());
      overlayRootsRef.current = [];

      // Remove existing overlays
      overlaysApi.remove({ type: 'decision-data' });

      // Add overlays for evaluated decisions
      overlaysProp.forEach((overlay) => {
        if (!overlay.evaluated) return;
        if ((!overlay.inputs || overlay.inputs.length === 0) && (!overlay.outputs || overlay.outputs.length === 0)) return;

        const inputs = overlay.inputs || [];
        const outputs = overlay.outputs || [];

        // Calculate panel height based on content
        const inputCount = inputs.length;
        const outputCount = outputs.length;
        const lineHeight = 16; // approx height per variable line
        const headerHeight = 18; // height for INPUT/OUTPUT headers
        const padding = 16; // top + bottom padding (8px each)
        const dividerHeight = inputCount > 0 && outputCount > 0 ? 7 : 0;
        const estimatedHeight = padding +
          (inputCount > 0 ? headerHeight + Math.min(inputCount, 3) * lineHeight + (inputCount > 3 ? 14 : 0) : 0) +
          dividerHeight +
          (outputCount > 0 ? headerHeight + Math.min(outputCount, 3) * lineHeight + (outputCount > 3 ? 14 : 0) : 0);

        // Initial position: top-left of DMN element (offset so panel is above-left)
        const initialOffsetX = -300; // panel to the left
        const initialOffsetY = -estimatedHeight - 110; // panel above

        // Arrow target point (top-left corner of DMN element from panel's perspective)
        // Panel is at (initialOffsetX, initialOffsetY), DMN element top-left is at (0, 0)
        const panelWidth = 190;

        // Create DOM structure
        const dataEl = document.createElement('div');

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dmn-data-wrapper';
        wrapper.style.cssText = `position: relative; width: ${panelWidth}px;`;

        // Create main panel container
        const container = document.createElement('div');
        container.className = 'dmn-data-overlay';
        container.style.cssText = `
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 10px;
          background: linear-gradient(to bottom, ${themeColors.dmn.panelBg}, ${themeColors.dmn.panelBgGradient});
          border-radius: 8px;
          box-sizing: border-box;
          cursor: pointer;
          box-shadow: 0 3px 12px ${themeColors.shadows.medium};
          transition: box-shadow 0.15s ease;
        `;

        // Add border SVG
        const borderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        borderSvg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; border-radius: 8px; overflow: visible;';
        const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        borderRect.setAttribute('x', '1');
        borderRect.setAttribute('y', '1');
        borderRect.setAttribute('width', 'calc(100% - 2px)');
        borderRect.setAttribute('height', 'calc(100% - 2px)');
        borderRect.setAttribute('rx', '7');
        borderRect.setAttribute('ry', '7');
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', themeColors.dmn.borderStroke);
        borderRect.setAttribute('stroke-width', '2');
        borderSvg.appendChild(borderRect);
        container.appendChild(borderSvg);

        // Create content container for React
        const contentContainer = document.createElement('div');
        container.appendChild(contentContainer);

        // Render React component into content container
        const root = createRoot(contentContainer);
        root.render(<DecisionDataOverlay inputs={inputs} outputs={outputs} />);
        overlayRootsRef.current.push(root);

        wrapper.appendChild(container);

        // Create drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'dmn-drag-handle';
        dragHandle.title = 'Drag to move';
        dragHandle.style.cssText = `
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 14px;
          cursor: move;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 2px;
          opacity: 0.4;
          transition: opacity 0.15s;
          z-index: 10;
        `;
        const handleLine1 = document.createElement('div');
        handleLine1.style.cssText = `width: 12px; height: 2px; background: ${themeColors.dmn.handleBg}; border-radius: 1px;`;
        const handleLine2 = document.createElement('div');
        handleLine2.style.cssText = `width: 12px; height: 2px; background: ${themeColors.dmn.handleBg}; border-radius: 1px;`;
        dragHandle.appendChild(handleLine1);
        dragHandle.appendChild(handleLine2);
        wrapper.appendChild(dragHandle);

        // Create arrow SVG
        const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowSvg.setAttribute('class', 'dmn-arrow-svg');
        arrowSvg.style.cssText = 'position: absolute; top: 0; left: 0; width: 300px; height: 300px; overflow: visible; pointer-events: none;';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', `arrowhead-${overlay.decisionId}`);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', themeColors.dmn.borderStroke);
        marker.appendChild(polygon);
        defs.appendChild(marker);
        arrowSvg.appendChild(defs);

        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('class', 'dmn-arrow-path');
        arrowPath.setAttribute('stroke', themeColors.dmn.borderStroke);
        arrowPath.setAttribute('stroke-width', '2');
        arrowPath.setAttribute('fill', 'none');
        arrowPath.setAttribute('stroke-dasharray', '6,4');
        arrowPath.setAttribute('marker-end', `url(#arrowhead-${overlay.decisionId})`);
        arrowSvg.appendChild(arrowPath);
        wrapper.appendChild(arrowSvg);

        dataEl.appendChild(wrapper);

        // Initial transform offset
        const initialTranslateX = 23;
        const initialTranslateY = 62;
        wrapper.style.transform = `translate(${initialTranslateX}px, ${initialTranslateY}px)`;

        // Function to update arrow path
        const updateArrow = (translateX: number, translateY: number) => {
          // Panel position (including transform)
          const panelX = initialOffsetX + translateX;
          const panelY = initialOffsetY + translateY;

          // Arrow starts from bottom-right corner of panel
          const startX = panelWidth;
          const startY = (container?.offsetHeight || estimatedHeight) + 1;

          // Arrow ends exactly at DMN element top-left corner (1px before)
          const endX = -panelX - 1;
          const endY = -panelY - 1;

          // Control point for curve (slightly more curved)
          const ctrlX = startX + (endX - startX) * 0.5 + 20;
          const ctrlY = startY + (endY - startY) * 0.25;

          arrowPath?.setAttribute('d', `M ${startX} ${startY} Q ${ctrlX} ${ctrlY}, ${endX} ${endY}`);
        };

        // Initial arrow
        updateArrow(initialTranslateX, initialTranslateY);

        // Hover effects
        container?.addEventListener('mouseenter', () => {
          container.style.boxShadow = `0 5px 20px ${themeColors.shadows.dark}`;
        });
        container?.addEventListener('mouseleave', () => {
          container.style.boxShadow = `0 3px 12px ${themeColors.shadows.medium}`;
        });

        // Drag handle hover
        dragHandle?.addEventListener('mouseenter', () => {
          dragHandle.style.opacity = '1';
        });
        dragHandle?.addEventListener('mouseleave', () => {
          dragHandle.style.opacity = '0.4';
        });

        // Make draggable
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentTranslateX = initialTranslateX;
        let currentTranslateY = initialTranslateY;

        dragHandle?.addEventListener('mousedown', (e) => {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const transform = wrapper.style.transform;
          const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
          if (match) {
            currentTranslateX = parseFloat(match[1]);
            currentTranslateY = parseFloat(match[2]);
          }
          e.stopPropagation();
          e.preventDefault();
        });

        const onMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const newTranslateX = currentTranslateX + dx;
          const newTranslateY = currentTranslateY + dy;
          wrapper.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px)`;
          updateArrow(newTranslateX, newTranslateY);
        };

        const onMouseUp = () => {
          if (isDragging) {
            const transform = wrapper.style.transform;
            const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (match) {
              currentTranslateX = parseFloat(match[1]);
              currentTranslateY = parseFloat(match[2]);
            }
          }
          isDragging = false;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Click opens modal (but not when dragging)
        container?.addEventListener('click', (e) => {
          if (isDragging) return;
          e.stopPropagation();
          if (onOverlayClickRef.current) {
            onOverlayClickRef.current(
              overlay.decisionId,
              overlay.inputs || [],
              overlay.outputs || []
            );
          }
        });

        overlaysApi.add(overlay.decisionId, 'decision-data', {
          position: { top: initialOffsetY, left: initialOffsetX },
          html: dataEl,
        });
      });

      // After adding overlays, zoom and center to show all elements including overlay panels
      // Overlays are positioned at approximately -300px left and -200px top of elements
      if (overlaysProp.some(o => o.evaluated && ((o.inputs && o.inputs.length > 0) || (o.outputs && o.outputs.length > 0)))) {
        const canvas = activeViewer.get('canvas') as {
          zoom: (level?: string | number) => number;
          viewbox: (box?: { x: number; y: number; width: number; height: number }) => { x: number; y: number; width: number; height: number; outer: { width: number; height: number } };
        };
        const elementRegistry = activeViewer.get('elementRegistry') as {
          getAll: () => Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>;
        };

        // Delay to ensure diagram and overlays are fully rendered
        setTimeout(() => {
          try {
            // Get bounding box of all DMN elements
            const elements = elementRegistry.getAll().filter(el =>
              el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined
            );

            if (elements.length === 0) {
              canvas.zoom('fit-viewport');
              return;
            }

            // Calculate bounds of all DMN elements
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            elements.forEach(el => {
              if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.width);
                maxY = Math.max(maxY, el.y + el.height);
              }
            });

            // Expand bounds to include overlay panels
            // Overlays are positioned at: left: -300px, top: -estimatedHeight - 110 (roughly -250px)
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
    } catch {
      // Overlays API might not be available
    }
  }, [overlaysProp, loading, currentView, overlayPadding]);

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
          // Override some dmn-js styles to fit our design
          '& .dmn-js-parent': {
            height: '100%',
          },
          // Style the view switcher tabs (blue like Camunda Modeler)
          '& .dmn-views': {
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: themeColors.bgLight,
            borderBottom: `1px solid ${themeColors.borderDark}`,
          },
          '& .dmn-view': {
            padding: '6px 12px',
            border: `1px solid ${themeColors.borderDark}`,
            borderRadius: '4px',
            background: themeColors.bgWhite,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: themeColors.textPrimary,
            transition: 'all 0.2s ease',
            '&:hover': {
              background: themeColors.dmn.selectionBg,
              borderColor: themeColors.dmn.selectionBorder,
            },
          },
          '& .dmn-view.active': {
            background: themeColors.dmn.selectionBorder,
            borderColor: themeColors.dmn.selectionBorder,
            color: themeColors.bgWhite,
          },
          // DRD container
          '& .dmn-drd-container': {
            height: 'calc(100% - 45px)',
          },
          // Hide the DRD name/ID label in top-left corner
          '& .dmn-definitions': {
            display: 'none !important',
          },
          '& .djs-direct-editing-parent': {
            display: 'none !important',
          },
          '& .bjs-powered-by': {
            display: 'none !important',
          },
          // Decision table container
          '& .dmn-decision-table-container': {
            height: 'calc(100% - 45px)',
            overflow: 'auto',
          },
          // Remove focus outlines
          '& *:focus': {
            outline: 'none',
          },
          // Make decision elements clickable when handler is provided
          ...(onElementClick && {
            '& .djs-element:not(.djs-connection)': {
              cursor: 'pointer !important',
            },
            '& .djs-element:not(.djs-connection) *': {
              cursor: 'pointer !important',
            },
          }),
        }}
      />
    </Box>
  );
};
