import { useEffect, useRef, useState } from 'react';
import DmnJS from 'dmn-js/lib/NavigatedViewer';
import { decodeXmlData } from '../utils/decodeXml';
import type { DmnActiveViewer, DmnEventBus, DmnCanvas } from '../types';

interface UseDmnViewerOptions {
  diagramData: string;
  onElementClick?: (elementId: string) => void;
}

interface UseDmnViewerResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewerRef: React.RefObject<DmnJS | null>;
  loading: boolean;
  error: string | null;
  currentView: string;
}

/**
 * Hook that manages the dmn-js viewer lifecycle
 */
export function useDmnViewer({
  diagramData,
  onElementClick,
}: UseDmnViewerOptions): UseDmnViewerResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<DmnJS | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('drd');

  // Store callback in ref to avoid re-initializing
  const onElementClickRef = useRef(onElementClick);
  useEffect(() => {
    onElementClickRef.current = onElementClick;
  }, [onElementClick]);

  // Initialize viewer and import diagram
  useEffect(() => {
    if (!containerRef.current || !diagramData) return;

    const initViewer = async () => {
      setLoading(true);
      setError(null);

      // Capture container reference for use in async function
      const container = containerRef.current;
      if (!container) return;

      // Clean up existing viewer
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }

      // Create new viewer
      viewerRef.current = new DmnJS({
        container,
      });

      try {
        const xml = decodeXmlData(diagramData);
        await viewerRef.current.importXML(xml);

        // Get the active view and zoom to fit
        const activeViewer = viewerRef.current.getActiveViewer() as DmnActiveViewer | null;
        if (activeViewer) {
          const canvas = activeViewer.get<DmnCanvas>('canvas');
          canvas.zoom('fit-viewport');

          // Setup click handler for DRD (Decision Requirements Diagram)
          const eventBus = activeViewer.get<DmnEventBus>('eventBus');
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
            setCurrentView((prev) => {
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

    void initViewer();

    return () => {
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

  return {
    containerRef,
    viewerRef,
    loading,
    error,
    currentView,
  };
}
