import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import type { Job } from '../types';

interface CompleteJobDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
  onComplete: (jobKey: number, variables: Record<string, unknown>) => Promise<void>;
}

export const CompleteJobDialog = ({
  open,
  job,
  onClose,
  onComplete,
}: CompleteJobDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [variables, setVariables] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateJson = useCallback((value: string) => {
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch {
      setJsonError(t('common:errors.invalidJson'));
      return false;
    }
  }, [t]);

  const handleVariablesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVariables(value);
    validateJson(value);
  }, [validateJson]);

  const handleComplete = useCallback(async () => {
    if (!validateJson(variables)) return;

    setLoading(true);
    try {
      const parsedVariables = JSON.parse(variables);
      await onComplete(job.key, parsedVariables);
    } finally {
      setLoading(false);
    }
  }, [job.key, onComplete, validateJson, variables]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.completeJob.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('processInstance:dialogs.completeJob.description')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.key')}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: '"SF Mono", Monaco, monospace', fontSize: '0.75rem' }}
            >
              {job.key}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.elementId')}
            </Typography>
            <Typography variant="body2">{job.elementName || job.elementId}</Typography>
          </Box>

          <TextField
            label={t('processInstance:dialogs.completeJob.variables')}
            multiline
            rows={6}
            value={variables}
            onChange={handleVariablesChange}
            error={!!jsonError}
            helperText={jsonError || t('processInstance:dialogs.completeJob.variablesHelp')}
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: '"SF Mono", Monaco, monospace',
                fontSize: '0.875rem',
              },
            }}
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
        <Button
          onClick={handleComplete}
          variant="contained"
          disabled={!!jsonError || loading}
        >
          {t('processInstance:actions.complete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
