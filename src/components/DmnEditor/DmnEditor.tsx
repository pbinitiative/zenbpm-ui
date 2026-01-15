import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import DmnModeler from 'dmn-js/lib/Modeler';
import { themeColors } from '@base/theme';
import {
  DmnPropertiesPanelModule,
  DmnPropertiesProviderModule,
} from 'dmn-js-properties-panel';

// Import DMN modeler CSS
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';

// Import properties panel CSS
import 'dmn-js-properties-panel/dist/assets/properties-panel.css';

// Default empty DMN diagram with a single decision
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
  xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
  xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
  xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"
  id="Definitions_1"
  name="DRD"
  namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Decision 1">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_1">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

export interface DmnEditorProps {
  /** Initial DMN XML to load */
  initialXml?: string;
  /** Callback when diagram changes */
  onChange?: (xml: string) => void;
  /** Height of the editor container */
  height?: number | string;
}

export interface DmnEditorRef {
  /** Get current DMN XML */
  getXml: () => Promise<string>;
  /** Load DMN XML into editor */
  importXml: (xml: string) => Promise<void>;
  /** Create new empty diagram */
  createNew: () => Promise<void>;
}

export const DmnEditor = forwardRef<DmnEditorRef, DmnEditorProps>(
  ({ initialXml, onChange, height = '100%' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const propertiesPanelRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<InstanceType<typeof DmnModeler> | null>(null);
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
        const activeViewer = modelerRef.current.getActiveViewer();
        if (activeViewer) {
          const canvas = activeViewer.get('canvas') as {
            zoom: (type: string) => void;
          };
          canvas.zoom('fit-viewport');
        }
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
      let modeler: InstanceType<typeof DmnModeler> | null = null;

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

        // Create DMN modeler with properties panel
        modeler = new DmnModeler({
          container: containerRef.current,
          drd: {
            propertiesPanel: {
              parent: propertiesPanelRef.current,
            },
            additionalModules: [
              DmnPropertiesPanelModule,
              DmnPropertiesProviderModule,
            ],
          },
          keyboard: {
            bindTo: document,
          },
        });

        modelerRef.current = modeler;

        // Setup change listener
        const setupChangeListener = () => {
          const activeViewer = modeler?.getActiveViewer();
          if (activeViewer) {
            const eventBus = activeViewer.get('eventBus') as {
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
          }
        };

        // Load initial diagram
        try {
          const xmlToLoad = initialXml || EMPTY_DIAGRAM;
          await modeler.importXML(xmlToLoad);
          initialXmlLoadedRef.current = true;

          if (!mounted) return;

          // Setup change listener after import
          setupChangeListener();

          const activeViewer = modeler.getActiveViewer();
          if (activeViewer) {
            const canvas = activeViewer.get('canvas') as {
              zoom: (type: string) => void;
            };
            canvas.zoom('fit-viewport');
          }
          setLoading(false);
        } catch (err) {
          console.error('Failed to load DMN diagram:', err);
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
          const activeViewer = modelerRef.current.getActiveViewer();
          if (activeViewer) {
            const canvas = activeViewer.get('canvas') as {
              zoom: (type: string) => void;
            };
            canvas.zoom('fit-viewport');
          }
          setLoading(false);
        } catch (err) {
          console.error('Failed to reload DMN diagram:', err);
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
              // Style view switcher tabs
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

DmnEditor.displayName = 'DmnEditor';
