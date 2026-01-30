import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { FormSchema, FormBuilderRef } from '@components/FormBuilder';
import type { EditorMode, ConsoleMessage } from '@components/DesignerShell';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

const DEFAULT_SCHEMA: FormSchema = {
  type: 'default',
  components: [],
};

export const useFormDesigner = () => {
  const { t } = useTranslation([ns.designer]);
  const editorRef = useRef<FormBuilderRef | null>(null);

  const [editorMode, setEditorMode] = useState<EditorMode>('diagram');
  const [initialSchema, setInitialSchema] = useState<FormSchema>(DEFAULT_SCHEMA);
  const [jsonContent, setJsonContent] = useState<string>(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Switch between designer and JSON modes
  const handleModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => {
      if (!newMode || newMode === editorMode) return;

      if (newMode === 'xml') {
        // Designer → JSON: serialize the current schema
        const schema = editorRef.current?.getSchema() ?? DEFAULT_SCHEMA;
        setJsonContent(JSON.stringify(schema, null, 2));
        setEditorMode('xml');
      } else {
        // JSON → Designer: parse JSON back to schema
        try {
          const parsed: unknown = JSON.parse(jsonContent);
          if (parsed && typeof parsed === 'object' && 'components' in parsed) {
            const schema = parsed as FormSchema;
            setInitialSchema(schema);
            void editorRef.current?.importSchema(schema);
            setEditorMode('diagram');
          } else {
            showSnackbar(t('designer:messages.jsonParseError'), 'error');
          }
        } catch {
          showSnackbar(t('designer:messages.jsonParseError'), 'error');
        }
      }
    },
    [editorMode, jsonContent, showSnackbar, t],
  );

  // Import a JSON file
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed: unknown = JSON.parse(content);

          if (parsed && typeof parsed === 'object' && 'components' in parsed) {
            const schema = parsed as FormSchema;
            if (editorMode === 'xml') {
              setJsonContent(JSON.stringify(schema, null, 2));
            } else {
              setInitialSchema(schema);
              void editorRef.current?.importSchema(schema);
            }
            showSnackbar(t('designer:messages.fileLoaded'), 'success');
          } else {
            showSnackbar(t('designer:messages.jsonParseError'), 'error');
          }
        } catch {
          showSnackbar(t('designer:messages.fileLoadFailed'), 'error');
        }
      };
      reader.onerror = () => {
        showSnackbar(t('designer:messages.fileLoadFailed'), 'error');
      };
      reader.readAsText(file);

      // Reset file input so the same file can be re-imported
      event.target.value = '';
    },
    [editorMode, showSnackbar, t],
  );

  // Download current schema as JSON
  const handleDownload = useCallback(() => {
    try {
      let schema: FormSchema;
      if (editorMode === 'xml') {
        schema = JSON.parse(jsonContent) as FormSchema;
      } else {
        schema = editorRef.current?.getSchema() ?? DEFAULT_SCHEMA;
      }

      const json = JSON.stringify(schema, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'form.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      showSnackbar(t('designer:messages.formExportFailed'), 'error');
    }
  }, [editorMode, jsonContent, showSnackbar, t]);

  // Deploy is a no-op for forms
  const handleDeploy = useCallback(() => {
    // Not supported for form designer
  }, []);

  // Empty console state (no console for forms)
  const consoleMessages: ConsoleMessage[] = [];
  const consoleOpen = false;
  const toggleConsole = useCallback(() => {}, []);
  const clearConsole = useCallback(() => {}, []);

  return {
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
  };
};
