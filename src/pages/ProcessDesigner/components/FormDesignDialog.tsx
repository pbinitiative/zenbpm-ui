import { useRef, useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { FormBuilder } from '@components/FormBuilder';
import { JsonEditor } from '@components/JsonEditor/JsonEditor';
import type { FormSchema, FormBuilderRef } from '@components/FormBuilder';

type DialogMode = 'designer' | 'json';

export interface FormDesignDialogProps {
  open: boolean;
  initialJson: string;
  onSubmit: (json: string) => void;
  onClose: () => void;
}

function parseSchema(json: string): FormSchema {
  if (!json) return { type: 'default', components: [] };
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && 'components' in parsed) {
      return parsed as FormSchema;
    }
  } catch {
    // invalid JSON — start with empty form
  }
  return { type: 'default', components: [] };
}

export const FormDesignDialog = ({
  open,
  initialJson,
  onSubmit,
  onClose,
}: FormDesignDialogProps) => {
  const { t } = useTranslation([ns.common, ns.designer]);
  const formBuilderRef = useRef<FormBuilderRef>(null);
  const [mode, setMode] = useState<DialogMode>('designer');
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState(false);

  const initialSchema = useMemo(() => parseSchema(initialJson), [initialJson]);

  // Sync state when switching modes
  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: DialogMode | null) => {
      if (!newMode) return;

      if (newMode === 'json' && mode === 'designer') {
        // Designer → JSON: serialise current schema
        const schema = formBuilderRef.current?.getSchema();
        setJsonContent(schema ? JSON.stringify(schema, null, 2) : '');
        setJsonError(false);
      } else if (newMode === 'designer' && mode === 'json') {
        // JSON → Designer: parse and import
        try {
          const schema = parseSchema(jsonContent);
          void formBuilderRef.current?.importSchema(schema);
          setJsonError(false);
        } catch {
          setJsonError(true);
          return; // stay in JSON mode on error
        }
      }

      setMode(newMode);
    },
    [mode, jsonContent],
  );

  const handleSubmit = useCallback(() => {
    if (mode === 'json') {
      // Submit JSON directly (validate first)
      try {
        const parsed: unknown = JSON.parse(jsonContent);
        onSubmit(JSON.stringify(parsed, null, 2));
      } catch {
        setJsonError(true);
        return;
      }
    } else {
      const schema = formBuilderRef.current?.getSchema();
      if (schema) {
        onSubmit(JSON.stringify(schema, null, 2));
      }
    }
  }, [mode, jsonContent, onSubmit]);

  // Validate JSON on change
  const handleJsonChange = useCallback((value: string) => {
    setJsonContent(value);
    try {
      JSON.parse(value);
      setJsonError(false);
    } catch {
      setJsonError(value.trim().length > 0);
    }
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      sx={{ '& .MuiDialog-paper': { height: '90vh', maxWidth: '95vw' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Zen Form Designer
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
        >
          <ToggleButton value="designer">
            <DynamicFormIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('designer:modes.designer')}
          </ToggleButton>
          <ToggleButton value="json">
            <DataObjectIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('designer:modes.json')}
          </ToggleButton>
        </ToggleButtonGroup>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Designer mode — always mounted so ref stays alive */}
        <Box sx={{ flex: 1, minHeight: 0, display: mode === 'designer' ? 'flex' : 'none' }}>
          {open && (
            <FormBuilder
              ref={formBuilderRef}
              initialSchema={initialSchema}
              height="100%"
            />
          )}
        </Box>

        {/* JSON mode */}
        {mode === 'json' && (
          <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
            <JsonEditor
              value={jsonContent}
              onChange={handleJsonChange}
              height="100%"
              error={jsonError}
              errorMessage={jsonError ? t('common:errors.invalidJson') : undefined}
              showPrettify
              lineNumbers
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={mode === 'json' && jsonError}>
          {t('common:actions.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
