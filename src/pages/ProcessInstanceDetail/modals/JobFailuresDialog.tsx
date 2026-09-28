import { useMemo, useState } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useGetJobFailures, type JobFailure } from '@base/openapi';
import { DataTable, type Column } from '@components/DataTable';
import { MonoText } from '@components/MonoText';
import type { Job } from '../types';
import { formatDateTimeWithSeconds } from '../utils';

const FAILURES_PAGE_SIZE = 10;

export interface JobFailuresDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
}

/**
 * Lists the failures without an error code a worker reported for the job,
 * newest first. Failures with an error code are BPMN errors, which the engine
 * does not record here.
 */
export const JobFailuresDialog = ({ open, job, onClose }: JobFailuresDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(FAILURES_PAGE_SIZE);

  // Workers report failures at any time, so the history is read afresh on
  // every open instead of from the application's one-minute cache.
  const { data, isLoading, isFetching, isError, refetch } = useGetJobFailures(
    job.key,
    { page: page + 1, size: pageSize },
    { query: { staleTime: 0, refetchOnMount: 'always' } }
  );

  const columns: Column<JobFailure>[] = useMemo(
    () => [
      {
        id: 'attempt',
        label: t('processInstance:dialogs.jobFailures.attempt'),
        width: 80,
        render: (row) => <Typography variant="body2">{row.attempt}</Typography>,
      },
      {
        id: 'failedAt',
        label: t('processInstance:dialogs.jobFailures.failedAt'),
        width: 180,
        render: (row) => formatDateTimeWithSeconds(row.failedAt),
      },
      {
        id: 'message',
        label: t('processInstance:dialogs.jobFailures.message'),
        render: (row) => (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {row.message || t('processInstance:dialogs.jobFailures.noMessage')}
          </Typography>
        ),
      },
      {
        id: 'outcome',
        label: t('processInstance:dialogs.jobFailures.outcome'),
        width: 220,
        render: (row) => {
          if (row.incidentKey) {
            return (
              <Box>
                <Typography variant="body2" color="error.main">
                  {t('processInstance:dialogs.jobFailures.incidentCreated')}
                </Typography>
                <MonoText>{row.incidentKey}</MonoText>
              </Box>
            );
          }
          if (row.retryAt) {
            return t('processInstance:dialogs.jobFailures.retriedAt', { time: formatDateTimeWithSeconds(row.retryAt) });
          }
          return t('processInstance:dialogs.jobFailures.retriedAtOnce');
        },
      },
    ],
    [t]
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth data-testid="job-failures-dialog">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {t('processInstance:dialogs.jobFailures.title')}
        <Tooltip title={t('processInstance:dialogs.jobFailures.refresh')}>
          <Box component="span">
            <IconButton
              size="small"
              aria-label={t('processInstance:dialogs.jobFailures.refresh')}
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('processInstance:dialogs.jobFailures.description')}
        </Typography>
        {isError ? (
          <Alert severity="error">{t('processInstance:dialogs.jobFailures.loadFailed')}</Alert>
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            rowKey="key"
            loading={isLoading}
            page={page}
            pageSize={pageSize}
            totalCount={data?.totalCount ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
            data-testid="job-failures-table"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
