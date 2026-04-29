import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  TableWithFilters,
  type FilterValues,
} from '@components/TableWithFilters';
import type { PartitionedResponse } from '@components/PartitionedTable';
import { SearchableSelect } from '@components/SearchableSelect';
import { getProcessInstanceColumns } from './table/columns';
import { getProcessInstanceFilters } from './table/filters';
import {
  getProcessInstances,
  getChildProcessInstances,
  type ProcessInstance,
  type ProcessDefinitionSimple,
  getProcessDefinitions,
} from '@base/openapi';

// Re-export for consumers
export type { ProcessInstance };

export interface ProcessInstancesTableProps {
  /** Fixed process definition key - when set, instances are filtered by this key and the process filter is hidden */
  processDefinitionKey?: string;
  /** Parent process instance key - when set, fetches child processes instead of all processes */
  parentProcessInstanceKey?: string;
  /** Activity IDs available for filtering (typically extracted from BPMN) */
  activityIds?: string[];
  /** External filter values - when provided, the component is controlled */
  filterValues?: FilterValues;
  /** Callback when filter values change */
  onFilterChange?: (filters: FilterValues) => void;
  /** Key to trigger data refresh */
  refreshKey?: number;
  /** Default number of rows per page (default: 5) */
  defaultPageSize?: number;
  /** Selected activity from diagram click - will be set as activityId filter */
  selectedActivityId?: string;
  /** Whether to sync filters with URL */
  syncWithUrl?: boolean;
  /** Callback when activity filter changes (for syncing with diagram highlight) */
  onActivityFilterChange?: (activityId: string | undefined) => void;
}

export const ProcessInstancesTable = ({
  processDefinitionKey,
  parentProcessInstanceKey,
  activityIds = [],
  filterValues: externalFilterValues,
  onFilterChange: externalOnFilterChange,
  refreshKey: externalRefreshKey = 0,
  syncWithUrl = true,
  defaultPageSize,
  selectedActivityId: _selectedActivityId,
  onActivityFilterChange,
}: ProcessInstancesTableProps) => {
  // Note: _selectedActivityId is not used directly - the table reads activityId from URL via syncWithUrl.
  // The prop exists for API consistency; the page uses it to sync diagram highlighting.
  const { t } = useTranslation([ns.common, ns.processes]);
  const navigate = useNavigate();
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  // Tracks the full ProcessDefinitionSimple selected in the process filter
  // (the bpmnProcessId string is stored in FilterValues; this holds the object for the Autocomplete)
  const [selectedDefinition, setSelectedDefinition] = useState<ProcessDefinitionSimple | null>(null);

  // Map of bpmnProcessId -> bpmnProcessName (fetched separately because process instances don't include the name)
  const [processNameMap, setProcessNameMap] = useState<Record<string, string>>({});

  const fetchProcessDefinitions = useCallback(
    (search: string) =>
      getProcessDefinitions({ search: search || undefined, onlyLatest: true, size: 50 }).then(
        (data) => data.items || [],
      ),
    [],
  );

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
      if (params.filters?.includeChildProcesses !== undefined) {
        apiParams.includeChildProcesses = params.filters.includeChildProcesses === 'true';
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
      if (params.filters?.businessKey && typeof params.filters.businessKey === 'string') {
        apiParams.businessKey = params.filters.businessKey;
      }

      // Add sorting
      if (params.sortBy) {
        apiParams.sortBy = params.sortBy;
        apiParams.sortOrder = params.sortOrder || 'asc';
      }

      const data = parentProcessInstanceKey
        ? await getChildProcessInstances(parentProcessInstanceKey, apiParams)
        : await getProcessInstances(apiParams);

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
    [processDefinitionKey, parentProcessInstanceKey, refreshKey]
  );

  // Fetch latest process definitions (up to 100) to build a map of id->name.
  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        const defs = await getProcessDefinitions({ onlyLatest: true, size: 100 });
        if (aborted) return;
        const map: Record<string, string> = {};
        for (const d of defs.items || []) {
          if (d.bpmnProcessId) {
            map[d.bpmnProcessId] = d.bpmnProcessName ?? d.bpmnProcessId;
          }
        }
        setProcessNameMap(map);
      } catch (err) {
        console.error('Failed to load process definitions for name map:', err);
        setProcessNameMap({});
      }
    };
    void load();
    return () => {
      aborted = true;
    };
  }, [refreshKey]);

  // Get columns from extracted definition
  const columns = useMemo(
    () =>
      getProcessInstanceColumns(t, {
        showProcessColumn: !processDefinitionKey,
        processNameMap,
      }),
    [t, processDefinitionKey, processNameMap]
  );

  // Get filters from extracted definition
  const filters = useMemo(
    () =>
      getProcessInstanceFilters(t, {
        showProcessFilter: !processDefinitionKey,
        showIncludeChildProcesses: !parentProcessInstanceKey,
        renderProcessFilter: (_value, onChange) => (
          <SearchableSelect<ProcessDefinitionSimple>
            value={selectedDefinition}
            onChange={(def) => {
              setSelectedDefinition(def);
              onChange(def?.bpmnProcessId ?? '');
            }}
            fetchOptions={fetchProcessDefinitions}
            getOptionLabel={(opt) => opt.bpmnProcessName || opt.bpmnProcessId}
            getOptionSubtitle={(opt) =>
              opt.bpmnProcessName && opt.bpmnProcessName !== opt.bpmnProcessId
                ? opt.bpmnProcessId
                : undefined
            }
            getOptionKey={(opt) => opt.key}
            label={t('processes:dialogs.startInstance.selectProcess')}
          />
        ),
        getProcessActiveLabel: (bpmnProcessId) =>
          selectedDefinition?.bpmnProcessName || bpmnProcessId,
        activityIds,
      }),
    [t, processDefinitionKey, parentProcessInstanceKey, activityIds, selectedDefinition]
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
      defaultPageSize={defaultPageSize}
      data-testid="process-instances-table"
    />
  );
};
