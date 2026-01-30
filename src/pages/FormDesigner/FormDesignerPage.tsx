import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { DesignerShell } from '@components/DesignerShell';
import { FormBuilder } from '@components/FormBuilder';
import { JsonEditor } from '@components/JsonEditor/JsonEditor';
import { useFormDesigner } from './hooks';

export const FormDesignerPage = () => {
  const { t } = useTranslation([ns.designer]);

  const {
    editorRef,
    editorMode,
    initialSchema,
    jsonContent,
    snackbar,
    consoleMessages,
    consoleOpen,
    handleModeChange,
    handleDeploy,
    handleFileUpload,
    handleDownload,
    closeSnackbar,
    setJsonContent,
    toggleConsole,
    clearConsole,
  } = useFormDesigner();

  return (
    <DesignerShell
      editorMode={editorMode}
      deploying={false}
      deployDisabled
      hideConsole
      consoleMessages={consoleMessages}
      consoleOpen={consoleOpen}
      snackbar={snackbar}
      fileAccept=".json,.form"
      diagramModeIcon={<DynamicFormIcon fontSize="small" sx={{ mr: 0.5 }} />}
      diagramModeLabel={t('designer:modes.designer')}
      xmlModeLabel={t('designer:modes.json')}
      xmlModeIcon={<DataObjectIcon fontSize="small" sx={{ mr: 0.5 }} />}
      testIdPrefix="form-designer"
      onModeChange={handleModeChange}
      onFileUpload={handleFileUpload}
      onDownload={handleDownload}
      onDeploy={handleDeploy}
      onToggleConsole={toggleConsole}
      onClearConsole={clearConsole}
      onCloseSnackbar={closeSnackbar}
      diagramEditor={
        <FormBuilder ref={editorRef} initialSchema={initialSchema} height="100%" />
      }
      xmlEditor={
        <JsonEditor value={jsonContent} onChange={setJsonContent} height="100%" />
      }
    />
  );
};
