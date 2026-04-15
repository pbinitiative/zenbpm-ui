import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
import { DataTable, type Column, type SortOrder, type DataTableSection } from '@components/DataTable';
import { MonoText } from '@components/MonoText';
import { formatDate } from '@components/DiagramDetailLayout/utils';
import type { DecisionInstanceSummary } from '@base/openapi';
import type { ProcessInstanceNode } from '../types/tree';

// processType display order — same ordering used in JobsTab and IncidentsTab
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface DecisionInstancesTabProps {
  instanceTree: ProcessInstanceNode | null;
  decisionsPage: number;
  decisionsPageSize: number;
  setDecisionsPage: (page: number) => void;
  setDecisionsPageSize: (size: number) => void;
}

/** BFS walk — returns all nodes, root first */
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

export const DecisionInstancesTab = ({
  instanceTree,
  decisionsPage,
  decisionsPageSize,
  setDecisionsPage,
  setDecisionsPageSize,
}: DecisionInstancesTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.decisions, ns.processes]);
  const navigate = useNavigate();

  // Sort state (applied client-side within each section's already-loaded page)
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

  // Build sections from the server-fetched data — no client-side slicing.
  // Pagination is handled server-side: page changes trigger API refetch for all nodes.
  const { sections, flatData, totalCount } = useMemo(() => {
    if (!instanceTree) return { sections: undefined, flatData: [], totalCount: 0 };

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
    const orderedNodes = [rootNode, ...childNodes];

    const hasChildWithDecisions = childNodes.some(
      (n) => n.decisions.length > 0 || n.decisionsTotalCount > 0
    );

    // totalCount = max across all nodes so the paginator covers the largest section
    const maxTotal = Math.max(...orderedNodes.map((n) => n.decisionsTotalCount), 0);

    // Sort helper (client-side sort within the current page)
    const sortRows = (rows: DecisionInstanceSummary[]): DecisionInstanceSummary[] => {
      if (!sortBy) return rows;
      return [...rows].sort((a, b) => {
        const aVal = String(a[sortBy as keyof DecisionInstanceSummary] ?? '');
        const bVal = String(b[sortBy as keyof DecisionInstanceSummary] ?? '');
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    };

    if (!hasChildWithDecisions) {
      return { sections: undefined, flatData: sortRows(rootNode.decisions), totalCount: maxTotal };
    }

    // Sections path
    const result: DataTableSection<DecisionInstanceSummary>[] = [];
    for (const node of orderedNodes) {
      if (node.decisions.length === 0 && node.decisionsTotalCount === 0) continue;
      const isRoot = node === rootNode;
      const label = isRoot
        ? ''
        : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`;
      result.push({
        label,
        callPath: isRoot ? undefined : node.callPath,
        data: sortRows(node.decisions),
      });
    }

    return { sections: result.length > 0 ? result : undefined, flatData: [], totalCount: maxTotal };
  }, [instanceTree, sortBy, sortOrder, t]);

  const handleRowClick = (row: DecisionInstanceSummary) => {
    void navigate(`/decision-instances/${row.key}`);
  };

  return (
    <Box data-testid="decision-instances-tab">
      <DataTable
          columns={columns}
          data={flatData}
          sections={sections}
          rowKey="key"
          data-testid="decision-instances-table"
          page={decisionsPage}
          pageSize={decisionsPageSize}
          onPageChange={setDecisionsPage}
          onPageSizeChange={(newSize) => { setDecisionsPageSize(newSize); setDecisionsPage(0); }}
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
