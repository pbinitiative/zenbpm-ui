import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Link, Typography } from '@mui/material';
import { ClientSideDataTable, type Column, type DataTableSection } from '@components/DataTable';
import type { FlowElementHistory } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
import { formatDate } from '@/components/DiagramDetailLayout/utils';

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface HistoryTabProps {
  instanceTree: ProcessInstanceNode | null;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

/** BFS walk — returns all nodes, root first */
function collectNodes(root: ProcessInstanceNode): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

export const HistoryTab = ({
  instanceTree,
  onElementIdClick,
}: HistoryTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);

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
      return { sections: undefined, flatData: rootNode.history };
    }

    const orderedNodes = [rootNode, ...childNodes];
    const result: DataTableSection<FlowElementHistory>[] = [];

    for (const node of orderedNodes) {
      if (node.history.length === 0) continue;

      const isRoot = node.instance.key === instanceTree.instance.key;
      let label = '';
      if (!isRoot) {
        const typeLabel = node.instance.processType
          ? t(`processes:types.${node.instance.processType}`)
          : t('processInstance:fields.childProcess');
        label = `${typeLabel}: ${node.instance.key}`;
      }

      result.push({ label, callPath: isRoot ? undefined : node.callPath, data: node.history });
    }

    return { sections: result.length > 0 ? result : undefined, flatData: [] };
  }, [instanceTree, t]);

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
        sortable: true,
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

  return (
    <ClientSideDataTable
      columns={columns}
      data={flatData}
      sections={sections}
      rowKey="key"
      defaultSortBy="createdAt"
      defaultSortOrder="asc"
      data-testid="history-table"
      onElementIdClick={onElementIdClick}
    />
  );
};
