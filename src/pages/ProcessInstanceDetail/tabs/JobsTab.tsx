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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import { DataTable, type Column, type SortOrder } from '@components/DataTable';
import type { Job } from '../types';
import { JOB_STATE_COLORS } from '../types';
import { CompleteJobDialog } from '../modals/CompleteJobDialog';
import { AssignJobDialog } from '../modals/AssignJobDialog';
import { UpdateRetriesDialog } from '../modals/UpdateRetriesDialog';
import { completeJobByKey, assignJob, customInstance } from '@base/openapi';

// updateJobRetries is not in generated API, use direct axios call
const updateJobRetries = async (jobKey: number, retries: number): Promise<void> => {
  await customInstance({ url: `/jobs/${jobKey}/retries`, method: 'POST', data: { retries } });
};

interface JobsTabProps {
  jobs: Job[];
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
}

export const JobsTab = ({ jobs, onRefetch, onShowNotification }: JobsTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Dialog state
  const [completeDialogJob, setCompleteDialogJob] = useState<Job | null>(null);
  const [assignDialogJob, setAssignDialogJob] = useState<Job | null>(null);
  const [updateRetriesDialogJob, setUpdateRetriesDialogJob] = useState<Job | null>(null);

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

  const handleCompleteJob = useCallback(async (jobKey: number, variables: Record<string, unknown>) => {
    try {
      await completeJobByKey(jobKey, { variables });
      onShowNotification(t('processInstance:messages.jobCompleted'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.jobCompleteFailed'), 'error');
    }
    setCompleteDialogJob(null);
  }, [onRefetch, onShowNotification, t]);

  const handleAssignJob = useCallback(async (jobKey: number, assignee: string) => {
    try {
      await assignJob(jobKey, { assignee });
      onShowNotification(t('processInstance:messages.jobAssigned'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.jobAssignFailed'), 'error');
    }
    setAssignDialogJob(null);
  }, [onRefetch, onShowNotification, t]);

  const handleUpdateRetries = useCallback(async (jobKey: number, retries: number) => {
    try {
      await updateJobRetries(jobKey, retries);
      onShowNotification(t('processInstance:messages.retriesUpdated'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.retriesUpdateFailed'), 'error');
    }
    setUpdateRetriesDialogJob(null);
  }, [onRefetch, onShowNotification, t]);

  const columns: Column<Job>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processInstance:fields.key'),
        sortable: true,
        width: 180,
        render: (row) => (
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"SF Mono", Monaco, monospace',
              fontSize: '0.75rem',
            }}
          >
            {row.key}
          </Typography>
        ),
      },
      {
        id: 'elementId',
        label: t('processInstance:fields.elementId'),
        sortable: true,
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.elementName || row.elementId}</Typography>
            {row.elementName && (
              <Typography variant="caption" color="text.secondary">
                {row.elementId}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'type',
        label: t('processInstance:fields.jobType'),
        sortable: true,
        width: 120,
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
          const isUserTask = row.type === 'user-task';

          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {isActive && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompleteDialogJob(row);
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
    [t, handleMenuOpen]
  );

  return (
    <Box>
      <DataTable
        columns={columns}
        data={jobs}
        rowKey="key"
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
        totalCount={jobs.length}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {menuJob?.type === 'user-task' && (
          <MenuItem
            onClick={() => {
              setAssignDialogJob(menuJob);
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
            setUpdateRetriesDialogJob(menuJob);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('processInstance:actions.updateRetries')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      {completeDialogJob && (
        <CompleteJobDialog
          open={true}
          job={completeDialogJob}
          onClose={() => setCompleteDialogJob(null)}
          onComplete={handleCompleteJob}
        />
      )}
      {assignDialogJob && (
        <AssignJobDialog
          open={true}
          job={assignDialogJob}
          onClose={() => setAssignDialogJob(null)}
          onAssign={handleAssignJob}
        />
      )}
      {updateRetriesDialogJob && (
        <UpdateRetriesDialog
          open={true}
          job={updateRetriesDialogJob}
          onClose={() => setUpdateRetriesDialogJob(null)}
          onUpdate={handleUpdateRetries}
        />
      )}
    </Box>
  );
};

// Helper function for date formatting
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}
