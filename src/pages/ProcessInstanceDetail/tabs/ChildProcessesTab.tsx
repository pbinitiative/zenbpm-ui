import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
import { DataTable, type Column, type DataTableSection } from '@components/DataTable';
import { StateBadge } from '@components/StateBadge';
import { MonoText } from '@components/MonoText';
import type { ProcessInstance } from '../types';
import { formatDate } from '@/components/DiagramDetailLayout/utils';

// Translation function type - avoids strict i18n namespace key inference in inline renders
type T = (key: string) => string;

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

// Engine-internal process types that are not shown as standalone rows
const HIDDEN_PROCESS_TYPES = ['multiInstance', 'subprocess'];

interface ChildProcessesTabProps {
  /** Direct child process instances (already fetched by useInstanceData) */
  childProcesses?: ProcessInstance[];
  /** Grandchild process instances keyed by direct child's process instance key */
  grandchildProcesses?: Record<string, ProcessInstance[]>;
}

export const ChildProcessesTab = ({
  childProcesses = [],
  grandchildProcesses = {},
}: ChildProcessesTabProps) => {
  const { t: rawT } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const t = rawT as unknown as T;
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Flat lookup: instanceKey → ProcessInstance, covering direct children and grandchildren.
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

  // Build sections:
  // - Section 0 (no label): visible direct children
  // - One labeled section per direct child key that has visible grandchildren,
  //   sorted by processType order then lexicographically by key.
  const sections = useMemo<DataTableSection<ProcessInstance>[]>(() => {
    const result: DataTableSection<ProcessInstance>[] = [];

    const directChildren = childProcesses.filter(
      (cp) => !HIDDEN_PROCESS_TYPES.includes(cp.processType ?? ''),
    );
    if (directChildren.length > 0) {
      result.push({ label: '', data: directChildren });
    }

    const grandchildEntries = Object.entries(grandchildProcesses)
      .map(([parentKey, instances]) => ({
        parentKey,
        instances: instances.filter(
          (gc) => !HIDDEN_PROCESS_TYPES.includes(gc.processType ?? ''),
        ),
      }))
      .filter(({ instances }) => instances.length > 0);

    grandchildEntries.sort(({ parentKey: keyA }, { parentKey: keyB }) => {
      const typeA = instanceByKey[keyA]?.processType ?? '';
      const typeB = instanceByKey[keyB]?.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });

    for (const { parentKey, instances } of grandchildEntries) {
      const parent = instanceByKey[parentKey];
      const typeLabel = parent?.processType
        ? t(`processes:types.${parent.processType}`)
        : t('processInstance:fields.childProcess');
      result.push({ label: `${typeLabel}: ${parentKey}`, data: instances });
    }

    return result;
  }, [childProcesses, grandchildProcesses, instanceByKey, t]);

  // If no labeled sections exist, render a plain flat table (no section headers).
  // Otherwise pass the full sections array (including the unlabeled root section).
  const childSections = useMemo(
    () => sections.filter((s) => s.label !== ''),
    [sections],
  );

  const tableSections = useMemo<DataTableSection<ProcessInstance>[] | undefined>(() => {
    if (childSections.length === 0) return undefined;
    const rootSection = sections.find((s) => s.label === '');
    const result: DataTableSection<ProcessInstance>[] = [];
    if (rootSection && rootSection.data.length > 0) result.push(rootSection);
    result.push(...childSections);
    return result;
  }, [childSections, sections]);

  const tableData = useMemo<ProcessInstance[]>(
    () => (tableSections ? [] : (sections.find((s) => s.label === '')?.data ?? [])),
    [tableSections, sections],
  );

  const totalCount = useMemo(
    () => sections.reduce((acc, s) => acc + s.data.length, 0),
    [sections],
  );

  const columns: Column<ProcessInstance>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processes:fields.key'),
        sortable: true,
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'bpmnProcessId',
        label: t('processes:fields.process'),
        sortable: true,
        render: (row) => row.bpmnProcessId || '-',
      },
      {
        id: 'state',
        label: t('processes:fields.state'),
        sortable: true,
        width: 120,
        render: (row) => (
          <StateBadge state={row.state} label={t(`processes:states.${row.state}`)} />
        ),
      },
      {
        id: 'processType',
        label: t('processes:fields.type'),
        render: (row) => (row.processType ? t(`processes:types.${row.processType}`) : '-'),
      },
      {
        id: 'createdAt',
        label: t('processes:fields.createdAt'),
        sortable: true,
        render: (row) => formatDate(row.createdAt),
      },
      {
        id: 'activeElementInstances',
        label: t('processes:fields.activities'),
        render: (row) => {
          if (row.activeElementInstances.length === 0) {
            return (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                -
              </Box>
            );
          }
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {row.activeElementInstances.slice(0, 2).map((ei) => (
                <MonoText key={ei.elementInstanceKey}>{ei.elementId}</MonoText>
              ))}
              {row.activeElementInstances.length > 2 && (
                <MonoText>+{row.activeElementInstances.length - 2}</MonoText>
              )}
            </Box>
          );
        },
      },
    ],
    [t],
  );

  return (
    <Box data-testid="child-processes-tab">
      <DataTable
        data-testid="child-processes-table"
        columns={columns}
        data={tableData}
        sections={tableSections}
        rowKey="key"
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        totalCount={totalCount}
        onRowClick={(row) => void navigate(`/process-instances/${row.key}`)}
      />
    </Box>
  );
};
