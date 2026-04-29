import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
import { ClientSideDataTable, type Column, type DataTableSection } from '@components/DataTable';
import { StateBadge } from '@components/StateBadge';
import { MonoText } from '@components/MonoText';
import type { ProcessInstance } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
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
  instanceTree: ProcessInstanceNode | null;
}

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

export const ChildProcessesTab = ({
  instanceTree,
}: ChildProcessesTabProps) => {
  const { t: rawT } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const t = rawT as unknown as T;
  const navigate = useNavigate();

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
          if (!row.activeElementInstances?.length) {
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

  // Build sections: root node's visible children in an unlabelled section;
  // then one labelled section per non-root node that has visible children.
  // All data comes from Phase 1 of the tree fetch (up to CHILDREN_PAGE_SIZE per
  // node). ClientSideDataTable handles display pagination entirely in memory.
  const { sections, flatData } = useMemo(() => {
    if (!instanceTree) {
      return { sections: undefined, flatData: [] };
    }

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];

    // Non-root nodes sorted by processType then key
    const nonRootNodes = nodes.slice(1).sort((a, b) => {
      const typeA = a.instance.processType ?? '';
      const typeB = b.instance.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.instance.key.localeCompare(b.instance.key);
    });

    // Visible children of root (callActivity and default; exclude multiInstance/subprocess wrappers)
    const rootVisibleChildren = rootNode.children.filter(
      (c) => !HIDDEN_PROCESS_TYPES.includes(c.instance.processType ?? ''),
    );

    // Non-root nodes that have at least one visible child
    const nonRootWithChildren = nonRootNodes.filter((n) =>
      n.children.some((c) => !HIDDEN_PROCESS_TYPES.includes(c.instance.processType ?? ''))
    );

    if (nonRootWithChildren.length === 0) {
      return { sections: undefined, flatData: rootVisibleChildren.map((c) => c.instance) };
    }

    const result: DataTableSection<ProcessInstance>[] = [];

    if (rootVisibleChildren.length > 0) {
      result.push({ label: '', data: rootVisibleChildren.map((c) => c.instance) });
    }

    for (const node of nonRootWithChildren) {
      const visibleChildren = node.children.filter(
        (c) => !HIDDEN_PROCESS_TYPES.includes(c.instance.processType ?? ''),
      );
      const typeLabel = node.instance.processType
        ? t(`processes:types.${node.instance.processType}`)
        : t('processInstance:fields.childProcess');
      result.push({
        label: `${typeLabel}: ${node.instance.key}`,
        callPath: node.callPath,
        data: visibleChildren.map((c) => c.instance),
      });
    }

    return { sections: result.length > 0 ? result : undefined, flatData: [] };
  }, [instanceTree, t]);

  return (
    <Box data-testid="child-processes-tab">
      <ClientSideDataTable
        data-testid="child-processes-table"
        columns={columns}
        data={flatData}
        sections={sections}
        rowKey="key"
        defaultPageSize={10}
        onRowClick={(row) => void navigate(`/process-instances/${row.key}`)}
      />
    </Box>
  );
};
