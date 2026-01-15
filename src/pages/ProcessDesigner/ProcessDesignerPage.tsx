import { useParams } from 'react-router-dom';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { BpmnEditor } from '@components/BpmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { useProcessDesigner } from './hooks';
import { DesignerToolbar } from './components';

export const ProcessDesignerPage = () => {
  const { processDefinitionKey } = useParams<{ processDefinitionKey?: string }>();

  const {
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
  } = useProcessDesigner({ processDefinitionKey });

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
        accept=".bpmn,.xml"
        onChange={handleFileUpload}
        sx={{ display: 'none' }}
      />

      {/* Editor container */}
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
        {/* BPMN Editor - always mounted, hidden when in XML mode */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: editorMode === 'diagram' ? 'block' : 'none',
          }}
        >
          <BpmnEditor ref={editorRef} height="100%" initialXml={initialXml} />
        </Box>

        {/* XML Editor - shown when in XML mode */}
        {editorMode === 'xml' && <XmlEditor value={xmlContent} onChange={setXmlContent} height="100%" />}
      </Box>

      {/* Bottom toolbar */}
      <DesignerToolbar
        editorMode={editorMode}
        deploying={deploying}
        onModeChange={handleModeChange}
        onOpenFile={handleOpenFile}
        onDownload={handleDownload}
        onDeploy={handleDeploy}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
