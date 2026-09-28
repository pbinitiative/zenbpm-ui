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
  Typography,
} from '@mui/material';
import { JsonEditor } from '@components/JsonEditor';
import { parseIsoBackoff } from '@base/utils/isoDuration';
import type { Job } from '../types';
import { MAX_INT32 } from '../utils';

export interface FailJobRequest {
  errorCode?: string;
  message?: string;
  variables?: Record<string, unknown>;
  /** Retries left after this failure; absent means one less than now. */
  retries?: number;
  /** ISO-8601 backoff overriding the task definition's policy for this failure. */
  retryBackoff?: string;
}

/** A whole number from 0 to the `int32` maximum, or undefined for anything else. */
const parseRetriesLeft = (value: string): number | undefined => {
  if (!/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed <= MAX_INT32 ? parsed : undefined;
};

export interface FailJobDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
  /**
   * Submit handler. Every field of the request is optional: an empty or
   * whitespace `errorCode` or `message` is left out, and an empty `{}`
   * variables object is treated as "no variables".
   */
  onFail: (jobKey: string, request: FailJobRequest) => Promise<void>;
}

export const FailJobDialog = ({
  open,
  job,
  onClose,
  onFail,
}: FailJobDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [errorCode, setErrorCode] = useState('');
  const [message, setMessage] = useState('');
  const [retriesInput, setRetriesInput] = useState('');
  const [backoffInput, setBackoffInput] = useState('');
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

  // The engine ignores retries and backoff of a BPMN error, so they are
  // offered, validated and sent only for a failure without an error code.
  const isBpmnError = errorCode.trim() !== '';
  const retriesLeft = retriesInput.trim() === '' ? undefined : parseRetriesLeft(retriesInput);
  const retriesInvalid = !isBpmnError && retriesInput.trim() !== '' && retriesLeft === undefined;
  const backoffInvalid = !isBpmnError && backoffInput.trim() !== '' && parseIsoBackoff(backoffInput) === undefined;

  const handleFail = useCallback(async () => {
    if (!validateJson(variables) || retriesInvalid || backoffInvalid) return;

    setLoading(true);
    try {
      const trimmedCode = errorCode.trim();
      let parsedVariables: Record<string, unknown> | undefined;
      if (variables !== '') {
        const parsed = JSON.parse(variables) as Record<string, unknown>;
        // Treat an empty object as "no variables" so we don't send `variables: {}` over the wire.
        parsedVariables = Object.keys(parsed).length > 0 ? parsed : undefined;
      }
      const trimmedMessage = message.trim();
      const trimmedBackoff = backoffInput.trim();
      await onFail(job.key, {
        errorCode: trimmedCode === '' ? undefined : trimmedCode,
        message: trimmedMessage === '' ? undefined : trimmedMessage,
        variables: parsedVariables,
        retries: trimmedCode === '' ? retriesLeft : undefined,
        retryBackoff: trimmedCode === '' && trimmedBackoff !== '' ? trimmedBackoff : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [
    errorCode, message, job.key, onFail, validateJson, variables,
    retriesInvalid, backoffInvalid, retriesLeft, backoffInput,
  ]);

  // Without an error code the engine spends one attempt and leaves the retries
  // the request names, else one less than now; only the failure which leaves
  // none fails the job with an incident. With one it throws a BPMN error.
  const remaining = retriesLeft ?? Math.max((job.retries ?? 1) - 1, 0);
  const outcome = isBpmnError
    ? t('processInstance:dialogs.failJob.outcomeBpmnError')
    : remaining === 0
      ? t('processInstance:dialogs.failJob.outcomeIncident')
      : t('processInstance:dialogs.failJob.outcomeRetry', { retries: remaining });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.failJob.title')}</DialogTitle>
      <DialogContent>
        {job.lastFailureMessage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
              {t('processInstance:fields.lastFailureMessage')}
            </Typography>
            {job.lastFailureMessage}
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

          <TextField
            label={t('processInstance:dialogs.failJob.message')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('processInstance:dialogs.failJob.messagePlaceholder')}
            helperText={t('processInstance:dialogs.failJob.messageHelp')}
            fullWidth
            multiline
            minRows={2}
            size="small"
          />

          {!isBpmnError && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('processInstance:dialogs.failJob.retries')}
                type="number"
                value={retriesInput}
                onChange={(e) => setRetriesInput(e.target.value)}
                error={retriesInvalid}
                helperText={
                  retriesInvalid
                    ? t('processInstance:dialogs.failJob.retriesInvalid')
                    : t('processInstance:dialogs.failJob.retriesHelp')
                }
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                fullWidth
                size="small"
              />
              <TextField
                label={t('processInstance:dialogs.failJob.retryBackoff')}
                value={backoffInput}
                onChange={(e) => setBackoffInput(e.target.value)}
                error={backoffInvalid}
                placeholder={t('processInstance:dialogs.failJob.retryBackoffPlaceholder')}
                helperText={
                  backoffInvalid
                    ? t('processInstance:dialogs.failJob.retryBackoffInvalid')
                    : t('processInstance:dialogs.failJob.retryBackoffHelp')
                }
                fullWidth
                size="small"
              />
            </Box>
          )}

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

          <Alert severity="info" data-testid="fail-job-outcome">
            {outcome}
          </Alert>
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
          disabled={!!jsonError || loading || retriesInvalid || backoffInvalid}
        >
          {t('processInstance:actions.fail')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
