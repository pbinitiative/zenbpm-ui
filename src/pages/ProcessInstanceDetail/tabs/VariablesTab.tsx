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
import type { ProcessInstance } from '../types';

// Helper to safely stringify any value
const stringify = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return val.toString();
  }
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
  /** True when this variable belongs to a child/grandchild process (read-only) */
  readonly: boolean;
}

interface VariablesTabProps {
  processInstanceKey: string;
  variables: Record<string, unknown>;
  /** Direct child process instances — used to build per-child variable sections */
  childProcesses?: ProcessInstance[];
  /** Grandchild process instances keyed by direct child's process instance key */
  grandchildProcesses?: Record<string, ProcessInstance[]>;
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
}

// Translation function type - avoids strict i18n namespace key inference in inline renders
type T = (key: string, opts?: Record<string, unknown>) => string;

export const VariablesTab = ({
  processInstanceKey,
  variables,
  childProcesses = [],
  grandchildProcesses = {},
  onRefetch,
  onShowNotification,
}: VariablesTabProps) => {
  const { t: rawT } = useTranslation([ns.common, ns.processInstance, ns.processes]);
  const t = rawT as unknown as T;
  // confirm dialog hook via global Modals system
  const { openConfirm } = useConfirmDialog();
  const { openAddVariableDialog } = useAddVariableDialog();
  const { openEditVariableDialog } = useEditVariableDialog();

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

  // Convert a variables object to a Variable array.
  const toRows = useCallback(
    (vars: Record<string, unknown>, readonly: boolean): Variable[] =>
      Object.entries(vars).map(([name, value]) => ({
        name,
        value: stringify(value),
        rawValue: value,
        readonly,
      })),
    [],
  );

  // Root section rows
  const rootRows = useMemo(() => toRows(variables ?? {}, false), [variables, toRows]);

  // Build sections: root (no label) + one per child/grandchild that has variables,
  // sorted by processType order then lexicographically by key.
  const sections = useMemo<DataTableSection<Variable>[]>(() => {
    const result: DataTableSection<Variable>[] = [];

    if (rootRows.length > 0) {
      result.push({ label: '', data: rootRows });
    }

    // Collect all child+grandchild instances that have at least one variable
    const childEntries: Array<{ instanceKey: string; rows: Variable[] }> = [];

    for (const cp of childProcesses) {
      const vars = cp.variables as Record<string, unknown> | undefined;
      if (vars && Object.keys(vars).length > 0) {
        childEntries.push({ instanceKey: cp.key, rows: toRows(vars, true) });
      }
    }

    for (const grandchildren of Object.values(grandchildProcesses)) {
      for (const gc of grandchildren) {
        const vars = gc.variables as Record<string, unknown> | undefined;
        if (vars && Object.keys(vars).length > 0) {
          childEntries.push({ instanceKey: gc.key, rows: toRows(vars, true) });
        }
      }
    }

    // Sort by processType order, then lexicographically by key
    childEntries.sort(({ instanceKey: keyA }, { instanceKey: keyB }) => {
      const typeA = instanceByKey[keyA]?.processType ?? '';
      const typeB = instanceByKey[keyB]?.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });

    for (const { instanceKey, rows } of childEntries) {
      const instance = instanceByKey[instanceKey];
      const typeLabel = instance?.processType
        ? t(`processes:types.${instance.processType}`)
        : t('processInstance:fields.childProcess');
      result.push({ label: `${typeLabel}: ${instanceKey}`, data: rows });
    }

    return result;
  }, [rootRows, childProcesses, grandchildProcesses, instanceByKey, toRows, t]);

  // If no labeled sections, render flat; otherwise pass full sections array.
  const childSections = useMemo(() => sections.filter((s) => s.label !== ''), [sections]);

  const tableSections = useMemo<DataTableSection<Variable>[] | undefined>(() => {
    if (childSections.length === 0) return undefined;
    const rootSection = sections.find((s) => s.label === '');
    const result: DataTableSection<Variable>[] = [];
    if (rootSection && rootSection.data.length > 0) result.push(rootSection);
    result.push(...childSections);
    return result;
  }, [childSections, sections]);

  const tableData = useMemo<Variable[]>(
    () => (tableSections ? [] : rootRows),
    [tableSections, rootRows],
  );

  const totalCount = useMemo(
    () => sections.reduce((acc, s) => acc + s.data.length, 0),
    [sections],
  );

  const handleAddVariable = useCallback(async (name: string, value: unknown) => {
    try {
      const updatedVariables = { ...variables, [name]: value };
      await updateProcessInstanceVariables(processInstanceKey, { variables: updatedVariables });
      onShowNotification(t('processInstance:messages.variableAdded'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableAddFailed'), 'error');
    }
  }, [processInstanceKey, variables, onRefetch, onShowNotification, t]);

  const handleEditVariable = useCallback(async (name: string, value: unknown) => {
    try {
      const updatedVariables = { ...variables, [name]: value };
      await updateProcessInstanceVariables(processInstanceKey, { variables: updatedVariables });
      onShowNotification(t('processInstance:messages.variableUpdated'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableUpdateFailed'), 'error');
    }
  }, [processInstanceKey, variables, onRefetch, onShowNotification, t]);

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
          <Typography
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
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
                  if (ok) {
                    void handleDeleteVariable(row.name);
                  }
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
    [t, openConfirm, handleDeleteVariable, openEditVariableDialog, handleEditVariable]
  );

  return (
    <Box data-testid="variables-tab">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => openAddVariableDialog({ existingVariables: Object.keys(variables || {}), onAdd: handleAddVariable })}
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
        totalCount={totalCount}
        data-testid="variables-table"
      />
    </Box>
  );
};
