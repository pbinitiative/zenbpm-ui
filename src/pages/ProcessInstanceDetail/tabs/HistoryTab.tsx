import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { IOSSwitch } from '@components/IOSSwitch';
import {
  type Column,
  type DataTableSection,
  ClientSideDataTable
} from '@components/DataTable';
import { StateBadge } from '@components/StateBadge';
import type { FlowElementHistory } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
import { formatDate, formatDuration } from '@/components/DiagramDetailLayout/utils';
import { useInputOutputDialog } from '@components/InputOutputDialog';
import { VariablesBadgeCell } from '../components/VariablesBadgeCell';
import type { GetHistorySortBy } from '@base/openapi/generated-api/schemas/getHistorySortBy';
import type { GetHistorySortOrder } from '@base/openapi/generated-api/schemas/getHistorySortOrder';
import { MonoText } from '@/components/MonoText';

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface HistoryTabProps {
  instanceTree: ProcessInstanceNode | null;
  historySortBy: GetHistorySortBy;
  historySortOrder: GetHistorySortOrder;
  onSortChange: (sortBy: GetHistorySortBy, sortOrder: GetHistorySortOrder) => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
  onNavigateToJobs?: (elementInstanceKey: string) => void;
  onNavigateToEvents?: (elementInstanceKey: string) => void;
  focusedElementInstanceKey?: string;
  autoNavigateToFocusedRow?: boolean;
  onFocusedRowVisible?: () => void;
}

const JOB_ELEMENT_TYPES = new Set([
  'BUSINESS_RULE_TASK',
  'SERVICE_TASK',
  'USER_TASK',
]);
const EVENT_ELEMENT_TYPES = new Set([
  'INTERMEDIATE_CATCH_EVENT',
  'INTERMEDIATE_THROW_EVENT',
  'BOUNDARY_EVENT',
  'INTERMEDIATE_MESSAGE_THROW_EVENT',
  'RECEIVE_TASK',
  `EVENT_BASED_GATEWAY`,
]);

const normalizeElementType = (elementType: string) =>
  elementType
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replaceAll('-', '_')
    .toUpperCase();

const canLinkToJob = (row: FlowElementHistory) =>
  JOB_ELEMENT_TYPES.has(normalizeElementType(row.elementType));
const canLinkToEvent = (row: FlowElementHistory) =>
  EVENT_ELEMENT_TYPES.has(normalizeElementType(row.elementType));

/** BFS walk — returns all nodes, root first */
function collectNodes(root: ProcessInstanceNode): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

export const HistoryTab = ({
  instanceTree,
  onElementIdClick,
  onNavigateToJobs,
  onNavigateToEvents,
  focusedElementInstanceKey,
  autoNavigateToFocusedRow = false,
  onFocusedRowVisible,
}: HistoryTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const { openInputOutputDialog } = useInputOutputDialog();
  const [showSequenceFlows, setShowSequenceFlows] = useState(false);

  // Filter history — hide SEQUENCE_FLOW elements by default.
  const filterHistory = useCallback(
    (history: FlowElementHistory[]) =>
      showSequenceFlows
        ? history
        : history.filter((h) => h.elementType !== 'SEQUENCE_FLOW'),
    [showSequenceFlows],
  );
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuHistory, setMenuHistory] = useState<FlowElementHistory | null>(null);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, history: FlowElementHistory) => {
      event.stopPropagation();
      setMenuAnchorEl(event.currentTarget);
      setMenuHistory(history);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    setMenuHistory(null);
  }, []);

  // Build sections from the tree: root section unlabelled, child sections labelled.
  const { sections, flatData } = useMemo(() => {
    if (!instanceTree) return { sections: undefined, flatData: [] };

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1).sort((a, b) => {
      const typeA = a.instance.processType ?? '';
      const typeB = b.instance.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.instance.key.localeCompare(b.instance.key);
    });

    const hasChildWithHistory = childNodes.some((n) => n.history.length > 0);

    if (!hasChildWithHistory) {
      // No child sections — render flat for a cleaner single-paginator experience
      return { sections: undefined, flatData: filterHistory(rootNode.history) };
    }

    const orderedNodes = [rootNode, ...childNodes];
    const result: DataTableSection<FlowElementHistory>[] = [];

    for (const node of orderedNodes) {
      const filteredHistory = filterHistory(node.history);
      if (filteredHistory.length === 0) continue;

      const isRoot = node.instance.key === instanceTree.instance.key;
      let label = '';
      if (!isRoot) {
        const typeLabel = node.instance.processType
          ? t(`processes:types.${node.instance.processType}`)
          : t('processInstance:fields.childProcess');
        label = `${typeLabel}: ${node.instance.key}`;
      }

      result.push({ label, callPath: isRoot ? undefined : node.callPath, data: filteredHistory });
    }

    return { sections: result.length > 0 ? result : undefined, flatData: [] };
  }, [instanceTree, t, filterHistory]);

  const columns: Column<FlowElementHistory>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processInstance:fields.key'),
        width: 180,
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'variables',
        label: t('processInstance:fields.activityInputOutput'),
        width: 200,
        render: (row) => (
          <VariablesBadgeCell
            inputVariables={row.inputVariables}
            outputVariables={row.outputVariables}
            excludeFromInputKeys={['ZEN_FORM']}
            onOpenDialog={(inputVariables, outputVariables) =>
              openInputOutputDialog({
                data: {
                  title: t('processInstance:fields.activityInputOutput'),
                  subtitle: t('processInstance:fields.activityInputOutputSubtitle'),
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
        render: (row) => (
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
              fontFamily: '"SF Mono", Monaco, monospace',
              fontSize: '0.75rem',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {row.elementId}
          </Link>
        ),
        width: 150,
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        width: 110,
        render: (row) => {
          // The API does not return a `state` field on flow element history —
          // derive it from completedAt. completedAt present => 'completed',
          // otherwise the element is still 'active'.
          const state = row.completedAt ? 'completed' : 'active';
          return (
            <StateBadge
              state={state}
              label={t(`processInstance:historyStates.${state}`)}
            />
          );
        },
      },
      {
        id: 'createdAt',
        label: t('processInstance:fields.createdAt'),
        width: 160,
        render: (row) => formatDate(row.createdAt),
        sortable: true,
      },
      {
        id: 'duration',
        label: t('processInstance:fields.duration'),
        width: 140,
        render: (row) => (row.completedAt ? formatDuration(row.createdAt, row.completedAt) : '-'),
      },
      {
        id: 'actions',
        label: '',
        width: 56,
        render: (row) => {
          if (!canLinkToJob(row) && !canLinkToEvent(row)) return null;
          return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                size="small"
                aria-label={t('processInstance:actions.rowActions')}
                onClick={(event) => handleMenuOpen(event, row)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [t, onElementIdClick, handleMenuOpen, openInputOutputDialog]
  );

  const toolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <FormControlLabel
        control={
          <IOSSwitch
            checked={showSequenceFlows}
            onChange={(_, checked) => setShowSequenceFlows(checked)}
          />
        }
        label={t('processInstance:filters.includeSequenceFlows')}
        labelPlacement={'end'}
        sx={{
          ml: 0,
          gap: 1,
          '& .MuiFormControlLabel-label': {
            fontSize: '0.875rem',
          },
        }}
      />
    </Box>
  );

  return (
    <>
      <ClientSideDataTable
        columns={columns}
        data={flatData}
        sections={sections}
        rowKey="key"
        data-testid="history-table"
        toolbar={toolbar}
        onElementIdClick={onElementIdClick}
        focusedRowKey={focusedElementInstanceKey}
        getRowFocusKey={(row) => row.key}
        autoNavigateToFocusedRow={autoNavigateToFocusedRow}
        onFocusedRowVisible={onFocusedRowVisible}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        {menuHistory && canLinkToJob(menuHistory) && (
          <MenuItem
            onClick={() => {
              onNavigateToJobs?.(menuHistory.key);
              handleMenuClose();
            }}
          >
            <ListItemIcon><WorkOutlineIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.viewRelatedJob')}</ListItemText>
          </MenuItem>
        )}
        {menuHistory && canLinkToEvent(menuHistory) && (
          <MenuItem
            onClick={() => {
              onNavigateToEvents?.(menuHistory.key);
              handleMenuClose();
            }}
          >
            <ListItemIcon><EventAvailableIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('processInstance:actions.viewRelatedEvent')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
