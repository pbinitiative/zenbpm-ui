import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
import { DataTable, type Column, type SortOrder, type DataTableSection } from '@components/DataTable';
import { MonoText } from '@components/MonoText';
import { formatDate } from '@components/DiagramDetailLayout/utils';
import type { DecisionInstanceSummary } from '@base/openapi';
import type { ProcessInstance } from '../types';

// processType display order — same ordering used in JobsTab and HistoryTab
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface DecisionInstancesTabProps {
  decisionInstances: DecisionInstanceSummary[];
  childProcessDecisionInstances: Record<string, DecisionInstanceSummary[]>;
  /** Child process instances — used to label sections with processType and key. */
  childProcesses?: ProcessInstance[];
  /** Grandchild process instances keyed by direct-child instance key. */
  grandchildProcesses?: Record<string, ProcessInstance[]>;
}

export const DecisionInstancesTab = ({
  decisionInstances,
  childProcessDecisionInstances,
  childProcesses = [],
  grandchildProcesses = {},
}: DecisionInstancesTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.decisions, ns.processes]);
  const navigate = useNavigate();

  // Build a flat lookup: instanceKey → ProcessInstance for all children/grandchildren
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

  // Build sections: first section is the main instance (no header), then one per child/grandchild
  const sections = useMemo<DataTableSection<DecisionInstanceSummary>[]>(() => {
    const result: DataTableSection<DecisionInstanceSummary>[] = [];

    // Section 0 — root instance decisions (rendered without a header label)
    if (decisionInstances.length > 0) {
      result.push({ label: '', data: decisionInstances });
    }

    // Remaining sections — one per child process key that has decisions, sorted by processType then key
    const childEntries = Object.entries(childProcessDecisionInstances).filter(
      ([, list]) => list.length > 0
    );

    childEntries.sort(([keyA], [keyB]) => {
      const typeA = instanceByKey[keyA]?.processType ?? '';
      const typeB = instanceByKey[keyB]?.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });

    for (const [instanceKey, list] of childEntries) {
      const instance = instanceByKey[instanceKey];
      const typeLabel = instance?.processType
        ? t(`processes:types.${instance.processType}`)
        : t('processInstance:fields.childProcess');
      const label = `${typeLabel}: ${instanceKey}`;
      result.push({ label, data: list });
    }

    return result;
  }, [decisionInstances, childProcessDecisionInstances, instanceByKey, t]);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('evaluatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const columns: Column<DecisionInstanceSummary>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('decisions:fields.key'),
        sortable: true,
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'dmnResourceDefinitionKey',
        label: t('decisions:fields.decisionDefinition'),
        sortable: true,
        render: (row) => <MonoText>{row.dmnResourceDefinitionKey}</MonoText>,
      },
      {
        id: 'evaluatedAt',
        label: t('decisions:fields.evaluatedAt'),
        sortable: true,
        render: (row) => formatDate(row.evaluatedAt),
      },
    ],
    [t]
  );

  // Total count across all sections
  const totalCount = useMemo(
    () => sections.reduce((acc, s) => acc + s.data.length, 0),
    [sections]
  );

  // Split into unlabelled root section (passed as `data`) and labelled child sections
  const mainDecisions = useMemo(
    () => sections.find((s) => s.label === '')?.data ?? [],
    [sections]
  );
  const childSections = useMemo(
    () => sections.filter((s) => s.label !== ''),
    [sections]
  );

  const tableSections = useMemo<DataTableSection<DecisionInstanceSummary>[] | undefined>(() => {
    if (childSections.length === 0) return undefined;
    const result: DataTableSection<DecisionInstanceSummary>[] = [];
    if (mainDecisions.length > 0) result.push({ label: '', data: mainDecisions });
    result.push(...childSections);
    return result;
  }, [childSections, mainDecisions]);

  const tableData = useMemo(
    () => (tableSections ? [] : mainDecisions),
    [tableSections, mainDecisions]
  );

  const handleRowClick = (row: DecisionInstanceSummary) => {
    void navigate(`/decision-instances/${row.key}`);
  };

  return (
    <Box data-testid="decision-instances-tab">
      <DataTable
        columns={columns}
        data={tableData}
        sections={tableSections}
        rowKey="key"
        data-testid="decision-instances-table"
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
        onRowClick={handleRowClick}
      />
    </Box>
  );
};
