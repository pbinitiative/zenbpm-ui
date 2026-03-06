import { Box } from '@mui/material';
import { StateBadge } from '@components/StateBadge';
import { MonoText } from '@components/MonoText';
import type { Column } from '@components/DataTable';
import type { ProcessInstance, ProcessDefinitionOption } from '../ProcessInstancesTable';

// Translation function type - ESLint validates keys via i18n-namespace-match rule
type TranslateFunction = (key: string) => string;

interface ColumnOptions {
  /** Whether to show the process column */
  showProcessColumn: boolean;
  /** Process definitions for looking up names */
  processDefinitions: ProcessDefinitionOption[];
}

export const getProcessInstanceColumns = (
  t: TranslateFunction,
  options: ColumnOptions
): Column<ProcessInstance>[] => {
  const { showProcessColumn, processDefinitions } = options;

  const columns: Column<ProcessInstance>[] = [
    {
      id: 'key',
      label: t('processes:fields.key'),
      sortable: true,
      render: (row) => <MonoText>{row.key}</MonoText>,
    },
  ];

  // Conditionally add process column
  if (showProcessColumn) {
    columns.push({
      id: 'bpmnProcessId',
      label: t('processes:fields.process'),
      sortable: true,
      render: (row: ProcessInstance) => {
        const processDef = processDefinitions.find(
          (pd) => pd.bpmnProcessId === row.bpmnProcessId
        );
        return processDef?.bpmnProcessName || row.bpmnProcessId || '-';
      },
    });
  }

  columns.push(
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
      sortable: true,
      render: (row) => row.processType ? t(`processes:types.${row.processType}`) : '-',
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
    }
  );

  return columns;
};

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}
