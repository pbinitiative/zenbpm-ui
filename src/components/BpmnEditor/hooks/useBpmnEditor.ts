import { useEffect, useRef, useCallback, useState } from 'react';
import CamundaCloudModeler from 'camunda-bpmn-js/lib/camunda-cloud/Modeler';
import type { BpmnCanvas, BpmnEventBus } from '../types';
import { emptyDiagram } from '../utils.ts';

interface UseBpmnEditorOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  propertiesPanelRef: React.RefObject<HTMLDivElement | null>;
  initialXml?: string;
  onChange?: (xml: string) => void;
}

interface UseBpmnEditorResult {
  loading: boolean;
  error: string | null;
  getXml: () => Promise<string>;
  importXml: (xml: string) => Promise<void>;
  createNew: () => Promise<void>;
}

export function useBpmnEditor({
  containerRef,
  propertiesPanelRef,
  initialXml,
  onChange,
}: UseBpmnEditorOptions): UseBpmnEditorResult {
  const modelerRef = useRef<InstanceType<typeof CamundaCloudModeler> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialXmlLoadedRef = useRef(false);

  // Get current XML from modeler
  const getXml = useCallback(async (): Promise<string> => {
    if (!modelerRef.current) {
      throw new Error('Modeler not initialized');
    }
    const { xml } = await modelerRef.current.saveXML({ format: true });
    return xml || '';
  }, []);

  // Import XML into modeler
  const importXml = useCallback(async (xml: string): Promise<void> => {
    if (!modelerRef.current) {
      throw new Error('Modeler not initialized');
    }
    setLoading(true);
    setError(null);
    try {
      await modelerRef.current.importXML(xml);
      const canvas = modelerRef.current.get('canvas') as BpmnCanvas;
      canvas.zoom('fit-viewport');
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import diagram';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, []);

  // Create new empty diagram
  const createNew = useCallback(async (): Promise<void> => {
    await importXml(emptyDiagram());
  }, [importXml]);

  // Initialize modeler once on mount
  useEffect(() => {
    let mounted = true;
    let modeler: InstanceType<typeof CamundaCloudModeler> | null = null;

    const initModeler = async () => {
      if (!containerRef.current || !propertiesPanelRef.current) return;

      // Wait a frame for container to have dimensions
      await new Promise((resolve) => requestAnimationFrame(resolve));

      if (!mounted || !containerRef.current || !propertiesPanelRef.current) return;

      // Check container has dimensions
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Wait a bit more
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!mounted || !containerRef.current) return;
      }

      // Create Camunda Platform modeler with properties panel
      modeler = new CamundaCloudModeler({
        container: containerRef.current,
        propertiesPanel: {
          parent: propertiesPanelRef.current,
        },
        keyboard: {
          bindTo: document,
        },
      });

      modelerRef.current = modeler;

      // Setup change listener
      const eventBus = modeler.get('eventBus') as BpmnEventBus;
      eventBus.on('commandStack.changed', () => {
        const currentModeler = modelerRef.current;
        if (onChange && currentModeler) {
          void (async () => {
            try {
              const { xml } = await currentModeler.saveXML({ format: true });
              if (xml) {
                onChange(xml);
              }
            } catch {
              // Ignore errors during save
            }
          })();
        }
      });

      // Load initial diagram
      try {
        const xmlToLoad = initialXml || emptyDiagram();
        await modeler.importXML(xmlToLoad);
        initialXmlLoadedRef.current = true;

        if (!mounted) return;

        const canvas = modeler.get('canvas') as BpmnCanvas;
        canvas.zoom('fit-viewport');
        setLoading(false);
      } catch (err) {
        console.error('Failed to load BPMN diagram:', err);
        if (!mounted) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to load diagram';
        setError(errorMessage);
        setLoading(false);
      }
    };

    void initModeler();

    return () => {
      mounted = false;
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle initialXml changes after initial load
  useEffect(() => {
    if (!initialXmlLoadedRef.current || !modelerRef.current) return;

    // Only reload if initialXml prop changed after initial load
    const loadXml = async () => {
      if (!modelerRef.current) return;
      setLoading(true);
      try {
        const xmlToLoad = initialXml || emptyDiagram();
        await modelerRef.current.importXML(xmlToLoad);
        const canvas = modelerRef.current.get('canvas') as BpmnCanvas;
        canvas.zoom('fit-viewport');
        setLoading(false);
      } catch (err) {
        console.error('Failed to reload BPMN diagram:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load diagram';
        setError(errorMessage);
        setLoading(false);
      }
    };

    void loadXml();
  }, [initialXml]);

  return {
    loading,
    error,
    getXml,
    importXml,
    createNew,
  };
}
