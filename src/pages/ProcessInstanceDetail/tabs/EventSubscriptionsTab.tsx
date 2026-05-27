import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Button, Chip, Link, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { type Column, type DataTableSection } from '@components/DataTable';
import { TableWithFilters } from '@components/TableWithFilters';
import type { FilterConfig, FilterValues } from '@components/TableWithFilters';
import { StateBadge } from '@components/StateBadge';
import { MonoText } from '@components/MonoText';
import { formatDate } from '@components/DiagramDetailLayout/utils';
import { publishMessage } from '@base/openapi';
import type { MessageSubscription, TimerSubscription, ErrorSubscription } from '@base/openapi';
import type { EventSubscriptionState } from '@base/openapi/generated-api/schemas/eventSubscriptionState';
import { useTriggerMessageDialog } from '../modals/useTriggerMessageDialog';
import type { ProcessInstanceNode } from '../types/tree';

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface EventSubscriptionsTabProps {
  instanceTree: ProcessInstanceNode | null;
  messageSubscriptionsState: EventSubscriptionState;
  messageSubscriptionsPage: number;
  messageSubscriptionsPageSize: number;
  setMessageSubscriptionsPage: (page: number) => void;
  setMessageSubscriptionsState: (state: EventSubscriptionState) => void;
  setMessageSubscriptionsPageSize: (size: number) => void;
  timerSubscriptionsPage: number;
  timerSubscriptionsPageSize: number;
  timerSubscriptionsState: EventSubscriptionState;
  setTimerSubscriptionsPage: (page: number) => void;
  setTimerSubscriptionsPageSize: (size: number) => void;
  errorSubscriptionsPage: number;
  errorSubscriptionsPageSize: number;
  setTimerSubscriptionsState: (state: EventSubscriptionState) => void;
  errorSubscriptionsState: EventSubscriptionState;
  setErrorSubscriptionsPage: (page: number) => void;
  setErrorSubscriptionsState: (state: EventSubscriptionState) => void;
  setErrorSubscriptionsPageSize: (size: number) => void;
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
  onElementIdClick?: (elementId: string) => void;
}

/** BFS walk — returns all nodes, root first, skipping non-root callActivity */
function collectNodes(root: ProcessInstanceNode): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) continue;
    if (!node.isRoot && node.instance.processType === 'callActivity') continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

/** Build sorted child nodes for section labelling (same order as JobsTab) */
function getSortedNodes(nodes: ProcessInstanceNode[]): ProcessInstanceNode[] {
  const [root, ...children] = nodes;
  const sorted = children.sort((a, b) => {
    const orderA = PROCESS_TYPE_ORDER[a.instance.processType ?? ''] ?? 99;
    const orderB = PROCESS_TYPE_ORDER[b.instance.processType ?? ''] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.instance.key.localeCompare(b.instance.key);
  });
  return [root, ...sorted];
}

const SectionHeader = ({ label, count }: { label: string; count: number }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    {count > 0 && (
      <Chip label={count} size="small" sx={{ height: 20, fontSize: 'caption.fontSize' }} />
    )}
  </Box>
);

export const EventSubscriptionsTab = ({
  instanceTree,
  messageSubscriptionsPage,
  messageSubscriptionsPageSize,
  messageSubscriptionsState,
  setMessageSubscriptionsPage,
  setMessageSubscriptionsPageSize,
  setMessageSubscriptionsState,
  timerSubscriptionsPage,
  timerSubscriptionsPageSize,
  timerSubscriptionsState,
  setTimerSubscriptionsPage,
  setTimerSubscriptionsPageSize,
  setTimerSubscriptionsState,
  errorSubscriptionsPage,
  errorSubscriptionsPageSize,
  errorSubscriptionsState,
  setErrorSubscriptionsPage,
  setErrorSubscriptionsPageSize,
  setErrorSubscriptionsState,
  onRefetch,
  onShowNotification,
  onElementIdClick,
}: EventSubscriptionsTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const { openTriggerMessageDialog } = useTriggerMessageDialog();

  const handleTriggerMessage = useCallback(
    async (messageName: string, correlationKey: string, variables: Record<string, unknown>) => {
      try {
        await publishMessage({ messageName, correlationKey, variables });
        onShowNotification(t('processInstance:messages.messageSent'), 'success');
        await onRefetch();
      } catch {
        onShowNotification(t('processInstance:messages.messageSendFailed'), 'error');
        throw new Error('trigger failed');
      }
    },
    [onRefetch, onShowNotification, t],
  );

  // ── Filter configs ────────────────────────────────────────────────────────

  const messageStateFilters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'state',
        type: 'select',
        label: t('processInstance:fields.state'),
        zone: 'exposed_first_line',
        options: [
          { value: 'active',    label: t('processInstance:eventSubscriptionStates.message.active'),    renderContent: <StateBadge state="active"    label={t('processInstance:eventSubscriptionStates.message.active')}    /> },
          { value: 'completed', label: t('processInstance:eventSubscriptionStates.message.completed'), renderContent: <StateBadge state="completed" label={t('processInstance:eventSubscriptionStates.message.completed')} /> },
          { value: 'withdrawn', label: t('processInstance:eventSubscriptionStates.message.withdrawn'), renderContent: <StateBadge state="withdrawn" label={t('processInstance:eventSubscriptionStates.message.withdrawn')} /> },
        ],
      } as FilterConfig,
    ],
    [t],
  );

  const timerStateFilters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'state',
        type: 'select',
        label: t('processInstance:fields.state'),
        zone: 'exposed_first_line',
        options: [
          { value: 'active',    label: t('processInstance:eventSubscriptionStates.timer.active'),    renderContent: <StateBadge state="active"   label={t('processInstance:eventSubscriptionStates.timer.active')}    /> },
          { value: 'completed', label: t('processInstance:eventSubscriptionStates.timer.completed'), renderContent: <StateBadge state="completed" label={t('processInstance:eventSubscriptionStates.timer.completed')} /> },
          { value: 'withdrawn', label: t('processInstance:eventSubscriptionStates.timer.withdrawn'), renderContent: <StateBadge state="canceled"  label={t('processInstance:eventSubscriptionStates.timer.withdrawn')} /> },
        ],
      } as FilterConfig,
    ],
    [t],
  );

  const errorStateFilters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'state',
        type: 'select',
        label: t('processInstance:fields.state'),
        zone: 'exposed_first_line',
        options: [
          { value: 'active',    label: t('processInstance:eventSubscriptionStates.error.active'),    renderContent: <StateBadge state="active"  label={t('processInstance:eventSubscriptionStates.error.active')}    /> },
          { value: 'withdrawn', label: t('processInstance:eventSubscriptionStates.error.withdrawn'), renderContent: <StateBadge state="canceled" label={t('processInstance:eventSubscriptionStates.error.withdrawn')} /> },
        ],
      } as FilterConfig,
    ],
    [t],
  );

  const handleMessageFilterChange = useCallback(
    (values: FilterValues) => {
      const state = values['state'] as EventSubscriptionState | undefined;
      setMessageSubscriptionsState(state ?? 'active');
      setMessageSubscriptionsPage(0);
    },
    [setMessageSubscriptionsState, setMessageSubscriptionsPage],
  );

  const handleTimerFilterChange = useCallback(
    (values: FilterValues) => {
      const state = values['state'] as EventSubscriptionState | undefined;
      setTimerSubscriptionsState(state ?? 'active');
      setTimerSubscriptionsPage(0);
    },
    [setTimerSubscriptionsState, setTimerSubscriptionsPage],
  );

  const handleErrorFilterChange = useCallback(
    (values: FilterValues) => {
      const state = values['state'] as EventSubscriptionState | undefined;
      setErrorSubscriptionsState(state ?? 'active');
      setErrorSubscriptionsPage(0);
    },
    [setErrorSubscriptionsState, setErrorSubscriptionsPage],
  );

  // ── Messages ─────────────────────────────────────────────────────────────

  const messageColumns: Column<MessageSubscription>[] = useMemo(
    () => [
      {
        id: 'messageName',
        label: t('processInstance:fields.messageName'),
        render: (row) => <MonoText>{row.messageName}</MonoText>,
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
        id: 'correlationKey',
        label: t('processInstance:fields.correlationKey'),
        render: (row) => <MonoText>{row.correlationKey || '-'}</MonoText>,
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        width: 120,
        render: (row) => <StateBadge state={row.state} />,
      },
      {
        id: 'actions',
        label: '',
        width: 120,
        render: (row) =>
          row.state === 'active' ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<SendIcon sx={{ fontSize: '1rem' }} />}
              onClick={(e) => {
                e.stopPropagation();
                openTriggerMessageDialog({
                  subscription: row,
                  onTrigger: handleTriggerMessage,
                });
              }}
              sx={{ textTransform: 'none', fontSize: 'caption.fontSize' }}
            >
              {t('processInstance:actions.trigger')}
            </Button>
          ) : null,
      },
    ],
    [t, openTriggerMessageDialog, handleTriggerMessage, onElementIdClick],
  );

  const { messageFlatData, messageSections, messageTotalCount, messagePaginationTotal } = useMemo(() => {
    if (!instanceTree) return { messageFlatData: [], messageSections: undefined, messageTotalCount: 0, messagePaginationTotal: 0 };

    const nodes = getSortedNodes(collectNodes(instanceTree));
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1);

    const hasChildWithData = childNodes.some((n) => n.messageSubscriptions.length > 0 || n.messageSubscriptionsTotalCount > 0);
    const sumTotal = nodes.reduce((acc, n) => acc + n.messageSubscriptionsTotalCount, 0);
    const maxTotal = Math.max(...nodes.map((n) => n.messageSubscriptionsTotalCount), 0);

    if (!hasChildWithData) {
      return { messageFlatData: rootNode.messageSubscriptions, messageSections: undefined, messageTotalCount: sumTotal, messagePaginationTotal: sumTotal };
    }

    const sections: DataTableSection<MessageSubscription>[] = [];
    for (const node of nodes) {
      if (node.messageSubscriptions.length === 0 && node.messageSubscriptionsTotalCount === 0) continue;
      const isRoot = node === rootNode;
      sections.push({
        label: isRoot ? '' : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`,
        callPath: isRoot ? undefined : node.callPath,
        data: node.messageSubscriptions,
      });
    }
    return { messageFlatData: [], messageSections: sections.length > 0 ? sections : undefined, messageTotalCount: sumTotal, messagePaginationTotal: maxTotal };
  }, [instanceTree, t]);

  // ── Timers ───────────────────────────────────────────────────────────────

  const timerColumns: Column<TimerSubscription>[] = useMemo(
    () => [
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
        id: 'dueDate',
        label: t('processInstance:fields.dueDate'),
        width: 180,
        render: (row) => <Typography variant="body2">{formatDate(row.dueDate)}</Typography>,
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        width: 120,
        render: (row) => <StateBadge state={row.state} />,
      },
    ],
    [t, onElementIdClick],
  );

  const { timerFlatData, timerSections, timerTotalCount, timerPaginationTotal } = useMemo(() => {
    if (!instanceTree) return { timerFlatData: [], timerSections: undefined, timerTotalCount: 0, timerPaginationTotal: 0 };

    const nodes = getSortedNodes(collectNodes(instanceTree));
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1);

    const hasChildWithData = childNodes.some((n) => n.timerSubscriptions.length > 0 || n.timerSubscriptionsTotalCount > 0);
    const sumTotal = nodes.reduce((acc, n) => acc + n.timerSubscriptionsTotalCount, 0);
    const maxTotal = Math.max(...nodes.map((n) => n.timerSubscriptionsTotalCount), 0);

    if (!hasChildWithData) {
      return { timerFlatData: rootNode.timerSubscriptions, timerSections: undefined, timerTotalCount: sumTotal, timerPaginationTotal: sumTotal };
    }

    const sections: DataTableSection<TimerSubscription>[] = [];
    for (const node of nodes) {
      if (node.timerSubscriptions.length === 0 && node.timerSubscriptionsTotalCount === 0) continue;
      const isRoot = node === rootNode;
      sections.push({
        label: isRoot ? '' : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`,
        callPath: isRoot ? undefined : node.callPath,
        data: node.timerSubscriptions,
      });
    }
    return { timerFlatData: [], timerSections: sections.length > 0 ? sections : undefined, timerTotalCount: sumTotal, timerPaginationTotal: maxTotal };
  }, [instanceTree, t]);

  // ── Errors ───────────────────────────────────────────────────────────────

  const errorColumns: Column<ErrorSubscription>[] = useMemo(
    () => [
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
        id: 'errorCode',
        label: t('processInstance:fields.errorCode'),
        render: (row) => (
          <MonoText>
            {row.errorCode ?? '-'}
          </MonoText>
        ),
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        width: 120,
        render: (row) => <StateBadge state={row.state} />,
      },
    ],
    [t, onElementIdClick],
  );

  const { errorFlatData, errorSections, errorTotalCount, errorPaginationTotal } = useMemo(() => {
    if (!instanceTree) return { errorFlatData: [], errorSections: undefined, errorTotalCount: 0, errorPaginationTotal: 0 };

    const nodes = getSortedNodes(collectNodes(instanceTree));
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1);

    const hasChildWithData = childNodes.some((n) => n.errorSubscriptions.length > 0 || n.errorSubscriptionsTotalCount > 0);
    const sumTotal = nodes.reduce((acc, n) => acc + n.errorSubscriptionsTotalCount, 0);
    const maxTotal = Math.max(...nodes.map((n) => n.errorSubscriptionsTotalCount), 0);

    if (!hasChildWithData) {
      return { errorFlatData: rootNode.errorSubscriptions, errorSections: undefined, errorTotalCount: sumTotal, errorPaginationTotal: sumTotal };
    }

    const sections: DataTableSection<ErrorSubscription>[] = [];
    for (const node of nodes) {
      if (node.errorSubscriptions.length === 0 && node.errorSubscriptionsTotalCount === 0) continue;
      const isRoot = node === rootNode;
      sections.push({
        label: isRoot ? '' : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`,
        callPath: isRoot ? undefined : node.callPath,
        data: node.errorSubscriptions,
      });
    }
    return { errorFlatData: [], errorSections: sections.length > 0 ? sections : undefined, errorTotalCount: sumTotal, errorPaginationTotal: maxTotal };
  }, [instanceTree, t]);

  return (
    <Box data-testid="event-subscriptions-tab">
      {/* Group 1 — Messages */}
      <SectionHeader
        label={t('processInstance:eventSubscriptions.messages')}
        count={messageTotalCount}
      />
      <TableWithFilters
        columns={messageColumns}
        rowKey="key"
        data-testid="message-subscriptions-table"
        filters={messageStateFilters}
        filterValues={{ state: messageSubscriptionsState }}
        onFilterChange={handleMessageFilterChange}
        tableConfig={{
          mode: 'simple',
          data: messageFlatData,
          sections: messageSections,
          totalCount: messagePaginationTotal,
          page: messageSubscriptionsPage,
          pageSize: messageSubscriptionsPageSize,
          onPageChange: setMessageSubscriptionsPage,
          onPageSizeChange: (size) => { setMessageSubscriptionsPageSize(size); setMessageSubscriptionsPage(0); },
        }}
      />

      {/* Group 2 — Timers */}
      <SectionHeader
        label={t('processInstance:eventSubscriptions.timers')}
        count={timerTotalCount}
      />
      <TableWithFilters
        columns={timerColumns}
        rowKey="key"
        data-testid="timer-subscriptions-table"
        filters={timerStateFilters}
        filterValues={{ state: timerSubscriptionsState }}
        onFilterChange={handleTimerFilterChange}
        tableConfig={{
          mode: 'simple',
          data: timerFlatData,
          sections: timerSections,
          totalCount: timerPaginationTotal,
          page: timerSubscriptionsPage,
          pageSize: timerSubscriptionsPageSize,
          onPageChange: setTimerSubscriptionsPage,
          onPageSizeChange: (size) => { setTimerSubscriptionsPageSize(size); setTimerSubscriptionsPage(0); },
        }}
      />

      {/* Group 3 — Errors */}
      <SectionHeader
        label={t('processInstance:eventSubscriptions.errors')}
        count={errorTotalCount}
      />
      <TableWithFilters
        columns={errorColumns}
        rowKey="key"
        data-testid="error-subscriptions-table"
        filters={errorStateFilters}
        filterValues={{ state: errorSubscriptionsState }}
        onFilterChange={handleErrorFilterChange}
        tableConfig={{
          mode: 'simple',
          data: errorFlatData,
          sections: errorSections,
          totalCount: errorPaginationTotal,
          page: errorSubscriptionsPage,
          pageSize: errorSubscriptionsPageSize,
          onPageChange: setErrorSubscriptionsPage,
          onPageSizeChange: (size) => { setErrorSubscriptionsPageSize(size); setErrorSubscriptionsPage(0); },
        }}
      />
    </Box>
  );
};
