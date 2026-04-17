import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, type Column, type DataTableSection } from '@components/DataTable';
import { useAddVariableDialog } from '../modals/useAddVariableDialog';
import { useEditVariableDialog } from '../modals/useEditVariableDialog';
import { updateProcessInstanceVariables, deleteProcessInstanceVariable } from '@base/openapi';
import { useConfirmDialog } from '@components/ConfirmDialog';
import type { ProcessInstanceNode } from '../types/tree';

// Helper to safely stringify any value for display
const stringify = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') return val.toString();
  if (typeof val === 'symbol') return val.toString();
  if (typeof val === 'function') return '[Function]';
  return '';
};

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

interface Variable {
  name: string;
  value: string;
  rawValue: unknown;
  /** The process instance key that owns this variable */
  instanceKey: string;
  /** True when this variable belongs to a child/grandchild process (read-only) */
  readonly: boolean;
}

interface VariablesTabProps {
  instanceTree: ProcessInstanceNode | null;
  variablesPage: number;
  variablesPageSize: number;
  setVariablesPage: (page: number) => void;
  setVariablesPageSize: (size: number) => void;
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
  /** Called when a breadcrumb element ID is clicked in a section header. */
  onElementIdClick?: (elementId: string) => void;
}

// Translation function type - avoids strict i18n namespace key inference in inline renders
type T = (key: string, opts?: Record<string, unknown>) => string;

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

export const VariablesTab = ({
  instanceTree,
  variablesPage,
  variablesPageSize,
  setVariablesPage,
  setVariablesPageSize,
  onRefetch,
  onShowNotification,
  onElementIdClick,
}: VariablesTabProps) => {
  const { t: rawT } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const t = rawT as unknown as T;
  const { openConfirm } = useConfirmDialog();
  const { openAddVariableDialog } = useAddVariableDialog();
  const { openEditVariableDialog } = useEditVariableDialog();

  const processInstanceKey = instanceTree?.instance.key ?? '';
  const rootVariables = useMemo(
    () => (instanceTree?.instance.variables ?? {}) as Record<string, unknown>,
    [instanceTree?.instance.variables],
  );

  // Convert a node's variableEntries to display rows.
  const toRows = useCallback(
    (node: ProcessInstanceNode, isReadonly: boolean): Variable[] =>
      node.variableEntries.map(({ name, value }) => ({
        name,
        value: stringify(value),
        rawValue: value,
        instanceKey: node.instance.key,
        readonly: isReadonly,
      })),
    [],
  );

  // Build sections from the pre-sliced data already prepared by useInstanceData.
  const { tableSections, tableData, totalCount } = useMemo(() => {
    if (!instanceTree) return { tableSections: undefined, tableData: [], totalCount: 0 };

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1).sort((a, b) => {
      const orderA = PROCESS_TYPE_ORDER[a.instance.processType ?? ''] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[b.instance.processType ?? ''] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.instance.key.localeCompare(b.instance.key);
    });

    const displaySubProcessVariablesAsReadOnly =
      import.meta.env.VITE_DISPLAY_SUBPROCESS_VARIABLES_AS_READONLY === 'true';

    const hasChildWithVariables = childNodes.some((n) => n.variablesTotalCount > 0);

    // totalCount = max across all nodes so the paginator spans the largest section
    const orderedNodes = [rootNode, ...childNodes];
    const maxTotal = Math.max(...orderedNodes.map((n) => n.variablesTotalCount), 0);

    if (!hasChildWithVariables) {
      return {
        tableSections: undefined,
        tableData: toRows(rootNode, false),
        totalCount: rootNode.variablesTotalCount,
      };
    }

    // Sectioned path — data is already page-sliced by useInstanceData
    const sections: DataTableSection<Variable>[] = [];
    for (const node of orderedNodes) {
      if (node.variablesTotalCount === 0) continue;
      const isRoot = node === rootNode;
      const label = isRoot
        ? ''
        : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`;
      sections.push({
        label,
        callPath: isRoot ? undefined : node.callPath,
        data: toRows(node, !isRoot && displaySubProcessVariablesAsReadOnly),
      });
    }

    return {
      tableSections: sections.length > 0 ? sections : undefined,
      tableData: [],
      totalCount: maxTotal,
    };
  }, [instanceTree, toRows, t]);

  // Full variables map per instance key — used by the edit handler (needs the complete set)
  const instanceVarsByKey = useMemo<Record<string, Record<string, unknown>>>(() => {
    if (!instanceTree) return {};
    const map: Record<string, Record<string, unknown>> = {};
    for (const node of collectNodes(instanceTree)) {
      map[node.instance.key] = (node.instance.variables as Record<string, unknown>) ?? {};
    }
    return map;
  }, [instanceTree]);

  const handleAddVariable = useCallback(async (name: string, value: unknown) => {
    try {
      await updateProcessInstanceVariables(processInstanceKey, { variables: { ...rootVariables, [name]: value } });
      onShowNotification(t('processInstance:messages.variableAdded'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableAddFailed'), 'error');
    }
  }, [processInstanceKey, rootVariables, onRefetch, onShowNotification, t]);

  const handleEditVariable = useCallback(async (name: string, value: unknown, instanceKey: string) => {
    try {
      const currentVars = instanceVarsByKey[instanceKey] ?? {};
      await updateProcessInstanceVariables(instanceKey, { variables: { ...currentVars, [name]: value } });
      onShowNotification(t('processInstance:messages.variableUpdated'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableUpdateFailed'), 'error');
    }
  }, [instanceVarsByKey, onRefetch, onShowNotification, t]);

  const handleDeleteVariable = useCallback(async (name: string) => {
    try {
      await deleteProcessInstanceVariable(processInstanceKey, name);
      onShowNotification(t('processInstance:messages.variableDeleted'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableDeleteFailed'), 'error');
    }
  }, [processInstanceKey, onRefetch, onShowNotification, t]);

  const columns: Column<Variable>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('processInstance:fields.variableName'),
        width: 200,
        render: (row) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
        ),
      },
      {
        id: 'value',
        label: t('processInstance:fields.variableValue'),
        render: (row) => (
          <Tooltip title={row.value} placement="top-start">
            <Typography
              variant="body2"
              sx={{
                fontFamily: '"SF Mono", Monaco, monospace',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.value}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: 'actions',
        label: '',
        width: 100,
        render: (row) => {
          if (row.readonly) return null;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditVariableDialog({ variable: row, onSave: handleEditVariable });
                }}
                title={t('common:actions.edit')}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await openConfirm({
                    title: t('processInstance:dialogs.deleteVariable.title'),
                    message: t('processInstance:dialogs.deleteVariable.confirmation', { name: row.name }),
                    confirmText: t('common:actions.delete'),
                    cancelText: t('common:actions.cancel'),
                    confirmColor: 'error',
                    maxWidth: 'xs',
                  });
                  if (ok) void handleDeleteVariable(row.name);
                }}
                title={t('common:actions.delete')}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [t, openConfirm, handleDeleteVariable, openEditVariableDialog, handleEditVariable],
  );

  return (
    <Box data-testid="variables-tab">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => openAddVariableDialog({
            existingVariables: Object.keys(rootVariables),
            onAdd: handleAddVariable,
          })}
          size="small"
          data-testid="add-variable-button"
        >
          {t('processInstance:actions.addVariable')}
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={tableData}
        sections={tableSections}
        rowKey="name"
        data-testid="variables-table"
        page={variablesPage}
        pageSize={variablesPageSize}
        onPageChange={setVariablesPage}
        onPageSizeChange={(newSize) => { setVariablesPageSize(newSize); setVariablesPage(0); }}
        totalCount={totalCount}
        onElementIdClick={onElementIdClick}
      />
    </Box>
  );
};
