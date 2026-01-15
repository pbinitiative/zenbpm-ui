import { useEffect, useRef, useState, useCallback } from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import type { BpmnCanvas, BpmnEventBus, BpmnElement } from '../types';

interface UseBpmnViewerOptions {
  diagramData: string;
  onElementClick?: (elementId: string) => void;
  onViewerReady?: (viewer: BpmnViewer) => void;
}

interface UseBpmnViewerResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewerRef: React.RefObject<BpmnViewer | null>;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  rezoom: () => void;
}

/**
 * Decodes XML data from base64 if needed
 */
function decodeXmlData(data: string): string {
  if (!data) return '';

  // If it already starts with '<', it's raw XML
  if (data.startsWith('<')) {
    return data;
  }

  // Try to decode as base64
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
  } catch {
    return data;
  }
}

/**
 * Hook that manages the bpmn-js viewer lifecycle
 */
export function useBpmnViewer({
  diagramData,
  onElementClick,
  onViewerReady,
}: UseBpmnViewerOptions): UseBpmnViewerResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<BpmnViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Store callbacks in refs to avoid re-initializing
  const onElementClickRef = useRef(onElementClick);
  const onViewerReadyRef = useRef(onViewerReady);

  useEffect(() => {
    onElementClickRef.current = onElementClick;
  }, [onElementClick]);

  useEffect(() => {
    onViewerReadyRef.current = onViewerReady;
  }, [onViewerReady]);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Initialize viewer and import diagram
  useEffect(() => {
    if (!containerRef.current || !diagramData) return;

    // Capture container reference for use in async function
    const container = containerRef.current;

    // Track if this specific effect is still active
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

      // Check if effect was cleaned up
      if (!isEffectActive || !isMountedRef.current) return;

      // Create new viewer
      const viewer = new BpmnViewer({
        container,
      });

      // Store reference immediately
      viewerRef.current = viewer;

      try {
        const xml = decodeXmlData(diagramData);
        await viewer.importXML(xml);

        // Check if effect was cleaned up during async import
        if (!isEffectActive || !isMountedRef.current || viewerRef.current !== viewer) {
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

        // Setup click handler
        const eventBus = viewer.get('eventBus') as BpmnEventBus;
        eventBus.on('element.click', (e: { element: BpmnElement }) => {
          if (e.element.type !== 'bpmn:Process' && onElementClickRef.current) {
            onElementClickRef.current(e.element.id);
          }
        });

        setIsInitialized(true);
        setLoading(false);
        setError(null);

        // Notify that viewer is ready
        onViewerReadyRef.current?.(viewer);
      } catch (err) {
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
        setIsInitialized(false);
      }
    };
  }, [diagramData]);

  // Re-zoom helper (exposed for responsive resize)
  const rezoom = useCallback(() => {
    if (!viewerRef.current || loading) return;

    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;
    try {
      canvas.zoom('fit-viewport');
    } catch {
      // Ignore errors if canvas is not ready
    }
  }, [loading]);

  return {
    containerRef,
    viewerRef,
    loading,
    error,
    isInitialized,
    rezoom,
  };
}
