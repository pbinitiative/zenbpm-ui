import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { FormViewer } from '@components/FormBuilder';
import type { FormViewerRef } from '@components/FormBuilder';
import type { FormSchema } from '@components/FormBuilder';
import type { Job } from '../types';

interface CompleteFormJobDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
  onComplete: (jobKey: string, variables: Record<string, unknown>) => Promise<void>;
}

/**
 * Parse the JSON_FORM variable value into a FormSchema.
 * Handles both string (JSON-encoded) and object values.
 */
function parseFormSchema(value: unknown): FormSchema | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'components' in parsed) {
        return parsed as FormSchema;
      }
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && 'components' in value) {
    return value as FormSchema;
  }

  return null;
}

export const CompleteFormJobDialog = ({
  open,
  job,
  onClose,
  onComplete,
}: CompleteFormJobDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const formViewerRef = useRef<FormViewerRef | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(false);

  const schema = useMemo(() => parseFormSchema(job.variables?.JSON_FORM), [job.variables]);

  // Initial data: all job variables except JSON_FORM itself
  const initialData = useMemo(() => {
    if (!job.variables) return {};
    const { JSON_FORM: _, ...rest } = job.variables;
    return rest;
  }, [job.variables]);

  const handleFormSubmit = useCallback(
    async (data: Record<string, unknown>, errors: Record<string, unknown>) => {
      if (Object.keys(errors).length > 0) {
        setValidationError(true);
        return;
      }
      setValidationError(false);
      setLoading(true);
      try {
        await onComplete(job.key, data);
      } finally {
        setLoading(false);
      }
    },
    [job.key, onComplete],
  );

  const handleDialogComplete = useCallback(() => {
    formViewerRef.current?.submit();
  }, []);

  if (!schema) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('processInstance:dialogs.completeFormJob.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 1 }}>
            {t('processInstance:dialogs.completeFormJob.invalidSchema')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common:actions.close')}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.completeFormJob.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('processInstance:dialogs.completeFormJob.description')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.elementId')}
            </Typography>
            <Typography variant="body2">{job.elementName || job.elementId}</Typography>
          </Box>

          {validationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('processInstance:dialogs.completeFormJob.validationError')}
            </Alert>
          )}

          <FormViewer
            ref={formViewerRef}
            schema={schema}
            data={initialData}
            onSubmit={handleFormSubmit}
          />

          {job.errorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {t('processInstance:fields.errorMessage')}
              </Typography>
              <Typography variant="body2">{job.errorMessage}</Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button onClick={handleDialogComplete} variant="contained" disabled={loading}>
          {t('processInstance:actions.complete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
