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
import { getProcessInstanceColumns } from './table/columns';
import { getProcessInstanceFilters } from './table/filters';
import {
  getProcessInstances,
  getProcessDefinitions,
  type ProcessInstance,
  type ProcessDefinitionSimple,
} from '@base/openapi';

// Re-export for consumers
export type { ProcessInstance };

// Process definition type for the filter dropdown (subset of ProcessDefinitionSimple)
export type ProcessDefinitionOption = Pick<ProcessDefinitionSimple, 'key' | 'bpmnProcessId' | 'bpmnProcessName' | 'version'>;

export interface ProcessInstancesTableProps {
  /** Fixed process definition key - when set, instances are filtered by this key and the process filter is hidden */
  processDefinitionKey?: string;
  /** Activity IDs available for filtering (typically extracted from BPMN) */
  activityIds?: string[];
  /** External filter values - when provided, the component is controlled */
  filterValues?: FilterValues;
  /** Callback when filter values change */
  onFilterChange?: (filters: FilterValues) => void;
  /** Key to trigger data refresh */
  refreshKey?: number;
  /** Whether to sync filters with URL */
  syncWithUrl?: boolean;
  /** Selected activity from diagram click - will be set as activityId filter */
  selectedActivityId?: string;
  /** Callback when activity filter changes (for syncing with diagram highlight) */
  onActivityFilterChange?: (activityId: string | undefined) => void;
}

export const ProcessInstancesTable = ({
  processDefinitionKey,
  activityIds = [],
  filterValues: externalFilterValues,
  onFilterChange: externalOnFilterChange,
  refreshKey: externalRefreshKey = 0,
  syncWithUrl = true,
  selectedActivityId: _selectedActivityId,
  onActivityFilterChange,
}: ProcessInstancesTableProps) => {
  // Note: _selectedActivityId is not used directly - the table reads activityId from URL via syncWithUrl.
  // The prop exists for API consistency; the page uses it to sync diagram highlighting.
  const { t } = useTranslation([ns.common]);
  const navigate = useNavigate();
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const [processDefinitions, setProcessDefinitions] = useState<ProcessDefinitionOption[]>([]);

  const refreshKey = externalRefreshKey || internalRefreshKey;

  // Handle filter changes - notify parent when activityId changes
  const handleFilterChange = useCallback(
    (filters: FilterValues) => {
      externalOnFilterChange?.(filters);

      // Notify parent of activity filter changes for diagram sync
      const newActivityId = typeof filters.activityId === 'string' ? filters.activityId : undefined;
      onActivityFilterChange?.(newActivityId || undefined);
    },
    [externalOnFilterChange, onActivityFilterChange]
  );


  // Load process definitions for the filter dropdown (only when not fixed to a single definition)
  useEffect(() => {
    if (processDefinitionKey) return; // Skip if locked to specific definition

    const loadProcessDefinitions = async () => {
      try {
        const data = await getProcessDefinitions({ onlyLatest: true, size: 100 });
        setProcessDefinitions(
          (data.items || []).map((pd) => ({
            key: pd.key,
            bpmnProcessId: pd.bpmnProcessId,
            bpmnProcessName: pd.bpmnProcessName,
            version: pd.version,
          }))
        );
      } catch (error) {
        console.error('Failed to load process definitions:', error);
      }
    };
    void loadProcessDefinitions();
  }, [processDefinitionKey]);

  // Convert process definitions to filter options
  const processOptions: FilterOption[] = useMemo(() => {
    return processDefinitions.map((pd) => ({
      value: pd.bpmnProcessId,
      label: pd.bpmnProcessName || pd.bpmnProcessId,
    }));
  }, [processDefinitions]);

  // Fetch process instances data using API service
  const fetchData = useCallback(
    async (params: {
      page: number;
      size: number;
      filters?: FilterValues;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }): Promise<PartitionedResponse<ProcessInstance>> => {
      // Build API params
      const apiParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        size: params.size,
      };

      // Add fixed process definition key filter
      if (processDefinitionKey) {
        apiParams.processDefinitionKey = processDefinitionKey;
      }

      // Add filters
      if (params.filters?.state && typeof params.filters.state === 'string') {
        apiParams.state = params.filters.state;
      }
      if (params.filters?.bpmnProcessId && typeof params.filters.bpmnProcessId === 'string') {
        apiParams.bpmnProcessId = params.filters.bpmnProcessId;
      }
      if (params.filters?.search && typeof params.filters.search === 'string') {
        apiParams.search = params.filters.search;
      }
      if (params.filters?.activityId && typeof params.filters.activityId === 'string') {
        apiParams.activityId = params.filters.activityId;
      }
      if (params.filters?.createdAt && typeof params.filters.createdAt === 'object') {
        const createdAt = params.filters.createdAt as { from?: string; to?: string };
        // Dates are already in ISO format from DateRangePicker
        if (createdAt.from) {
          apiParams.createdFrom = createdAt.from;
        }
        if (createdAt.to) {
          apiParams.createdTo = createdAt.to;
        }
      }

      // Add sorting
      if (params.sortBy) {
        apiParams.sortBy = params.sortBy;
        apiParams.sortOrder = params.sortOrder || 'asc';
      }

      const data = await getProcessInstances(apiParams);

      // Data is already in the correct ProcessInstance format from the API
      return {
        partitions: data.partitions,
        page: data.page,
        size: data.size,
        count: data.count,
        totalCount: data.totalCount,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [processDefinitionKey, refreshKey]
  );

  // Get columns from extracted definition
  const columns = useMemo(
    () =>
      getProcessInstanceColumns(t, {
        showProcessColumn: !processDefinitionKey,
        processDefinitions,
      }),
    [t, processDefinitionKey, processDefinitions]
  );

  // Get filters from extracted definition
  const filters = useMemo(
    () =>
      getProcessInstanceFilters(t, {
        showProcessFilter: !processDefinitionKey,
        processOptions,
        activityIds,
      }),
    [t, processDefinitionKey, processOptions, activityIds]
  );

  // Handlers
  const handleRowClick = useCallback(
    (row: ProcessInstance) => {
      void navigate(`/process-instances/${row.key}`);
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
      data-testid="process-instances-table"
    />
  );
};
