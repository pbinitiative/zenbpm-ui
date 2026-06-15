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
  Alert,
} from '@mui/material';
import { JsonEditor } from '@components/JsonEditor';
import type { Job } from '../types';

export interface FailJobDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
  /**
   * Submit handler. Receives the job key plus an `errorCode` and `variables`.
   * Both `errorCode` and `variables` are optional — empty/whitespace `errorCode`
   * is normalized to `undefined` and an empty `{}` variables object is treated
   * as "no variables".
   */
  onFail: (jobKey: string, errorCode: string | undefined, variables: Record<string, unknown> | undefined) => Promise<void>;
}

export const FailJobDialog = ({
  open,
  job,
  onClose,
  onFail,
}: FailJobDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [errorCode, setErrorCode] = useState('');
  const [variables, setVariables] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateJson = useCallback((value: string) => {
    // Empty string is allowed — the user can submit without variables.
    if (value === '') {
      setJsonError(null);
      return true;
    }
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch {
      setJsonError(t('common:errors.invalidJson'));
      return false;
    }
  }, [t]);

  const handleVariablesChange = useCallback((value: string) => {
    setVariables(value);
    validateJson(value);
  }, [validateJson]);

  const handleFail = useCallback(async () => {
    if (!validateJson(variables)) return;

    setLoading(true);
    try {
      const trimmedCode = errorCode.trim();
      let parsedVariables: Record<string, unknown> | undefined;
      if (variables !== '') {
        const parsed = JSON.parse(variables) as Record<string, unknown>;
        // Treat an empty object as "no variables" so we don't send `variables: {}` over the wire.
        parsedVariables = Object.keys(parsed).length > 0 ? parsed : undefined;
      }
      await onFail(
        job.key,
        trimmedCode === '' ? undefined : trimmedCode,
        parsedVariables
      );
    } finally {
      setLoading(false);
    }
  }, [errorCode, job.key, onFail, validateJson, variables]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.failJob.title')}</DialogTitle>
      <DialogContent>
        {job.errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {job.errorMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          <TextField
            label={t('processInstance:dialogs.failJob.errorCode')}
            value={errorCode}
            onChange={(e) => setErrorCode(e.target.value)}
            placeholder={t('processInstance:dialogs.failJob.errorCodePlaceholder')}
            fullWidth
            autoFocus
            size="small"
          />

          <JsonEditor
            label={t('processInstance:dialogs.failJob.variables')}
            value={variables}
            onChange={handleVariablesChange}
            error={!!jsonError}
            errorMessage={jsonError ?? undefined}
            placeholder={t('processInstance:dialogs.failJob.variablesPlaceholder')}
            height={160}
            showPrettify={false}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleFail}
          variant="contained"
          color="error"
          disabled={!!jsonError || loading}
        >
          {t('processInstance:actions.fail')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
