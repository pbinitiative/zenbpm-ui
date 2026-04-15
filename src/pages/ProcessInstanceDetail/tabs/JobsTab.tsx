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
import type { Job } from '../types';
import { JOB_STATE_COLORS } from '../types';
import { useCompleteJobDialog } from '../modals/useCompleteJobDialog';
import { useAssignJobDialog } from '../modals/useAssignJobDialog';
import { useUpdateRetriesDialog } from '@pages/ProcessInstanceDetail/modals/useUpdateRetriesDialog.ts';
import { useOutputDialog } from '@pages/DecisionInstanceDetail/components/useOutputDialog';
import { assignJob, completeJob, customInstance } from '@base/openapi';
import { MonoText } from "@components/MonoText";
import { formatDate } from "@components/DiagramDetailLayout/utils";
import type { ProcessInstanceNode } from '../types/tree';

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
  instanceTree: ProcessInstanceNode | null;
  jobsPage: number;
  jobsPageSize: number;
  setJobsPage: (page: number) => void;
  setJobsPageSize: (size: number) => void;
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

/** Walk the tree BFS and collect all nodes (root first) */
function collectNodes(root: ProcessInstanceNode): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

export const JobsTab = ({
  instanceTree,
  jobsPage,
  jobsPageSize,
  setJobsPage,
  setJobsPageSize,
  onRefetch,
  onShowNotification,
  onElementIdClick,
}: JobsTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);

  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { openCompleteJobDialog } = useCompleteJobDialog();
  const { openAssignJobDialog } = useAssignJobDialog();
  const { openUpdateRetriesDialog } = useUpdateRetriesDialog();
  const { openOutputDialog } = useOutputDialog({ title: t('common:fields.variables') });

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
        render: (row) => <MonoText>{row.key}</MonoText>,
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
          <Chip label={row.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
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
          <Typography variant="body2" color={row.retries === 0 ? 'error.main' : 'text.primary'}>
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
                <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          );
        },
      },
    ],
    [t, handleMenuOpen, openCompleteJobDialog, handleCompleteJob, openOutputDialog, onElementIdClick],
  );

  // Build sections from the server-fetched data — no client-side slicing.
  // Pagination is handled server-side: page changes trigger API refetch for all nodes.
  const { sections, flatData, totalCount } = useMemo(() => {
    if (!instanceTree) return { sections: undefined, flatData: [], totalCount: 0 };

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1).sort((a, b) => {
      const orderA = PROCESS_TYPE_ORDER[a.instance.processType ?? ''] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[b.instance.processType ?? ''] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.instance.key.localeCompare(b.instance.key);
    });
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
        onPageChange={setJobsPage}
        onPageSizeChange={(newSize) => { setJobsPageSize(newSize); setJobsPage(0); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        totalCount={totalCount}
        onElementIdClick={onElementIdClick}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        {menuJob?.type === 'user-task-type' && (
          <MenuItem onClick={() => { openAssignJobDialog({ job: menuJob, onAssign: handleAssignJob }); handleMenuClose(); }}>
            <ListItemIcon><PersonAddIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.assign')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { if (menuJob) openUpdateRetriesDialog({ job: menuJob, onUpdate: handleUpdateRetries }); handleMenuClose(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('processInstance:actions.updateRetries')}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};
