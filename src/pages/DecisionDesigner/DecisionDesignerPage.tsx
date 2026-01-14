import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Snackbar,
  Alert,
  Button,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CodeIcon from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { DmnEditor, type DmnEditorRef } from '@components/DmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { getDmnResourceDefinition, createDmnResourceDefinition } from '@base/openapi';

type EditorMode = 'diagram' | 'xml';

export const DecisionDesignerPage = () => {
  const { t } = useTranslation([ns.common, ns.designer]);
  const { decisionDefinitionKey } = useParams<{ decisionDefinitionKey?: string }>();
  const editorRef = useRef<DmnEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deploying, setDeploying] = useState(false);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [initialXml, setInitialXml] = useState<string | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<EditorMode>('diagram');
  const [xmlContent, setXmlContent] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Load decision definition if key is provided
  useEffect(() => {
    if (!decisionDefinitionKey) return;

    const loadDefinition = async () => {
      setLoadingDefinition(true);
      try {
        const data = await getDmnResourceDefinition(decisionDefinitionKey as unknown as number);

        // dmnData may be base64 encoded
        let xml = data.dmnData || '';
        if (xml && !xml.startsWith('<')) {
          // Base64 decode
          xml = new TextDecoder().decode(
            Uint8Array.from(atob(xml), (c) => c.charCodeAt(0))
          );
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

    loadDefinition();
  }, [decisionDefinitionKey, t]);

  // Handle mode change
  const handleModeChange = useCallback(async (_: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => {
    if (!newMode) return;

    if (newMode === 'xml' && editorMode === 'diagram') {
      // Switching to XML - get current XML from modeler
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
      // Switching to diagram - import XML back
      setInitialXml(xmlContent);
    }

    setEditorMode(newMode);
  }, [editorMode, xmlContent, t]);

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

      await createDmnResourceDefinition(xml);
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
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Reset input
    event.target.value = '';
  }, [t, editorMode]);

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
      a.download = 'diagram.dmn';
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

  // Show loading while fetching definition
  if (loadingDefinition) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 80px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Hidden file input */}
      <Box
        component="input"
        ref={fileInputRef}
        type="file"
        accept=".dmn,.xml"
        onChange={handleFileUpload}
        sx={{ display: 'none' }}
      />

      {/* Editor container - takes remaining space */}
      <Box
        sx={{
          flexGrow: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: '4px 4px 0 0',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          position: 'relative',
        }}
      >
        {/* DMN Editor - always mounted, hidden when in XML mode */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: editorMode === 'diagram' ? 'block' : 'none',
          }}
        >
          <DmnEditor
            ref={editorRef}
            height="100%"
            initialXml={initialXml}
          />
        </Box>

        {/* XML Editor - shown when in XML mode */}
        {editorMode === 'xml' && (
          <XmlEditor
            value={xmlContent}
            onChange={setXmlContent}
            height="100%"
          />
        )}
      </Box>

      {/* Bottom toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1.5,
          py: 0.75,
          bgcolor: 'grey.100',
          borderRadius: '0 0 4px 4px',
          border: 1,
          borderTop: 0,
          borderColor: 'divider',
        }}
      >
        {/* Left side - Mode toggle */}
        <ToggleButtonGroup
          value={editorMode}
          exclusive
          onChange={handleModeChange}
          size="small"
        >
          <ToggleButton value="diagram" sx={{ px: 1.5 }}>
            <AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('designer:modes.diagram')}
          </ToggleButton>
          <ToggleButton value="xml" sx={{ px: 1.5 }}>
            <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('designer:modes.xml')}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Right side - Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={handleOpenFile}
            size="small"
            variant="outlined"
            startIcon={<FolderOpenIcon />}
          >
            {t('designer:actions.import')}
          </Button>
          <Button
            onClick={handleDownload}
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
          >
            {t('designer:actions.download')}
          </Button>
          <Button
            onClick={handleDeploy}
            size="small"
            variant="contained"
            disabled={deploying}
            startIcon={deploying ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
          >
            {t('designer:actions.deploy')}
          </Button>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
