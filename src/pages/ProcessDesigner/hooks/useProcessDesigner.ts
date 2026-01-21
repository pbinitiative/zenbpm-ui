import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { getProcessDefinition, createProcessDefinition } from '@base/openapi';
import type { BpmnEditorRef } from '@components/BpmnEditor';
import type { EditorMode, SnackbarState, ConsoleMessage, ConsoleMessageType, ConsoleMessageLink } from '../types';

interface UseProcessDesignerOptions {
  processDefinitionKey?: string;
}

interface UseProcessDesignerResult {
  editorRef: React.RefObject<BpmnEditorRef | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  loadingDefinition: boolean;
  deploying: boolean;
  initialXml: string | undefined;
  editorMode: EditorMode;
  xmlContent: string;
  snackbar: SnackbarState;
  consoleMessages: ConsoleMessage[];
  consoleOpen: boolean;
  handleModeChange: (event: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => Promise<void>;
  handleDeploy: () => Promise<void>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDownload: () => Promise<void>;
  handleOpenFile: () => void;
  closeSnackbar: () => void;
  setXmlContent: (content: string) => void;
  toggleConsole: () => void;
  clearConsole: () => void;
}

// Generate unique ID for console messages
let messageIdCounter = 0;
const generateMessageId = () => `msg-${Date.now()}-${++messageIdCounter}`;

export function useProcessDesigner({
  processDefinitionKey,
}: UseProcessDesignerOptions): UseProcessDesignerResult {
  const { t } = useTranslation([ns.common, ns.designer]);
  const editorRef = useRef<BpmnEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deploying, setDeploying] = useState(false);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [initialXml, setInitialXml] = useState<string | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<EditorMode>('diagram');
  const [xmlContent, setXmlContent] = useState<string>('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Console state
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Add message to console
  const addConsoleMessage = useCallback(
    (
      type: ConsoleMessageType,
      message: string,
      options?: { details?: string; link?: ConsoleMessageLink; autoOpenOnError?: boolean }
    ) => {
      const { details, link, autoOpenOnError = true } = options ?? {};
      const newMessage: ConsoleMessage = {
        id: generateMessageId(),
        type,
        message,
        details,
        link,
        timestamp: new Date(),
      };
      setConsoleMessages((prev) => [...prev, newMessage]);

      // Auto-open console on error
      if (autoOpenOnError && type === 'error') {
        setConsoleOpen(true);
      }
    },
    []
  );

  // Toggle console
  const toggleConsole = useCallback(() => {
    setConsoleOpen((prev) => !prev);
  }, []);

  // Clear console
  const clearConsole = useCallback(() => {
    setConsoleMessages([]);
  }, []);

  // Load process definition if key is provided
  useEffect(() => {
    if (!processDefinitionKey) return;

    const loadDefinition = async () => {
      setLoadingDefinition(true);
      try {
        const data = await getProcessDefinition(processDefinitionKey);

        let xml = data.bpmnData || '';
        if (xml && !xml.startsWith('<')) {
          // Base64 decode
          xml = new TextDecoder().decode(Uint8Array.from(atob(xml), (c) => c.charCodeAt(0)));
        }

        setInitialXml(xml);
      } catch {
        setSnackbar({
          open: true,
          message: t('designer:messages.loadDefinitionFailed'),
          severity: 'error',
        });
      } finally {
        setLoadingDefinition(false);
      }
    };

    void loadDefinition();
  }, [processDefinitionKey, t]);

  // Handle mode change
  const handleModeChange = useCallback(
    async (_: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => {
      if (!newMode) return;

      if (newMode === 'xml' && editorMode === 'diagram') {
        if (editorRef.current) {
          try {
            const xml = await editorRef.current.getXml();
            setXmlContent(xml);
          } catch {
            setSnackbar({
              open: true,
              message: t('designer:messages.xmlExportFailed'),
              severity: 'error',
            });
            return;
          }
        }
      } else if (newMode === 'diagram' && editorMode === 'xml') {
        setInitialXml(xmlContent);
      }

      setEditorMode(newMode);
    },
    [editorMode, xmlContent, t]
  );

  // Handle deploy
  const handleDeploy = useCallback(async () => {
    setDeploying(true);
    addConsoleMessage('info', 'Starting deployment...', { autoOpenOnError: false });

    try {
      let xml: string;

      if (editorMode === 'xml') {
        xml = xmlContent;
      } else if (editorRef.current) {
        xml = await editorRef.current.getXml();
      } else {
        throw new Error('Editor not ready');
      }

      if (!xml) {
        throw new Error('No XML content');
      }

      const blob = new Blob([xml], { type: 'application/xml' });
      const result = await createProcessDefinition({ resource: blob });

      // Fetch full definition details to get version info
      let definitionDetails: { version?: number; bpmnProcessId?: string } | undefined;
      if (result?.processDefinitionKey) {
        try {
          const details = await getProcessDefinition(result.processDefinitionKey);
          definitionDetails = details;
        } catch {
          // Ignore - we'll just show the key without version
        }
      }

      // Log success with details and link
      const successMessage = t('designer:messages.deploySuccess');
      const version = definitionDetails?.version;
      const processId = definitionDetails?.bpmnProcessId;
      const detailsText = [
        `Key: ${result?.processDefinitionKey || 'unknown'}`,
        version !== undefined ? `Version: ${version}` : null,
        processId ? `Process ID: ${processId}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      addConsoleMessage('success', successMessage, {
        details: detailsText,
        link: result?.processDefinitionKey
          ? {
              text: `Open v${version ?? '?'}`,
              url: `/process-definitions/${result.processDefinitionKey}`,
            }
          : undefined,
        autoOpenOnError: false,
      });

      setSnackbar({
        open: true,
        message: successMessage,
        severity: 'success',
      });
    } catch (err) {
      // Extract detailed error information
      let errorMessage = t('designer:messages.deployFailed');
      let errorDetails: string | undefined;

      if (err instanceof Error) {
        errorMessage = err.message;

        // Try to extract more details from axios error response
        const errorAny = err as unknown as Record<string, unknown>;
        if (errorAny.response && typeof errorAny.response === 'object') {
          const response = errorAny.response as Record<string, unknown>;
          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            if (data.message && typeof data.message === 'string') {
              errorMessage = data.message;
            }
            if (data.details && typeof data.details === 'string') {
              errorDetails = data.details;
            } else if (data.error && typeof data.error === 'string') {
              errorDetails = data.error;
            }
            // Include the full error response for debugging if no specific details found
            if (!errorDetails) {
              try {
                errorDetails = JSON.stringify(data, null, 2);
              } catch {
                // Ignore JSON stringify errors
              }
            }
          }
        }
      }

      // Log error to console (will auto-open)
      addConsoleMessage('error', `Deployment failed: ${errorMessage}`, { details: errorDetails });

      // Show simple snackbar - details are in console
      setSnackbar({
        open: true,
        message: t('designer:messages.deployFailedCheckConsole'),
        severity: 'error',
      });
    } finally {
      setDeploying(false);
    }
  }, [t, editorMode, xmlContent, addConsoleMessage]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const xml = await file.text();
        if (editorMode === 'xml') {
          setXmlContent(xml);
        } else if (editorRef.current) {
          await editorRef.current.importXml(xml);
        }
        setSnackbar({
          open: true,
          message: t('designer:messages.fileLoaded'),
          severity: 'success',
        });
      } catch {
        setSnackbar({
          open: true,
          message: t('designer:messages.fileLoadFailed'),
          severity: 'error',
        });
      }

      event.target.value = '';
    },
    [t, editorMode]
  );

  // Handle download
  const handleDownload = useCallback(async () => {
    try {
      let xml: string;

      if (editorMode === 'xml') {
        xml = xmlContent;
      } else if (editorRef.current) {
        xml = await editorRef.current.getXml();
      } else {
        throw new Error('Editor not ready');
      }

      if (!xml) {
        throw new Error('No XML content');
      }

      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.bpmn';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({
        open: true,
        message: t('designer:messages.downloadFailed'),
        severity: 'error',
      });
    }
  }, [t, editorMode, xmlContent]);

  // Trigger file input
  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Close snackbar
  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    editorRef,
    fileInputRef,
    loadingDefinition,
    deploying,
    initialXml,
    editorMode,
    xmlContent,
    snackbar,
    consoleMessages,
    consoleOpen,
    handleModeChange,
    handleDeploy,
    handleFileUpload,
    handleDownload,
    handleOpenFile,
    closeSnackbar,
    setXmlContent,
    toggleConsole,
    clearConsole,
  };
}
