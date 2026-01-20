import type { TFunction } from 'i18next';
import { MonoText } from '@components/MonoText';
import type { Column } from '@components/DataTable';
import type { DecisionInstanceSummary, DmnResourceDefinitionSimple } from '@base/openapi';

export interface ColumnOptions {
  /** Whether to show the decision definition column (hidden when filtering by specific definition) */
  showDecisionColumn?: boolean;
  /** Decision definitions for looking up names */
  decisionDefinitions?: Pick<DmnResourceDefinitionSimple, 'key' | 'dmnResourceDefinitionId' | 'name'>[];
}

export const getDecisionInstanceColumns = (
  t: TFunction,
  options: ColumnOptions = {}
): Column<DecisionInstanceSummary>[] => {
  const { showDecisionColumn = true, decisionDefinitions = [] } = options;

  const columns: Column<DecisionInstanceSummary>[] = [
    {
      id: 'key',
      label: t('decisions:fields.key'),
      sortable: true,
      render: (row) => <MonoText>{row.key}</MonoText>,
    },
  ];

  // Only show decision column when not filtering by specific definition
  if (showDecisionColumn) {
    columns.push({
      id: 'dmnResourceDefinitionId',
      label: t('decisions:fields.decisionId'),
      sortable: true,
      render: (row) => {
        // Try to find name from definitions list
        const def = decisionDefinitions.find((d) => d.dmnResourceDefinitionId === row.dmnResourceDefinitionId);
        return def?.name || row.dmnResourceDefinitionId;
      },
    });
  }

  columns.push(
    {
      id: 'evaluatedAt',
      label: t('decisions:fields.evaluatedAt'),
      sortable: true,
      render: (row) => {
        if (!row.evaluatedAt) return '-';
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(row.evaluatedAt));
      },
    },
    {
      id: 'inputCount',
      label: t('decisions:fields.inputs'),
      sortable: true,
      width: 80,
      align: 'center' as const,
      render: (row) => row.inputCount ?? '-',
    },
    {
      id: 'outputCount',
      label: t('decisions:fields.outputs'),
      sortable: true,
      width: 80,
      align: 'center' as const,
      render: (row) => row.outputCount ?? '-',
    }
  );

  return columns;
};
