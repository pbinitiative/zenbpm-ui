import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ReplayIcon from '@mui/icons-material/Replay';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { DataTable, type Column, type SortOrder, type DataTableSection } from '@components/DataTable';
import { StateBadge } from '@components/StateBadge';
import { type Job, type JobState, type NotificationOptions } from '../types';
import { useCompleteJobDialog } from '../modals/useCompleteJobDialog';
import { useAssignJobDialog } from '../modals/useAssignJobDialog';
import { useUpdateRetriesDialog } from '../modals/useUpdateRetriesDialog';
import { useJobFailuresDialog } from '../modals/useJobFailuresDialog';
import { useFailJobDialog } from '../modals/useFailJobDialog';
import type { FailJobRequest } from '../modals/FailJobDialog';
import { useInputOutputDialog } from '@components/InputOutputDialog';
import {
  assignJob,
  completeJob,
  failJob,
  getGetJobFailuresQueryKey,
  resolveIncident,
  updateJobRetries,
  type FailJobBody,
} from '@base/openapi';
import { MonoText } from "@components/MonoText";
import { formatDate } from "@components/DiagramDetailLayout/utils";
import { VariablesBadgeCell } from '../components/VariablesBadgeCell';
import type { ProcessInstanceNode } from '../types/tree';
import {
  DefinitionRetriesNotEvaluableError,
  apiErrorMessage,
  collectNodes,
  compareByProcessType,
  findOpenIncidentOfJob,
  formatDateTimeWithSeconds,
  isIncidentOpen,
  isBadRequest,
  isResolutionRefused,
  isWaitingOutBackoff,
  type JobRetriesRequest,
  type UpdateJobRetriesRequest,
} from '../utils';

interface JobsTabProps {
  instanceTree: ProcessInstanceNode | null;
  jobsPage: number;
  jobsPageSize: number;
  setJobsPage: (page: number) => void;
  setJobsPageSize: (size: number) => void;
  onManualNavigation: () => void;
  onRefetch: () => Promise<void>;
  onShowNotification: (
    message: string,
    severity: 'success' | 'error' | 'warning',
    options?: NotificationOptions
  ) => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
  onNavigateToHistory?: (elementInstanceKey: string) => void;
  focusedElementInstanceKey?: string;
  autoScrollToFocusedRow?: boolean;
  onFocusedRowVisible?: () => void;
  findingFocusedJob?: boolean;
}

export const JobsTab = ({
  instanceTree,
  jobsPage,
  jobsPageSize,
  setJobsPage,
  setJobsPageSize,
  onManualNavigation,
  onRefetch,
  onShowNotification,
  onElementIdClick,
  onNavigateToHistory,
  focusedElementInstanceKey,
  autoScrollToFocusedRow = false,
  onFocusedRowVisible,
  findingFocusedJob = false,
}: JobsTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const queryClient = useQueryClient();

  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { openCompleteJobDialog } = useCompleteJobDialog();
  const { openAssignJobDialog } = useAssignJobDialog();
  const { openUpdateRetriesDialog } = useUpdateRetriesDialog();
  const { openJobFailuresDialog } = useJobFailuresDialog();
  const { openFailJobDialog } = useFailJobDialog();
  const { openInputOutputDialog } = useInputOutputDialog();

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuJob, setMenuJob] = useState<Job | null>(null);

  const isJobActive = (state: JobState): boolean =>
    state === 'activatable' || state === 'activated' || state === 'active';

  // User Task classification uses the persisted BPMN element kind exposed by the
  // backend as `job.elementType`. This is independent of the configurable worker
  // routing value (`job.type`), so a custom-typed User Task (`type: "approval"`,
  // `elementType: "USER_TASK"`) is correctly classified even though its routing
  // type is not `user-task-type`. Definitions don't need to be loaded for this to
  // work — the value arrives with the job itself.
  const userTaskJobKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!instanceTree) return keys;
    for (const node of collectNodes(instanceTree)) {
      for (const job of node.jobs) {
        if (job.elementType === 'USER_TASK') keys.add(job.key);
      }
    }
    return keys;
  }, [instanceTree]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, job: Job) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuJob(job);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    setMenuJob(null);
  }, []);

  const handleCompleteJob = useCallback(async (jobKey: string, variables: Record<string, unknown>) => {
    try {
      await completeJob(jobKey, { variables });
      onShowNotification(t('processInstance:messages.jobCompleted'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.jobCompleteFailed'), 'error');
    }
  }, [onRefetch, onShowNotification, t]);

  const handleAssignJob = useCallback(async (jobKey: string, assignee: string) => {
    try {
      await assignJob(jobKey, { assignee });
      onShowNotification(t('processInstance:messages.jobAssigned'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.jobAssignFailed'), 'error');
    }
  }, [onRefetch, onShowNotification, t]);

  // Errors propagate to the dialog, which stays open and shows the engine's reason.
  const handleUpdateRetries = useCallback(async (job: Job, request: UpdateJobRetriesRequest) => {
    await updateJobRetries(job.key, request);
    onShowNotification(t('processInstance:messages.retriesUpdated'), 'success');
    await onRefetch();
  }, [onRefetch, onShowNotification, t]);

  // A failed job goes back to its workers once its incident is resolved. The
  // retries the operator chose travel with the resolution, which sets them in
  // the same transaction: either both happen or neither does. Without any, the
  // resolution keeps retries set since the job failed elsewhere, together with
  // their `retryAt`, or else restores the retries of the task definition and
  // hands the job out at once.
  const handleRetryFailedJob = useCallback(async (job: Job, request: JobRetriesRequest) => {
    const incident = await findOpenIncidentOfJob(job);
    if (!incident) {
      await onRefetch();
      throw new Error(t('processInstance:messages.jobIncidentNotFound'));
    }
    try {
      await resolveIncident(
        incident.key,
        request.retries === undefined ? undefined : { retries: request.retries, retryAt: request.retryAt }
      );
    } catch (err) {
      await onRefetch();
      // A bad request changed nothing. Any other error may find the incident
      // resolved: a refusal (409) because somebody else resolved it after it
      // was looked up, which applied none of the retries chosen here; any
      // other error because the engine saved the resolution, then continuing
      // the instance failed, or the answer of the partition's leader was lost.
      // The job is back with its workers then, and only that is left to
      // report. When the check fails too, the incident counts as open, which
      // a second Retry clears up.
      if (!isBadRequest(err)) {
        const stillOpen = await isIncidentOpen(job.processInstanceKey, incident.key).catch(() => true);
        if (!stillOpen) {
          const reason = apiErrorMessage(err) ?? t('processInstance:messages.incidentResolveFailed');
          if (!isResolutionRefused(err)) {
            onShowNotification(t('processInstance:messages.jobRetriedButEngineReportedError', { reason }), 'warning', {
              persist: true,
            });
          } else if (request.retries !== undefined) {
            onShowNotification(t('processInstance:messages.jobResolvedMeanwhileWithoutRetries', { reason }), 'warning', {
              persist: true,
            });
          } else {
            onShowNotification(t('processInstance:messages.jobResolvedMeanwhile'), 'success');
          }
          return;
        }
      }
      if (request.retries === undefined && isResolutionRefused(err)) {
        throw new DefinitionRetriesNotEvaluableError(
          t('processInstance:dialogs.retryJob.definitionRetriesNotEvaluable', {
            reason: apiErrorMessage(err) ?? t('processInstance:messages.incidentResolveFailed'),
          }),
          { cause: err }
        );
      }
      throw err;
    }
    onShowNotification(
      request.retryAt
        ? t('processInstance:messages.jobRetriedAt', { time: formatDateTimeWithSeconds(request.retryAt) })
        : t('processInstance:messages.jobRetried'),
      'success'
    );
    await onRefetch();
  }, [onRefetch, onShowNotification, t]);

  const handleFailJob = useCallback(async (
    jobKey: string,
    request: FailJobRequest,
    jobType: string
  ) => {
    // Only include keys the API actually accepts. An empty `errorCode`, `message`
    // or `variables` object should not be sent over the wire at all.
    const body: FailJobBody = {};
    if (request.errorCode !== undefined && request.errorCode !== '') {
      body.errorCode = request.errorCode;
    }
    if (request.message !== undefined && request.message !== '') {
      body.message = request.message;
    }
    if (request.variables !== undefined && Object.keys(request.variables).length > 0) {
      body.variables = request.variables;
    }
    if (request.retries !== undefined) {
      body.retries = request.retries;
    }
    if (request.retryBackoff !== undefined) {
      body.retryBackoff = request.retryBackoff;
    }
    // No `deliveryToken`: an operator failing a job means a new failure. The
    // job shown may be seconds old: had a worker failed that delivery
    // meanwhile, the failure would be answered as recorded, and had the job
    // been handed out again, it would be refused with 409. Either way the
    // operator's failure would change nothing. A job never handed out has
    // token 0, which the engine refuses with 400.
    try {
      await failJob(jobKey, body);
    } catch (err) {
      // A refusal, such as a `409` for a job completed or failed meanwhile,
      // reaches the dialog, which stays open and shows the engine's reason;
      // the table catches up with the job's state.
      await onRefetch();
      throw err;
    }
    // A failure without an error code adds to the job's failure history.
    // The history dialog reads afresh on every open anyway; this reaches a
    // history query still mounted when the failure is sent.
    void queryClient.invalidateQueries({ queryKey: getGetJobFailuresQueryKey(jobKey) });
    onShowNotification(
      t('processInstance:messages.jobFailed') + ` (${jobType})`,
      'success'
    );
    await onRefetch();
  }, [onRefetch, onShowNotification, queryClient, t]);

  const columns: Column<Job>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processInstance:fields.key'),
        sortable: true,
        width: 180,
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'variables',
        label: t('processInstance:fields.jobInputOutput'),
        width: 200,
        render: (row) => (
          <VariablesBadgeCell
            inputVariables={row.inputVariables}
            outputVariables={row.outputVariables}
            excludeFromInputKeys={['ZEN_FORM']}
            onOpenDialog={(inputVariables, outputVariables) =>
              openInputOutputDialog({
                data: {
                  title: t('processInstance:fields.jobInputOutput'),
                  subtitle: t('processInstance:fields.jobInputOutputSubtitle'),
                  inputVariables,
                  outputVariables,
                },
              })
            }
          />
        ),
      },
      {
        id: 'elementId',
        label: t('processInstance:fields.elementId'),
        sortable: true,
        render: (row) => (
          <Box>
            <Link
              component="button"
              variant="body2"
              onClick={(e) => {
                (e as React.MouseEvent).stopPropagation();
                onElementIdClick?.(row.elementId);
              }}
              sx={{
                textAlign: 'left',
                textDecoration: 'underline',
                textDecorationColor: 'text.disabled',
                color: 'text.primary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {row.elementName || row.elementId}
            </Link>
            {row.elementName && (
              <Typography variant="caption" color="text.secondary" display="block">
                {row.elementId}
              </Typography>
            )}
          </Box>
        ),
        width: 150,
      },
      {
        id: 'type',
        label: t('processInstance:fields.jobType'),
        sortable: true,
        width: 150,
        render: (row) => (
          <Chip label={row.type} size="small" variant="outlined" sx={{ fontSize: 'caption.fontSize', height: 22 }} />
        ),
      },
      {
        id: 'assignee',
        label: t('processInstance:fields.assignee'),
        width: 120,
        render: (row) =>
          row.assignee ? (
            <Tooltip title={row.candidateGroups?.join(', ') || ''}>
              <Typography variant="body2">{row.assignee}</Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          ),
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        sortable: true,
        width: 150,
        render: (row) => (
          <Box>
            <StateBadge
              state={row.state}
              label={t(`processInstance:jobStates.${row.state}`)}
            />
            {row.retryAt && isWaitingOutBackoff(row) && (
              <Typography
                variant="caption"
                color="warning.main"
                display="block"
                data-testid="job-retry-at"
                sx={{ mt: 0.5 }}
              >
                {t('processInstance:fields.retryingAt', { time: formatDateTimeWithSeconds(row.retryAt) })}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'retries',
        label: t('processInstance:fields.retries'),
        width: 110,
        render: (row) => (
          <Tooltip title={row.lastFailureMessage ?? ''}>
            <Box data-testid="job-retries-cell">
              <Typography variant="body2" color={row.retries === 0 ? 'error.main' : 'text.primary'}>
                {row.retries ?? '-'}
              </Typography>
              {(row.attempts ?? 0) > 0 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('processInstance:fields.failedAttempts', { count: row.attempts })}
                </Typography>
              )}
            </Box>
          </Tooltip>
        ),
      },
      {
        id: 'createdAt',
        label: t('processInstance:fields.createdAt'),
        sortable: true,
        width: 160,
        render: (row) => formatDate(row.createdAt),
      },
      {
        id: 'actions',
        label: '',
        width: 140,
        render: (row) => {
          const isActive = isJobActive(row.state);
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {isActive && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openCompleteJobDialog({ job: row, onComplete: handleCompleteJob });
                  }}
                  sx={{ textTransform: 'none', fontSize: 'caption.fontSize' }}
                >
                  {t('processInstance:actions.complete')}
                </Button>
              )}
              <IconButton
                size="small"
                aria-label={t('processInstance:actions.rowActions')}
                onClick={(e) => handleMenuOpen(e, row)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [t, handleMenuOpen, openCompleteJobDialog, handleCompleteJob, openInputOutputDialog, onElementIdClick],
  );

  // Build sections from the server-fetched data — no client-side slicing.
  // Pagination is handled server-side: page changes trigger API refetch for all nodes.
  const { sections, flatData, totalCount } = useMemo(() => {
    if (!instanceTree) return { sections: undefined, flatData: [], totalCount: 0 };

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1).sort(compareByProcessType);
    const orderedNodes = [rootNode, ...childNodes];

    const hasChildWithJobs = childNodes.some((n) => n.jobs.length > 0 || n.jobsTotalCount > 0);

    // totalCount = max across all nodes so the paginator covers the largest section
    const maxTotal = Math.max(...orderedNodes.map((n) => n.jobsTotalCount), 0);

    // Sort helper (client-side sort within the current page)
    const sortRows = (rows: Job[]): Job[] => {
      if (!sortBy) return rows;
      return [...rows].sort((a, b) => {
        const aRaw = a[sortBy as keyof Job];
        const bRaw = b[sortBy as keyof Job];

        const aVal = typeof aRaw === 'object' || aRaw == null ? '' : String(aRaw);
        const bVal = typeof bRaw === 'object' || bRaw == null ? '' : String(bRaw);

        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    };

    if (!hasChildWithJobs) {
      return { sections: undefined, flatData: sortRows(rootNode.jobs), totalCount: maxTotal };
    }

    // Sections path
    const result: DataTableSection<Job>[] = [];
    for (const node of orderedNodes) {
      if (node.jobs.length === 0 && node.jobsTotalCount === 0) continue;
      const isRoot = node === rootNode;
      const label = isRoot
        ? ''
        : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`;
      result.push({
        label,
        callPath: isRoot ? undefined : node.callPath,
        data: sortRows(node.jobs),
      });
    }

    return { sections: result.length > 0 ? result : undefined, flatData: [], totalCount: maxTotal };
  }, [instanceTree, sortBy, sortOrder, t]);

  return (
    <Box data-testid="jobs-tab">
      <DataTable
        columns={columns}
        data={flatData}
        sections={sections}
        rowKey="key"
        data-testid="jobs-table"
        page={jobsPage}
        pageSize={jobsPageSize}
        onPageChange={(page) => { onManualNavigation(); setJobsPage(page); }}
        onPageSizeChange={(newSize) => {
          onManualNavigation();
          setJobsPageSize(newSize);
          setJobsPage(0);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        totalCount={totalCount}
        loading={findingFocusedJob}
        onElementIdClick={onElementIdClick}
        focusedRowKey={focusedElementInstanceKey}
        getRowFocusKey={(row) => row.elementInstanceKey}
        autoScrollToFocusedRow={autoScrollToFocusedRow}
        onFocusedRowVisible={onFocusedRowVisible}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (menuJob) onNavigateToHistory?.(menuJob.elementInstanceKey);
            handleMenuClose();
          }}
        >
          <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('processInstance:actions.viewInHistory')}</ListItemText>
        </MenuItem>
        {menuJob && userTaskJobKeys.has(menuJob.key) && (
          <MenuItem onClick={() => { openAssignJobDialog({ job: menuJob, onAssign: handleAssignJob }); handleMenuClose(); }}>
            <ListItemIcon><PersonAddIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.assign')}</ListItemText>
          </MenuItem>
        )}
        {menuJob?.state === 'failed' && (
          <MenuItem onClick={() => { openUpdateRetriesDialog({ job: menuJob, mode: 'retry', onSubmit: handleRetryFailedJob }); handleMenuClose(); }}>
            <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.retry')}</ListItemText>
          </MenuItem>
        )}
        {menuJob && isJobActive(menuJob.state) && (
          <MenuItem onClick={() => { openUpdateRetriesDialog({ job: menuJob, mode: 'update', onSubmit: handleUpdateRetries }); handleMenuClose(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.updateRetries')}</ListItemText>
          </MenuItem>
        )}
        {menuJob && (
          <MenuItem onClick={() => { openJobFailuresDialog({ job: menuJob }); handleMenuClose(); }}>
            <ListItemIcon><ListAltIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.viewFailures')}</ListItemText>
          </MenuItem>
        )}
        {menuJob && isJobActive(menuJob.state) && (
          <MenuItem onClick={() => {
            if (menuJob) {
              // Capture the job type here — `handleMenuClose()` will clear `menuJob`,
              // and by the time the dialog confirms we still want to show the type
              // in the success/error notification.
              const jobType = menuJob.type;
              openFailJobDialog({
                job: menuJob,
                onFail: (jobKey, request) => handleFailJob(jobKey, request, jobType),
              });
            }
            handleMenuClose();
          }}>
            <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.fail')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};
