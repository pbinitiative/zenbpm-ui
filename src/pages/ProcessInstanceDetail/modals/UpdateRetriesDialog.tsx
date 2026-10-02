import { useState, useCallback, useEffect } from 'react';
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
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
} from '@mui/material';
import type { Job } from '../types';
import {
  MAX_INT32,
  DefinitionRetriesNotEvaluableError,
  apiErrorMessage,
  formatDateTimeWithSeconds,
  isWaitingOutBackoff,
  parsePositiveInteger,
  timestampAfter,
  type JobRetriesRequest,
  type UpdateJobRetriesRequest,
} from '../utils';

/**
 * `update` sets the retries of an active job. `retry` hands a failed job back
 * to its workers by resolving the job's incident, optionally with retries the
 * resolution sets, because setting retries alone leaves a failed job failed.
 */
export type JobRetriesDialogMode = 'update' | 'retry';

interface DialogBaseProps {
  open: boolean;
  job: Job;
  onClose: () => void;
}

/**
 * The callbacks reject with the reason the engine refused the request, which
 * the dialog shows. An update always names the retries; a retry may leave
 * them to the incident's resolution.
 */
export type UpdateRetriesDialogProps = DialogBaseProps & (
  | { mode: 'update'; onSubmit: (job: Job, request: UpdateJobRetriesRequest) => Promise<void> }
  | { mode: 'retry'; onSubmit: (job: Job, request: JobRetriesRequest) => Promise<void> }
);

/** Longest delay `setTimeout` accepts. */
const MAX_TIMEOUT_MS = 2_147_483_647;

type RetriesSource = 'definition' | 'custom';
type Schedule = 'now' | 'keep' | 'delay';
type DelayUnit = 'seconds' | 'minutes' | 'hours';

const DELAY_UNIT_MS: Record<DelayUnit, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
};

export const UpdateRetriesDialog = (props: UpdateRetriesDialogProps) => {
  const { open, job, mode, onClose } = props;
  const { t } = useTranslation([ns.common, ns.processInstance]);
  // The dialog keeps the job it was opened with, so it watches the end of a
  // backoff itself: once it passed, "when the current backoff ends" is "at once".
  const [waitingOutBackoff, setWaitingOutBackoff] = useState(() => isWaitingOutBackoff(job));
  const [backoffCheck, setBackoffCheck] = useState(0);
  useEffect(() => {
    if (!waitingOutBackoff || !job.retryAt) return;
    const timer = setTimeout(
      () => (isWaitingOutBackoff(job) ? setBackoffCheck((check) => check + 1) : setWaitingOutBackoff(false)),
      Math.min(Math.max(Date.parse(job.retryAt) - Date.now(), 0), MAX_TIMEOUT_MS)
    );
    return () => clearTimeout(timer);
  }, [waitingOutBackoff, job, backoffCheck]);

  const [retriesSource, setRetriesSource] = useState<RetriesSource>(mode === 'retry' ? 'definition' : 'custom');
  const [retriesInput, setRetriesInput] = useState(String(mode === 'update' ? Math.max(job.retries ?? 1, 1) : 1));
  const [chosenSchedule, setChosenSchedule] = useState<Schedule>(waitingOutBackoff ? 'keep' : 'now');
  const schedule = chosenSchedule === 'keep' && !waitingOutBackoff ? 'now' : chosenSchedule;
  const [delayInput, setDelayInput] = useState('10');
  const [delayUnit, setDelayUnit] = useState<DelayUnit>('minutes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retries set by the operator are the only way to choose when the job is
  // handed out; resolving the incident alone hands it out at once, unless
  // retries set since the job failed say otherwise.
  const setsRetries = mode === 'update' || retriesSource === 'custom';
  const retries = parsePositiveInteger(retriesInput, MAX_INT32);
  const delay = parsePositiveInteger(delayInput);
  const delayMs = delay === undefined ? undefined : delay * DELAY_UNIT_MS[delayUnit];
  const retriesError = !setsRetries || retries !== undefined
    ? undefined
    : parsePositiveInteger(retriesInput) === undefined
      ? t('processInstance:dialogs.updateRetries.retriesInvalid')
      : t('processInstance:dialogs.updateRetries.retriesTooLarge', { max: MAX_INT32.toLocaleString('en-US') });
  const delayError = !setsRetries || schedule !== 'delay'
    ? undefined
    : delayMs === undefined
      ? t('processInstance:dialogs.updateRetries.delayInvalid')
      : timestampAfter(delayMs) === undefined
        ? t('processInstance:dialogs.updateRetries.delayTooLong')
        : undefined;
  const invalid = retriesError !== undefined || delayError !== undefined;

  const handleSubmit = useCallback(async () => {
    if (invalid) return;
    const request: JobRetriesRequest = {};
    if (setsRetries) {
      request.retries = retries;
      if (schedule === 'keep' && job.retryAt) {
        request.retryAt = job.retryAt;
      } else if (schedule === 'delay' && delayMs !== undefined) {
        // checked again at submission, as time passed since the render
        const retryAt = timestampAfter(delayMs);
        if (retryAt === undefined) {
          setError(t('processInstance:dialogs.updateRetries.delayTooLong'));
          return;
        }
        request.retryAt = retryAt;
      }
    }
    setLoading(true);
    setError(null);
    try {
      if (props.mode === 'update') {
        // setsRetries holds in update mode and validation passed, so retries is set
        if (request.retries === undefined) return;
        await props.onSubmit(job, { retries: request.retries, retryAt: request.retryAt });
      } else {
        await props.onSubmit(job, request);
      }
    } catch (err) {
      // The way out the engine names: retries of the operator's own, given
      // with the resolution, which then does not evaluate the definition's.
      if (err instanceof DefinitionRetriesNotEvaluableError) setRetriesSource('custom');
      setError(
        apiErrorMessage(err) ??
          (mode === 'retry'
            ? t('processInstance:messages.jobRetryFailed')
            : t('processInstance:messages.retriesUpdateFailed'))
      );
    } finally {
      setLoading(false);
    }
  }, [invalid, setsRetries, retries, schedule, job, delayMs, props, t, mode]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="job-retries-dialog">
      <DialogTitle>
        {mode === 'retry'
          ? t('processInstance:dialogs.retryJob.title')
          : t('processInstance:dialogs.updateRetries.title')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {mode === 'retry'
              ? t('processInstance:dialogs.retryJob.description')
              : t('processInstance:dialogs.updateRetries.description')}
          </Typography>

          <Box
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}
            data-testid="job-retries-summary"
          >
            <SummaryItem label={t('processInstance:fields.currentRetries')} value={String(job.retries ?? '-')} />
            <SummaryItem label={t('processInstance:fields.attempts')} value={String(job.attempts ?? 0)} />
            <SummaryItem
              label={t('processInstance:fields.retryBackoff')}
              value={job.retryBackoff || t('processInstance:dialogs.updateRetries.defaultBackoff')}
            />
            {waitingOutBackoff && job.retryAt && (
              <SummaryItem
                label={t('processInstance:fields.retryAt')}
                value={formatDateTimeWithSeconds(job.retryAt)}
              />
            )}
          </Box>

          {job.lastFailureMessage && (
            <Alert severity="warning" data-testid="job-retries-last-failure">
              <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
                {t('processInstance:fields.lastFailureMessage')}
              </Typography>
              {job.lastFailureMessage}
            </Alert>
          )}

          {mode === 'retry' && (
            <FormControl>
              <FormLabel>{t('processInstance:dialogs.retryJob.retriesSource')}</FormLabel>
              <RadioGroup
                value={retriesSource}
                onChange={(e) => setRetriesSource(e.target.value as RetriesSource)}
              >
                <FormControlLabel
                  value="definition"
                  control={<Radio size="small" />}
                  label={t('processInstance:dialogs.retryJob.fromDefinition')}
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio size="small" />}
                  label={t('processInstance:dialogs.retryJob.custom')}
                />
              </RadioGroup>
            </FormControl>
          )}

          {setsRetries && (
            <TextField
              label={t('processInstance:dialogs.updateRetries.newRetries')}
              type="number"
              value={retriesInput}
              onChange={(e) => setRetriesInput(e.target.value)}
              error={retriesError !== undefined}
              helperText={retriesError ?? t('processInstance:dialogs.updateRetries.newRetriesHelp')}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              fullWidth
              autoFocus
              size="small"
            />
          )}

          {setsRetries ? (
            <FormControl>
              <FormLabel>{t('processInstance:dialogs.updateRetries.schedule')}</FormLabel>
              <RadioGroup value={schedule} onChange={(e) => setChosenSchedule(e.target.value as Schedule)}>
                <FormControlLabel
                  value="now"
                  control={<Radio size="small" />}
                  label={
                    waitingOutBackoff
                      ? t('processInstance:dialogs.updateRetries.scheduleNowCutsBackoff')
                      : t('processInstance:dialogs.updateRetries.scheduleNow')
                  }
                />
                {waitingOutBackoff && job.retryAt && (
                  <FormControlLabel
                    value="keep"
                    control={<Radio size="small" />}
                    label={t('processInstance:dialogs.updateRetries.scheduleKeep', {
                      time: formatDateTimeWithSeconds(job.retryAt),
                    })}
                  />
                )}
                <FormControlLabel
                  value="delay"
                  control={<Radio size="small" />}
                  label={t('processInstance:dialogs.updateRetries.scheduleDelay')}
                />
              </RadioGroup>
              {schedule === 'delay' && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
                  <TextField
                    label={t('processInstance:dialogs.updateRetries.delay')}
                    type="number"
                    value={delayInput}
                    onChange={(e) => setDelayInput(e.target.value)}
                    error={delayError !== undefined}
                    helperText={delayError}
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    size="small"
                    sx={{ width: 140 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={delayUnit}
                      onChange={(e) => setDelayUnit(e.target.value as DelayUnit)}
                      inputProps={{ 'aria-label': t('processInstance:dialogs.updateRetries.delayUnit') }}
                    >
                      <MenuItem value="seconds">{t('processInstance:dialogs.updateRetries.units.seconds')}</MenuItem>
                      <MenuItem value="minutes">{t('processInstance:dialogs.updateRetries.units.minutes')}</MenuItem>
                      <MenuItem value="hours">{t('processInstance:dialogs.updateRetries.units.hours')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </FormControl>
          ) : (
            <Typography variant="body2" color="text.secondary" data-testid="job-retries-resolve-only-hint">
              {t('processInstance:dialogs.retryJob.fromDefinitionHint')}
            </Typography>
          )}

          {error && (
            <Alert severity="error" data-testid="job-retries-error">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          variant="contained"
          disabled={loading || invalid}
        >
          {mode === 'retry' ? t('processInstance:actions.retry') : t('common:actions.update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);
