import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  TableWithFilters,
  type FilterValues,
  type FilterOption,
} from '@components/TableWithFilters';
import type { PartitionedResponse } from '@components/PartitionedTable';
import { getDecisionInstanceColumns } from './table/columns';
import { getDecisionInstanceFilters } from './table/filters';
import {
  getDecisionInstances,
  getDmnResourceDefinitions,
  type DecisionInstanceSummary,
  type DmnResourceDefinitionSimple,
} from '@base/openapi';

// Re-export for consumers
export type { DecisionInstanceSummary };

// Decision definition type for the filter dropdown
export type DecisionDefinitionOption = Pick<DmnResourceDefinitionSimple, 'key' | 'dmnResourceDefinitionId' | 'name'>;

export interface DecisionInstancesTableProps {
  /** Fixed DMN resource definition key - when set, instances are filtered by this key and the decision filter is hidden */
  dmnResourceDefinitionKey?: string;
  /** External filter values - when provided, the component is controlled */
  filterValues?: FilterValues;
  /** Callback when filter values change */
  onFilterChange?: (filters: FilterValues) => void;
  /** Key to trigger data refresh */
  refreshKey?: number;
  /** Whether to sync filters with URL */
  syncWithUrl?: boolean;
}

export const DecisionInstancesTable = ({
  dmnResourceDefinitionKey,
  filterValues: externalFilterValues,
  onFilterChange: externalOnFilterChange,
  refreshKey: externalRefreshKey = 0,
  syncWithUrl = true,
}: DecisionInstancesTableProps) => {
  const { t } = useTranslation([ns.common, ns.decisions]);
  const navigate = useNavigate();
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const [decisionDefinitions, setDecisionDefinitions] = useState<DecisionDefinitionOption[]>([]);

  const refreshKey = externalRefreshKey || internalRefreshKey;

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filters: FilterValues) => {
      externalOnFilterChange?.(filters);
    },
    [externalOnFilterChange]
  );

  // Load decision definitions for the filter dropdown (only when not fixed to a single definition)
  useEffect(() => {
    if (dmnResourceDefinitionKey) return; // Skip if locked to specific definition

    const loadDecisionDefinitions = async () => {
      try {
        const data = await getDmnResourceDefinitions({ onlyLatest: true, size: 100 });
        setDecisionDefinitions(
          (data.items || []).map((dd) => ({
            key: dd.key,
            dmnResourceDefinitionId: dd.dmnResourceDefinitionId,
            name: dd.name,
          }))
        );
      } catch (error) {
        console.error('Failed to load decision definitions:', error);
      }
    };
    void loadDecisionDefinitions();
  }, [dmnResourceDefinitionKey]);

  // Convert decision definitions to filter options
  const decisionOptions: FilterOption[] = useMemo(() => {
    return decisionDefinitions.map((dd) => ({
      value: dd.dmnResourceDefinitionId,
      label: dd.name || dd.dmnResourceDefinitionId,
    }));
  }, [decisionDefinitions]);

  // Fetch decision instances data using API service
  const fetchData = useCallback(
    async (params: {
      page: number;
      size: number;
      filters?: FilterValues;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }): Promise<PartitionedResponse<DecisionInstanceSummary>> => {
      // Build API params
      const apiParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        size: params.size,
      };

      // Add fixed DMN resource definition key filter
      if (dmnResourceDefinitionKey) {
        apiParams.dmnResourceDefinitionKey = dmnResourceDefinitionKey;
      }

      // Add filters
      if (params.filters?.search && typeof params.filters.search === 'string') {
        apiParams.search = params.filters.search;
      }
      if (params.filters?.dmnResourceDefinitionId && typeof params.filters.dmnResourceDefinitionId === 'string') {
        apiParams.dmnResourceDefinitionId = params.filters.dmnResourceDefinitionId;
      }
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

      // Return partitioned response
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
    [dmnResourceDefinitionKey, refreshKey]
  );

  // Get columns from extracted definition
  const columns = useMemo(
    () =>
      getDecisionInstanceColumns(t, {
        showDecisionColumn: !dmnResourceDefinitionKey,
        decisionDefinitions,
      }),
    [t, dmnResourceDefinitionKey, decisionDefinitions]
  );

  // Get filters from extracted definition
  const filters = useMemo(
    () =>
      getDecisionInstanceFilters(t, {
        showDecisionFilter: !dmnResourceDefinitionKey,
        decisionOptions,
      }),
    [t, dmnResourceDefinitionKey, decisionOptions]
  );

  // Handlers
  const handleRowClick = useCallback(
    (row: DecisionInstanceSummary) => {
      void navigate(`/decision-instances/${row.key}`);
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    setInternalRefreshKey((k) => k + 1);
  }, []);

  return (
    <TableWithFilters
      columns={columns}
      rowKey="key"
      tableConfig={{
        mode: 'partitioned',
        fetchData,
        onRefresh: handleRefresh,
      }}
      filters={filters}
      filterValues={externalFilterValues}
      onFilterChange={handleFilterChange}
      onRowClick={handleRowClick}
      refreshKey={refreshKey}
      serverSideSorting
      syncWithUrl={syncWithUrl}
      syncSortingWithUrl={syncWithUrl}
      data-testid="decision-instances-table"
    />
  );
};
