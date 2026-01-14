import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
import { MonoText } from '@components/MonoText';
import { DataTable, type Column } from '@components/DataTable';
import type { DecisionInstanceSummary } from '@base/openapi';
import { getDecisionInstances } from '@base/openapi';

interface DecisionInstancesTableProps {
  dmnResourceDefinitionKey?: string;
}

export const DecisionInstancesTable = ({ dmnResourceDefinitionKey }: DecisionInstancesTableProps) => {
  const { t } = useTranslation([ns.common, ns.decisions]);
  const navigate = useNavigate();

  const [instances, setInstances] = useState<DecisionInstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch instances
  useEffect(() => {
    const fetchInstances = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number | boolean | undefined> = {
          page: 1,
          size: 50,
        };
        if (dmnResourceDefinitionKey) {
          params.dmnResourceDefinitionKey = dmnResourceDefinitionKey;
        }
        const data = await getDecisionInstances(params);
        const allItems = data.partitions?.flatMap((p) => p.items) || [];
        setInstances(allItems);
      } catch (error) {
        console.error('Failed to fetch decision instances:', error);
        setInstances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstances();
  }, [dmnResourceDefinitionKey]);

  // Column definitions
  const columns: Column<DecisionInstanceSummary>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('decisions:fields.key'),
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'dmnResourceDefinitionId',
        label: t('decisions:fields.decisionId'),
      },
      {
        id: 'evaluatedAt',
        label: t('decisions:fields.evaluatedAt'),
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
        label: 'Inputs',
        width: 80,
        align: 'center' as const,
        render: (row) => row.inputCount ?? '-',
      },
      {
        id: 'outputCount',
        label: 'Outputs',
        width: 80,
        align: 'center' as const,
        render: (row) => row.outputCount ?? '-',
      },
    ],
    [t]
  );

  const handleRowClick = useCallback(
    (row: DecisionInstanceSummary) => {
      navigate(`/decision-instances/${row.key}`);
    },
    [navigate]
  );

  return (
    <Box>
      <DataTable
        columns={columns}
        data={instances}
        rowKey="key"
        loading={loading}
        onRowClick={handleRowClick}
      />
    </Box>
  );
};
