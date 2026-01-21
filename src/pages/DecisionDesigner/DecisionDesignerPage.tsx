import { useParams } from 'react-router-dom';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { DmnEditor } from '@components/DmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { useDecisionDesigner } from './hooks';
import { DesignerToolbar, ConsolePanel } from './components';

export const DecisionDesignerPage = () => {
  const { decisionDefinitionKey } = useParams<{ decisionDefinitionKey?: string }>();

  const {
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
  } = useDecisionDesigner({ decisionDefinitionKey });

  if (loadingDefinition) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 80px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }} data-testid="decision-designer-page">
      {/* Hidden file input */}
      <Box
        component="input"
        ref={fileInputRef}
        type="file"
        accept=".dmn,.xml"
        onChange={handleFileUpload}
        sx={{ display: 'none' }}
        data-testid="decision-designer-file-input"
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
        data-testid="decision-designer-editor-container"
      >
        {/* DMN Editor - always mounted, hidden when in XML mode */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: editorMode === 'diagram' ? 'block' : 'none',
          }}
        >
          <DmnEditor ref={editorRef} height="100%" initialXml={initialXml} />
        </Box>

        {/* XML Editor - shown when in XML mode */}
        {editorMode === 'xml' && <XmlEditor value={xmlContent} onChange={setXmlContent} height="100%" />}

        {/* Console Panel */}
        <ConsolePanel messages={consoleMessages} open={consoleOpen} onClear={clearConsole} onClose={toggleConsole} />
      </Box>

      {/* Bottom toolbar */}
      <DesignerToolbar
        editorMode={editorMode}
        deploying={deploying}
        consoleOpen={consoleOpen}
        consoleMessageCount={consoleMessages.length}
        onModeChange={handleModeChange}
        onOpenFile={handleOpenFile}
        onDownload={handleDownload}
        onDeploy={handleDeploy}
        onToggleConsole={toggleConsole}
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
