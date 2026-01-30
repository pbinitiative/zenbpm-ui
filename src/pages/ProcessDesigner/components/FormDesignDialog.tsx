import { useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { FormBuilder } from '@components/FormBuilder';
import type { FormSchema, FormBuilderRef } from '@components/FormBuilder';

interface FormDesignDialogProps {
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
  const { t } = useTranslation([ns.common]);
  const formBuilderRef = useRef<FormBuilderRef>(null);

  const initialSchema = useMemo(() => parseSchema(initialJson), [initialJson]);

  const handleSubmit = useCallback(() => {
    const schema = formBuilderRef.current?.getSchema();
    if (schema) {
      onSubmit(JSON.stringify(schema, null, 2));
    }
  }, [onSubmit]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth sx={{ '& .MuiDialog-paper': { height: '90vh', maxWidth: '95vw' } }}>
      <DialogTitle>Design Form</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {open && (
            <FormBuilder
              ref={formBuilderRef}
              initialSchema={initialSchema}
              height="100%"
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained">
          {t('common:actions.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
