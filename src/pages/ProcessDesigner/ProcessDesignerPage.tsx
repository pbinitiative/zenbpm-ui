import { useParams } from 'react-router-dom';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { BpmnEditor } from '@components/BpmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { DesignerShell } from '@components/DesignerShell';
import { useProcessDesigner } from './hooks';

export const ProcessDesignerPage = () => {
  const { processDefinitionKey } = useParams<{ processDefinitionKey?: string }>();

  const {
    editorRef,
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
    closeSnackbar,
    setXmlContent,
    toggleConsole,
    clearConsole,
    hasUnsavedChanges,
  } = useProcessDesigner({ processDefinitionKey });

  return (
    <DesignerShell
      loading={loadingDefinition}
      editorMode={editorMode}
      deploying={deploying}
      consoleMessages={consoleMessages}
      consoleOpen={consoleOpen}
      snackbar={snackbar}
      fileAccept=".bpmn,.xml"
      diagramModeIcon={<AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />}
      testIdPrefix="process-designer"
      onModeChange={handleModeChange}
      onFileUpload={handleFileUpload}
      onDownload={handleDownload}
      onDeploy={handleDeploy}
      onToggleConsole={toggleConsole}
      onClearConsole={clearConsole}
      onCloseSnackbar={closeSnackbar}
      diagramEditor={<BpmnEditor ref={editorRef} height="100%" initialXml={initialXml} onChange={setXmlContent} />}
      xmlEditor={<XmlEditor value={xmlContent} onChange={setXmlContent} height="100%" />}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
};
