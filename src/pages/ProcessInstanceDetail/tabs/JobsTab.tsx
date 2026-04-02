import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { DataTable, type Column, type SortOrder, type DataTableSection } from '@components/DataTable';
import type { Job, ProcessInstance } from '../types';
import { JOB_STATE_COLORS } from '../types';
import { useCompleteJobDialog } from '../modals/useCompleteJobDialog';
import { useAssignJobDialog } from '../modals/useAssignJobDialog';
import { useUpdateRetriesDialog } from '@pages/ProcessInstanceDetail/modals/useUpdateRetriesDialog.ts';
import { useOutputDialog } from '@pages/DecisionInstanceDetail/components/useOutputDialog';
import { assignJob, completeJob, customInstance } from '@base/openapi';
import { MonoText } from "@components/MonoText";
import { formatDate } from "@components/DiagramDetailLayout/utils";

// updateJobRetries is not in generated API, use direct axios call
const updateJobRetries = async (jobKey: string, retries: number): Promise<void> => {
  await customInstance({ url: `/jobs/${jobKey}/retries`, method: 'POST', data: { retries } });
};

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface JobsTabProps {
  jobs: Job[];
  childProcessJobs?: Record<string, Job[]>;
  /** Child process instances — used to label sections with processType and key. */
  childProcesses?: ProcessInstance[];
  /** Grandchild process instances keyed by direct-child instance key. */
  grandchildProcesses?: Record<string, ProcessInstance[]>;
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

export const JobsTab = ({
  jobs,
  childProcessJobs = {},
  childProcesses = [],
  grandchildProcesses = {},
  onRefetch,
  onShowNotification,
  onElementIdClick,
}: JobsTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);

  // Build a flat lookup: instanceKey → ProcessInstance, covering both direct
  // children and subprocess-grandchildren (the only grandchildren whose jobs
  // are fetched).
  const instanceByKey = useMemo<Record<string, ProcessInstance>>(() => {
    const map: Record<string, ProcessInstance> = {};
    for (const cp of childProcesses) {
      map[cp.key] = cp;
    }
    for (const grandchildren of Object.values(grandchildProcesses)) {
      for (const gc of grandchildren) {
        map[gc.key] = gc;
      }
    }
    return map;
  }, [childProcesses, grandchildProcesses]);

  // Build sections: first section is the main instance (no header), then one
  // section per child/grandchild process key that has jobs.
  const sections = useMemo<DataTableSection<Job>[]>(() => {
    const result: DataTableSection<Job>[] = [];

    // Section 0 — main instance jobs (rendered without a header label)
    if (jobs.length > 0) {
      result.push({ label: '', data: jobs });
    }

    // Remaining sections — one per child process key, sorted by processType then key
    const childEntries = Object.entries(childProcessJobs).filter(([, jobList]) => jobList.length > 0);

    childEntries.sort(([keyA], [keyB]) => {
      const typeA = instanceByKey[keyA]?.processType ?? '';
      const typeB = instanceByKey[keyB]?.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });

    for (const [instanceKey, jobList] of childEntries) {
      const instance = instanceByKey[instanceKey];
      const typeLabel = instance?.processType
        ? t(`processes:types.${instance.processType}`)
        : t('processInstance:fields.childProcess');
      const label = `${typeLabel}: ${instanceKey}`;
      result.push({ label, data: jobList });
    }

    return result;
  }, [jobs, childProcessJobs, instanceByKey, t]);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Dialog state
  const { openCompleteJobDialog } = useCompleteJobDialog();
  const { openAssignJobDialog } = useAssignJobDialog();
  const { openUpdateRetriesDialog } = useUpdateRetriesDialog();
  const { openOutputDialog } = useOutputDialog({ title: t('common:fields.variables') });

  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuJob, setMenuJob] = useState<Job | null>(null);

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

  const handleUpdateRetries = useCallback(async (jobKey: string, retries: number) => {
    try {
      await updateJobRetries(jobKey, retries);
      onShowNotification(t('processInstance:messages.retriesUpdated'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.retriesUpdateFailed'), 'error');
    }
  }, [onRefetch, onShowNotification, t]);

  const columns: Column<Job>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processInstance:fields.key'),
        sortable: true,
        width: 180,
        render: (row) => (
          <MonoText>{row.key}</MonoText>
        ),
      },
      {
        id: 'variables',
        label: t('common:fields.variables'),
        sortable: true,
        width: 150,
        render: (row) => {
          const { ZEN_FORM: _, ...displayVariables } = row.variables ?? {};
          const value = JSON.stringify(displayVariables);
          return (
            <Tooltip title="Click to view" placement="top-start">
              <Typography
                variant="body2"
                onClick={() => openOutputDialog({ output: displayVariables })}
                sx={{
                  fontFamily: '"SF Mono", Monaco, monospace',
                  display: 'block',
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.7 },
                }}
              >
                {value}
              </Typography>
            </Tooltip>
          );
        },
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
          <Chip
            label={row.type}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
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
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          ),
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        sortable: true,
        width: 100,
        render: (row) => (
          <Chip
            label={t(`processInstance:jobStates.${row.state}`)}
            size="small"
            sx={{
              bgcolor: JOB_STATE_COLORS[row.state] || 'grey.500',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        ),
      },
      {
        id: 'retries',
        label: t('processInstance:fields.retries'),
        width: 80,
        render: (row) => (
          <Typography
            variant="body2"
            color={row.retries === 0 ? 'error.main' : 'text.primary'}
          >
            {row.retries ?? '-'}
          </Typography>
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
          const isActive = row.state === 'activatable' || row.state === 'activated' || row.state === 'active';
          const isUserTask = row.type === 'user-task-type';

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
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {t('processInstance:actions.complete')}
                </Button>
              )}
              {(isActive || isUserTask) && (
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, row)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          );
        },
      },
    ],
    [
      t,
      handleMenuOpen,
      openCompleteJobDialog,
      handleCompleteJob,
      openOutputDialog,
      onElementIdClick,
    ]);

  // Derive the flat list for totalCount (sections may omit empty ones)
  const totalCount = useMemo(
    () => sections.reduce((acc, s) => acc + s.data.length, 0),
    [sections]
  );

  // Only pass sections with a label; the main instance section (label='') is
  // rendered without a header — we pass it as plain `data` and the labelled
  // child sections via `sections`.
  const mainJobs = useMemo(
    () => sections.find((s) => s.label === '')?.data ?? [],
    [sections]
  );
  const childSections = useMemo(
    () => sections.filter((s) => s.label !== ''),
    [sections]
  );

  // Build the final sections array passed to DataTable:
  // If there are child sections, we use the sections prop so headers appear.
  // Main jobs are prepended as an unlabelled section only when mixing with
  // labelled ones (otherwise a single flat table is cleaner).
  const tableSections = useMemo<DataTableSection<Job>[] | undefined>(() => {
    if (childSections.length === 0) return undefined;
    const result: DataTableSection<Job>[] = [];
    if (mainJobs.length > 0) result.push({ label: '', data: mainJobs });
    result.push(...childSections);
    return result;
  }, [childSections, mainJobs]);

  const tableData = useMemo(
    () => (tableSections ? [] : mainJobs),
    [tableSections, mainJobs]
  );

  return (
    <Box data-testid="jobs-tab">
      <DataTable
        columns={columns}
        data={tableData}
        sections={tableSections}
        rowKey="key"
        data-testid="jobs-table"
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        totalCount={totalCount}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {menuJob?.type === 'user-task-type' && (
          <MenuItem
            onClick={() => {
              openAssignJobDialog({ job: menuJob, onAssign: handleAssignJob });
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('processInstance:actions.assign')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (menuJob) {
              openUpdateRetriesDialog({ job: menuJob, onUpdate: handleUpdateRetries });
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('processInstance:actions.updateRetries')}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

