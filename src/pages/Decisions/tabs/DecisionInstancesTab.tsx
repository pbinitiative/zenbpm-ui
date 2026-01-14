import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
import { MonoText } from '@components/MonoText';
import {
  TableWithFilters,
  type FilterConfig,
  type FilterValues,
  type FilterOption,
  type SimpleFilterConfig,
} from '@components/TableWithFilters';
import type { PartitionedResponse } from '@components/PartitionedTable';
import type { Column } from '@components/DataTable';
import type { DecisionInstanceSummary } from '@base/openapi';
import { getDecisionInstances, getDmnResourceDefinitions } from '@base/openapi';

interface DecisionInstancesTabProps {
  refreshKey?: number;
}

export const DecisionInstancesTab = ({ refreshKey = 0 }: DecisionInstancesTabProps) => {
  const { t } = useTranslation([ns.common, ns.decisions]);
  const navigate = useNavigate();
  const [decisionOptions, setDecisionOptions] = useState<FilterOption[]>([]);

  // State
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: '',
  });

  // Load decision definitions for the filter dropdown
  useEffect(() => {
    const loadDecisionDefinitions = async () => {
      try {
        const data = await getDmnResourceDefinitions({ size: 100, onlyLatest: true });
        setDecisionOptions(
          (data.items || []).map((dd) => ({
            value: dd.dmnResourceDefinitionId,
            label: dd.name || dd.dmnResourceDefinitionId,
          }))
        );
      } catch (error) {
        console.error('Failed to load decision definitions:', error);
      }
    };
    loadDecisionDefinitions();
  }, []);

  // Fetch decision instances data using API service
  const fetchData = useCallback(
    async (params: {
      page: number;
      size: number;
      filters?: FilterValues;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }): Promise<PartitionedResponse<DecisionInstanceSummary>> => {
      const apiParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        size: params.size,
      };

      // Add search filter
      if (params.filters?.search && typeof params.filters.search === 'string') {
        apiParams.search = params.filters.search;
      }

      // Add decision definition filter
      if (params.filters?.dmnResourceDefinitionId && typeof params.filters.dmnResourceDefinitionId === 'string') {
        apiParams.dmnResourceDefinitionId = params.filters.dmnResourceDefinitionId;
      }

      // Add date range filter
      if (params.filters?.evaluatedAt && typeof params.filters.evaluatedAt === 'object') {
        const evaluatedAt = params.filters.evaluatedAt as { from?: string; to?: string };
        if (evaluatedAt.from) {
          apiParams.evaluatedFrom = evaluatedAt.from;
        }
        if (evaluatedAt.to) {
          apiParams.evaluatedTo = evaluatedAt.to;
        }
      }

      // Add sorting
      if (params.sortBy) {
        apiParams.sortBy = params.sortBy;
        apiParams.sortOrder = params.sortOrder || 'asc';
      }

      const data = await getDecisionInstances(apiParams);

      return {
        partitions: data.partitions?.map((p) => ({
          partition: p.partition,
          count: p.count,
          items: p.items || [],
        })) || [],
        page: data.page,
        size: data.size,
        count: data.count,
        totalCount: data.totalCount,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  // Column definitions
  const columns: Column<DecisionInstanceSummary>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('decisions:fields.key'),
        sortable: true,
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'dmnResourceDefinitionId',
        label: t('decisions:fields.decisionId'),
        sortable: true,
      },
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
        label: 'Inputs',
        sortable: true,
        width: 80,
        align: 'center' as const,
        render: (row) => row.inputCount ?? '-',
      },
      {
        id: 'outputCount',
        label: 'Outputs',
        sortable: true,
        width: 80,
        align: 'center' as const,
        render: (row) => row.outputCount ?? '-',
      },
    ],
    [t]
  );

  // Filter configuration
  const filters: FilterConfig[] = useMemo(() => {
    const baseFilters: FilterConfig[] = [
      {
        id: 'search',
        label: t('common:search.label'),
        type: 'text',
        zone: 'exposed_first_line',
        align: 'right',
        placeholder: t('decisions:filters.searchPlaceholder'),
        width: 250,
      },
    ];

    // Hideable filters
    const hideableItems: SimpleFilterConfig[] = [
      {
        id: 'dmnResourceDefinitionId',
        type: 'select',
        label: t('decisions:fields.decisionDefinition'),
        options: decisionOptions,
        searchable: true,
      },
      {
        id: 'evaluatedAt',
        label: t('decisions:fields.evaluatedAt'),
        type: 'dateRange',
        colSpan: 2,
      },
    ];

    baseFilters.push({
      id: 'filterGroup',
      type: 'group',
      zone: 'hideable',
      columns: 3,
      items: hideableItems,
    });

    return baseFilters;
  }, [t, decisionOptions]);

  // Handlers
  const handleRowClick = useCallback((row: DecisionInstanceSummary) => {
    navigate(`/decision-instances/${row.key}`);
  }, [navigate]);

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilterValues(newFilters);
  }, []);

  return (
    <Box>
      <TableWithFilters
        columns={columns}
        rowKey="key"
        tableConfig={{
          mode: 'partitioned',
          fetchData,
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onRowClick={handleRowClick}
        refreshKey={refreshKey}
        serverSideSorting
        syncWithUrl
        syncSortingWithUrl
        data-testid="decision-instances-table"
      />
    </Box>
  );
};
