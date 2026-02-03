import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { BpmnEditor } from '@components/BpmnEditor';
import { XmlEditor } from '@components/XmlEditor';
import { DesignerShell } from '@components/DesignerShell';
import { useProcessDesigner } from './hooks';
import { FormDesignDialog } from './components/FormDesignDialog';

interface FormDesignDialogState {
  open: boolean;
  elementId: string;
  initialJson: string;
}

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
  } = useProcessDesigner({ processDefinitionKey });

  // Form design dialog state
  const [formDialog, setFormDialog] = useState<FormDesignDialogState>({
    open: false,
    elementId: '',
    initialJson: '',
  });

  // Listen for the custom event dispatched by the properties panel "Design Form" button
  useEffect(() => {
    const handler = (e: Event) => {
      const { elementId, value } = (e as CustomEvent<{ elementId: string; value: string }>).detail;
      setFormDialog({ open: true, elementId, initialJson: value });
    };
    document.addEventListener('bpmn-open-form-designer', handler);
    return () => document.removeEventListener('bpmn-open-form-designer', handler);
  }, []);

  const handleFormDesignSubmit = useCallback(
    (json: string) => {
      editorRef.current?.updateZenFormProperty(formDialog.elementId, json);
      setFormDialog({ open: false, elementId: '', initialJson: '' });
    },
    [editorRef, formDialog.elementId],
  );

  const handleFormDesignClose = useCallback(() => {
    setFormDialog({ open: false, elementId: '', initialJson: '' });
  }, []);

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
        testIdPrefix="process-designer"
        onModeChange={handleModeChange}
        onFileUpload={handleFileUpload}
        onDownload={handleDownload}
        onDeploy={handleDeploy}
        onToggleConsole={toggleConsole}
        onClearConsole={clearConsole}
        onCloseSnackbar={closeSnackbar}
        diagramEditor={<BpmnEditor ref={editorRef} height="100%" initialXml={initialXml} />}
        xmlEditor={<XmlEditor value={xmlContent} onChange={setXmlContent} height="100%" />}
      />

      <FormDesignDialog
        key={formDialog.elementId}
        open={formDialog.open}
        initialJson={formDialog.initialJson}
        onSubmit={handleFormDesignSubmit}
        onClose={handleFormDesignClose}
      />
    </>
  );
};
