import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { BpmnEditor } from '@components/BpmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { DesignerShell } from '@components/DesignerShell';
import { useProcessDesigner } from './hooks';
import { useFormDesignDialog } from './components/useFormDesignDialog';

export const ProcessDesignerPage = () => {
  const { processDefinitionKey } = useParams<{ processDefinitionKey?: string }>();
  const designerPrefix = "process-designer"

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
  } = useProcessDesigner({ processDefinitionKey, designerPrefix });

  const { openFormDesignerDialog, closeFormDesignerDialog } = useFormDesignDialog();

  useEffect(() => {
    const handler = (e: Event) => {
      const { elementId, value } = (e as CustomEvent<{ elementId: string; value: string }>).detail;
      openFormDesignerDialog({
        initialJson: value,
        onSubmit: (json: string) => {
          editorRef.current?.updateZenFormProperty(elementId, json);
          closeFormDesignerDialog();
        },
      });
    };
    document.addEventListener('bpmn-open-form-designer', handler);
    return () => document.removeEventListener('bpmn-open-form-designer', handler);
  }, [editorRef, openFormDesignerDialog, closeFormDesignerDialog]);

  return (
    <>
      <DesignerShell
        loading={loadingDefinition}
        editorMode={editorMode}
        deploying={deploying}
        consoleMessages={consoleMessages}
        consoleOpen={consoleOpen}
        snackbar={snackbar}
        fileAccept=".bpmn,.xml"
        diagramModeIcon={<AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />}
        designerPrefix={designerPrefix}
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
        setHasUnsavedChanges={setHasUnsavedChanges}
        initialXml={initialXml}
        xmlContent={xmlContent}
      />
    </>
  );
};
