import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Link, Typography } from '@mui/material';
import { DataTable, type Column, type DataTableSection } from '@components/DataTable';
import type { FlowElementHistory, ProcessInstance } from '../types';
import { formatDate } from '@/components/DiagramDetailLayout/utils';

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface HistoryTabProps {
  /** History entries for the root process instance. */
  history: FlowElementHistory[];
  /** History entries for all child process instances (flat). */
  childProcessHistory?: FlowElementHistory[];
  /** Child process instances — used to label sections. */
  childProcesses?: ProcessInstance[];
  /** Grandchild process instances keyed by direct-child instance key. */
  grandchildProcesses?: Record<string, ProcessInstance[]>;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

export const HistoryTab = ({
  history,
  childProcessHistory = [],
  childProcesses = [],
  grandchildProcesses = {},
  onElementIdClick,
}: HistoryTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Flat lookup: instanceKey → ProcessInstance
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

  // Group child history entries by their processInstanceKey, then build
  // labelled sections sorted by processType order.
  const sections = useMemo<DataTableSection<FlowElementHistory>[] | undefined>(() => {
    if (childProcessHistory.length === 0) return undefined;

    // Group child entries by owning instance key
    const grouped = new Map<string, FlowElementHistory[]>();
    for (const entry of childProcessHistory) {
      const key = entry.processInstanceKey;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(entry);
    }

    // Sort child instance keys by processType then key
    const sortedKeys = [...grouped.keys()].sort((a, b) => {
      const typeA = instanceByKey[a]?.processType ?? '';
      const typeB = instanceByKey[b]?.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    const result: DataTableSection<FlowElementHistory>[] = [];

    // Root section — no header
    if (history.length > 0) {
      result.push({ label: '', data: history });
    }

    // Child sections — labelled
    for (const instanceKey of sortedKeys) {
      const instance = instanceByKey[instanceKey];
      const typeLabel = instance?.processType
        ? t(`processes:types.${instance.processType}`)
        : t('processInstance:fields.childProcess');
      result.push({ label: `${typeLabel}: ${instanceKey}`, data: grouped.get(instanceKey)! });
    }

    return result;
  }, [history, childProcessHistory, instanceByKey, t]);

  const columns: Column<FlowElementHistory>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processInstance:fields.key'),
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
        width: 100,
        render: (row) => row.state || '-',
      },
      {
        id: 'createdAt',
        label: t('processInstance:fields.createdAt'),
        width: 160,
        render: (row) => formatDate(row.createdAt),
      },
      {
        id: 'completedAt',
        label: t('processInstance:fields.completedAt'),
        width: 160,
        render: (row) => (row.completedAt ? formatDate(row.completedAt) : '-'),
      },
    ],
    [t, onElementIdClick]
  );

  const totalCount = history.length + childProcessHistory.length;

  return (
    <DataTable
      columns={columns}
      data={sections ? [] : history}
      sections={sections}
      rowKey="key"
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      totalCount={totalCount}
      data-testid="history-table"
    />
  );
};

