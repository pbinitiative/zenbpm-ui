import { useParams } from 'react-router-dom';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { DmnEditor } from '@components/DmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { DesignerShell } from '@components/DesignerShell';
import { useDecisionDesigner } from './hooks';

export const DecisionDesignerPage = () => {
  const { decisionDefinitionKey } = useParams<{ decisionDefinitionKey?: string }>();
  const designerPrefix = "decision-designer"

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
    setHasUnsavedChanges,
  } = useDecisionDesigner({ decisionDefinitionKey, designerPrefix });

  return (
    <DesignerShell
      loading={loadingDefinition}
      editorMode={editorMode}
      deploying={deploying}
      consoleMessages={consoleMessages}
      consoleOpen={consoleOpen}
      snackbar={snackbar}
      fileAccept=".dmn,.xml"
      diagramModeIcon={<AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />}
      designerPrefix="decision-designer"
      onModeChange={handleModeChange}
      onFileUpload={handleFileUpload}
      onDownload={handleDownload}
      onDeploy={handleDeploy}
      onToggleConsole={toggleConsole}
      onClearConsole={clearConsole}
      onCloseSnackbar={closeSnackbar}
      diagramEditor={<DmnEditor ref={editorRef} height="100%" initialXml={initialXml} onChange={setXmlContent} />}
      xmlEditor={<XmlEditor value={xmlContent} onChange={setXmlContent} height="100%" />}
      hasUnsavedChanges={hasUnsavedChanges}
      setHasUnsavedChanges={setHasUnsavedChanges}
      initialXml={initialXml}
      xmlContent={xmlContent}
    />
  );
};
