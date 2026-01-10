import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { DataTable, type Column } from '@components/DataTable';
import { AddVariableDialog } from '../modals/AddVariableDialog';
import { EditVariableDialog } from '../modals/EditVariableDialog';
import { DeleteVariableDialog } from '../modals/DeleteVariableDialog';
import { updateProcessInstanceVariables, deleteProcessInstanceVariable } from '@base/openapi';

interface Variable {
  name: string;
  value: string;
  rawValue: unknown;
}

interface VariablesTabProps {
  processInstanceKey: string;
  variables: Record<string, unknown>;
  onRefetch: () => Promise<void>;
  onShowNotification: (message: string, severity: 'success' | 'error') => void;
}

export const VariablesTab = ({
  processInstanceKey,
  variables,
  onRefetch,
  onShowNotification,
}: VariablesTabProps) => {
  const { t } = useTranslation();

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editVariable, setEditVariable] = useState<Variable | null>(null);
  const [deleteVariable, setDeleteVariable] = useState<Variable | null>(null);

  // Convert variables object to array for table display
  const variablesArray: Variable[] = useMemo(() => {
    if (!variables) return [];
    return Object.entries(variables).map(([name, value]) => ({
      name,
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
      rawValue: value,
    }));
  }, [variables]);

  const handleAddVariable = useCallback(async (name: string, value: unknown) => {
    try {
      const updatedVariables = { ...variables, [name]: value };
      await updateProcessInstanceVariables((processInstanceKey as unknown) as number, { variables: updatedVariables });
      onShowNotification(t('processInstance:messages.variableAdded'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableAddFailed'), 'error');
    }
    setAddDialogOpen(false);
  }, [processInstanceKey, variables, onRefetch, onShowNotification, t]);

  const handleEditVariable = useCallback(async (name: string, value: unknown) => {
    try {
      const updatedVariables = { ...variables, [name]: value };
      await updateProcessInstanceVariables((processInstanceKey as unknown) as number, { variables: updatedVariables });
      onShowNotification(t('processInstance:messages.variableUpdated'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableUpdateFailed'), 'error');
    }
    setEditVariable(null);
  }, [processInstanceKey, variables, onRefetch, onShowNotification, t]);

  const handleDeleteVariable = useCallback(async (name: string) => {
    try {
      await deleteProcessInstanceVariable((processInstanceKey as unknown) as number, name);
      onShowNotification(t('processInstance:messages.variableDeleted'), 'success');
      await onRefetch();
    } catch {
      onShowNotification(t('processInstance:messages.variableDeleteFailed'), 'error');
    }
    setDeleteVariable(null);
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
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEditVariable(row);
              }}
              title={t('common:actions.edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteVariable(row);
              }}
              title={t('common:actions.delete')}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          size="small"
        >
          {t('processInstance:actions.addVariable')}
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={variablesArray}
        rowKey="name"
        totalCount={variablesArray.length}
      />

      {/* Dialogs */}
      <AddVariableDialog
        open={addDialogOpen}
        existingVariables={Object.keys(variables || {})}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddVariable}
      />
      {editVariable && (
        <EditVariableDialog
          open={true}
          variable={editVariable}
          onClose={() => setEditVariable(null)}
          onSave={handleEditVariable}
        />
      )}
      {deleteVariable && (
        <DeleteVariableDialog
          open={true}
          variableName={deleteVariable.name}
          onClose={() => setDeleteVariable(null)}
          onDelete={handleDeleteVariable}
        />
      )}
    </Box>
  );
};
