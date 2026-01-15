import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { getProcessDefinition, createProcessDefinition } from '@base/openapi';
import type { BpmnEditorRef } from '@components/BpmnEditor';
import type { EditorMode, SnackbarState } from '../types';

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
  handleModeChange: (event: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => Promise<void>;
  handleDeploy: () => Promise<void>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDownload: () => Promise<void>;
  handleOpenFile: () => void;
  closeSnackbar: () => void;
  setXmlContent: (content: string) => void;
}

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

  // Load process definition if key is provided
  useEffect(() => {
    if (!processDefinitionKey) return;

    const loadDefinition = async () => {
      setLoadingDefinition(true);
      try {
        const data = await getProcessDefinition((processDefinitionKey as unknown) as number);

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
      await createProcessDefinition({ resource: blob });
      setSnackbar({
        open: true,
        message: t('designer:messages.deploySuccess'),
        severity: 'success',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('designer:messages.deployFailed');
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setDeploying(false);
    }
  }, [t, editorMode, xmlContent]);

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
    handleModeChange,
    handleDeploy,
    handleFileUpload,
    handleDownload,
    handleOpenFile,
    closeSnackbar,
    setXmlContent,
  };
}
