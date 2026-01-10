import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  type ProcessInstance as ApiProcessInstance,
} from '@base/openapi';

// Process instance type for display (extends API type with UI-specific fields)
export interface ProcessInstance {
  key: number;
  processDefinitionKey: number;
  bpmnProcessId?: string;
  createdAt: string;
  state: 'active' | 'completed' | 'terminated' | 'failed';
  variables: Record<string, unknown>;
  activeElementInstances: Array<{
    elementInstanceKey: number;
    createdAt: string;
    state: string;
    elementId: string;
  }>;
}

// Process definition type for the filter dropdown
export interface ProcessDefinitionOption {
  key: number;
  bpmnProcessId: string;
  bpmnProcessName?: string;
  version: number;
}

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
  selectedActivityId,
  onActivityFilterChange,
}: ProcessInstancesTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const [processDefinitions, setProcessDefinitions] = useState<ProcessDefinitionOption[]>([]);

  // Use external or internal filter values
  const [internalFilterValues, setInternalFilterValues] = useState<FilterValues>({
    state: '',
    bpmnProcessId: '',
    search: '',
    activityId: '',
  });

  const filterValues = externalFilterValues ?? internalFilterValues;
  const refreshKey = externalRefreshKey || internalRefreshKey;

  // Wrap filter change to also notify parent about activityId changes
  const onFilterChange = useCallback((newFilters: FilterValues) => {
    if (externalOnFilterChange) {
      externalOnFilterChange(newFilters);
    } else {
      setInternalFilterValues(newFilters);
    }

    // Notify parent when activityId filter changes
    const newActivityId = typeof newFilters.activityId === 'string' ? newFilters.activityId : undefined;
    onActivityFilterChange?.(newActivityId || undefined);
  }, [externalOnFilterChange, onActivityFilterChange]);

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
    loadProcessDefinitions();
  }, [processDefinitionKey]);

  // Convert process definitions to filter options
  const processOptions: FilterOption[] = useMemo(() => {
    return processDefinitions.map((pd) => ({
      value: pd.bpmnProcessId,
      label: pd.bpmnProcessName || pd.bpmnProcessId,
    }));
  }, [processDefinitions]);

  // Handle selectedActivityId from diagram click - update internal filter
  useEffect(() => {
    if (selectedActivityId !== undefined && !externalFilterValues) {
      setInternalFilterValues((prev) => ({
        ...prev,
        activityId: selectedActivityId,
      }));
    }
  }, [selectedActivityId, externalFilterValues]);

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

      // Transform to ProcessInstance type with proper field mappings
      const transformPartition = (partition: { partition: number; items: ApiProcessInstance[]; count?: number }) => ({
        partition: partition.partition,
        count: partition.count,
        items: partition.items.map((pi) => ({
          key: pi.key,
          processDefinitionKey: pi.processDefinitionKey,
          bpmnProcessId: (pi as unknown as { bpmnProcessId?: string }).bpmnProcessId,
          createdAt: pi.createdAt,
          state: pi.state as ProcessInstance['state'],
          variables: pi.variables as Record<string, unknown>,
          activeElementInstances: pi.activeElementInstances.map((ei) => ({
            elementInstanceKey: ei.elementInstanceKey,
            createdAt: ei.createdAt,
            state: ei.state,
            elementId: ei.elementId,
          })),
        })),
      });

      return {
        partitions: data.partitions.map(transformPartition),
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
      navigate(`/process-instances/${row.key}`);
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
      filterValues={filterValues}
      onFilterChange={onFilterChange}
      onRowClick={handleRowClick}
      refreshKey={refreshKey}
      serverSideSorting
      syncWithUrl={syncWithUrl}
      syncSortingWithUrl={syncWithUrl}
      data-testid="process-instances-table"
    />
  );
};
