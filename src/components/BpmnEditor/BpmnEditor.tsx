import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import CamundaPlatformModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';

// Import Camunda Platform modeler CSS (includes all required styles)
import 'camunda-bpmn-js/dist/assets/camunda-platform-modeler.css';

// Default empty BPMN diagram with Camunda extensions
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="Camunda Modeler"
  exporterVersion="5.0.0">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export interface BpmnEditorProps {
  /** Initial BPMN XML to load */
  initialXml?: string;
  /** Callback when diagram changes */
  onChange?: (xml: string) => void;
  /** Height of the editor container */
  height?: number | string;
}

export interface BpmnEditorRef {
  /** Get current BPMN XML */
  getXml: () => Promise<string>;
  /** Load BPMN XML into editor */
  importXml: (xml: string) => Promise<void>;
  /** Create new empty diagram */
  createNew: () => Promise<void>;
}

export const BpmnEditor = forwardRef<BpmnEditorRef, BpmnEditorProps>(
  ({ initialXml, onChange, height = '100%' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const propertiesPanelRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<InstanceType<typeof CamundaPlatformModeler> | null>(null);
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
        const canvas = modelerRef.current.get('canvas') as {
          zoom: (type: string) => void;
        };
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
      await importXml(EMPTY_DIAGRAM);
    }, [importXml]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getXml,
      importXml,
      createNew,
    }), [getXml, importXml, createNew]);

    // Initialize modeler once on mount
    useEffect(() => {
      let mounted = true;
      let modeler: InstanceType<typeof CamundaPlatformModeler> | null = null;

      const initModeler = async () => {
        if (!containerRef.current || !propertiesPanelRef.current) return;

        // Wait a frame for container to have dimensions
        await new Promise(resolve => requestAnimationFrame(resolve));

        if (!mounted || !containerRef.current || !propertiesPanelRef.current) return;

        // Check container has dimensions
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          // Wait a bit more
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!mounted || !containerRef.current) return;
        }

        // Create Camunda Platform modeler with properties panel
        modeler = new CamundaPlatformModeler({
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
        const eventBus = modeler.get('eventBus') as {
          on: (event: string, callback: () => void) => void;
        };
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
          const xmlToLoad = initialXml || EMPTY_DIAGRAM;
          await modeler.importXML(xmlToLoad);
          initialXmlLoadedRef.current = true;

          if (!mounted) return;

          const canvas = modeler.get('canvas') as {
            zoom: (type: string) => void;
          };
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
          const xmlToLoad = initialXml || EMPTY_DIAGRAM;
          await modelerRef.current.importXML(xmlToLoad);
          const canvas = modelerRef.current.get('canvas') as {
            zoom: (type: string) => void;
          };
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

    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height,
          minHeight: 400,
          display: 'flex',
        }}
      >
        {/* Canvas container */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
          }}
        >
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
                zIndex: 1,
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
              '& .djs-palette': {
                left: 10,
                top: 10,
              },
              '& .bjs-powered-by': {
                display: 'none',
              },
            }}
          />
        </Box>

        {/* Properties Panel */}
        <Box
          ref={propertiesPanelRef}
          sx={{
            width: 320,
            height: '100%',
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflowY: 'auto',
            flexShrink: 0,
            // Properties panel styling
            '& .bio-properties-panel': {
              height: '100%',
              '--properties-panel-width': '320px',
            },
          }}
        />
      </Box>
    );
  }
);

BpmnEditor.displayName = 'BpmnEditor';
