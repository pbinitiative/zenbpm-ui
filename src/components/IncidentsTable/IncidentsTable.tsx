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
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { StackTraceModal } from './components/StackTraceModal';
import { getIncidentColumns } from './table/columns';
import { getIncidentFilters } from './table/filters';
import {
  getGlobalIncidents,
  resolveIncident,
  getProcessDefinitions,
  type Incident as ApiIncident,
} from '@base/openapi';

// Incident type extended with optional fields for display
export interface Incident extends ApiIncident {
  processDefinitionKey?: string;
  bpmnProcessId?: string;
  partition?: number;
}

export interface IncidentsTableProps {
  /** Fixed process instance key - when set, incidents are filtered by this instance and the column is hidden */
  processInstanceKey?: string;
  /** External filter values - when provided, the component is controlled */
  filterValues?: FilterValues;
  /** Callback when filter values change */
  onFilterChange?: (filters: FilterValues) => void;
  /** Key to trigger data refresh */
  refreshKey?: number;
  /** Whether to sync filters with URL */
  syncWithUrl?: boolean;
  /** Callback when an incident is resolved successfully */
  onIncidentResolved?: () => void;
  /** Callback to show notifications */
  onShowNotification?: (message: string, severity: 'success' | 'error') => void;
}

export const IncidentsTable = ({
  processInstanceKey,
  filterValues: externalFilterValues,
  onFilterChange: externalOnFilterChange,
  refreshKey: externalRefreshKey = 0,
  syncWithUrl = true,
  onIncidentResolved,
  onShowNotification,
}: IncidentsTableProps) => {
  const { t } = useTranslation([ns.common, ns.incidents]);
  const navigate = useNavigate();
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const [processOptions, setProcessOptions] = useState<FilterOption[]>([]);

  // Use external or internal filter values
  const [internalFilterValues, setInternalFilterValues] = useState<FilterValues>({
    state: 'all',
  });

  const filterValues = externalFilterValues ?? internalFilterValues;
  const onFilterChange = externalOnFilterChange ?? setInternalFilterValues;
  const refreshKey = externalRefreshKey || internalRefreshKey;

  // Modal state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [stackTraceMessage, setStackTraceMessage] = useState<string | null>(null);

  // Load process definitions for the filter dropdown (only when showing process filters)
  useEffect(() => {
    if (processInstanceKey) return; // Skip if locked to specific instance

    const loadProcessDefinitions = async () => {
      try {
        const data = await getProcessDefinitions({ onlyLatest: true, size: 100 });
        setProcessOptions(
          (data.items || []).map((pd) => ({
            value: pd.bpmnProcessId,
            label: pd.bpmnProcessName || pd.bpmnProcessId,
          }))
        );
      } catch (error) {
        console.error('Failed to load process definitions:', error);
      }
    };
    loadProcessDefinitions();
  }, [processInstanceKey]);

  // Fetch incidents data using API service
  const fetchData = useCallback(
    async (params: {
      page: number;
      size: number;
      filters?: FilterValues;
    }): Promise<PartitionedResponse<Incident>> => {
      // Build API params
      const apiParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        size: params.size,
      };

      // Add fixed process instance key filter
      if (processInstanceKey) {
        apiParams.processInstanceKey = processInstanceKey;
      }

      // Apply state filter
      const stateFilter = params.filters?.state as string | undefined;
      if (stateFilter === 'resolved') {
        apiParams.resolved = true;
      } else if (stateFilter === 'unresolved') {
        apiParams.resolved = false;
      }

      // Apply other filters
      const bpmnProcessId = params.filters?.bpmnProcessId as string | undefined;
      const filterProcessInstanceKey = params.filters?.processInstanceKey as string | undefined;
      const search = params.filters?.search as string | undefined;
      if (bpmnProcessId) apiParams.bpmnProcessId = bpmnProcessId;
      if (filterProcessInstanceKey && !processInstanceKey) {
        apiParams.processInstanceKey = filterProcessInstanceKey;
      }
      if (search) apiParams.search = search;

      // Apply date range filter
      if (params.filters?.createdAt && typeof params.filters.createdAt === 'object') {
        const createdAt = params.filters.createdAt as { from?: string; to?: string };
        if (createdAt.from) {
          apiParams.createdFrom = createdAt.from;
        }
        if (createdAt.to) {
          apiParams.createdTo = createdAt.to;
        }
      }

      const responseData = await getGlobalIncidents(apiParams);

      // Response already has partitions structure
      const partitions = responseData.partitions.map((p) => ({
        partition: p.partition,
        items: p.items as Incident[],
      }));

      return {
        partitions: partitions.length > 0 ? partitions : [{ partition: 1, items: [] }],
        page: responseData.page,
        size: responseData.size,
        count: responseData.count,
        totalCount: responseData.totalCount,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [processInstanceKey, refreshKey]
  );

  // Handle resolve incident using API service
  const handleResolveIncident = useCallback(async (incidentKey: number) => {
    try {
      await resolveIncident(incidentKey);
      onShowNotification?.(t('incidents:messages.resolved'), 'success');
      setSelectedIncident(null);
      setInternalRefreshKey((k) => k + 1);
      onIncidentResolved?.();
    } catch {
      onShowNotification?.(t('incidents:messages.resolveFailed'), 'error');
    }
  }, [t, onShowNotification, onIncidentResolved]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setInternalRefreshKey((k) => k + 1);
  }, []);

  // Handle row click - navigate to process instance detail incidents tab (only for global view)
  const handleRowClick = useCallback(
    (row: Incident) => {
      if (!processInstanceKey) {
        navigate(`/process-instances/${row.processInstanceKey}?tab=incidents`);
      }
    },
    [navigate, processInstanceKey]
  );

  // Handle view details
  const handleViewDetails = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
  }, []);

  // Handle message click to show stack trace
  const handleMessageClick = useCallback((message: string) => {
    setStackTraceMessage(message);
  }, []);

  // Get columns from extracted definition
  const columns = useMemo(
    () =>
      getIncidentColumns(t, {
        showProcessInstanceKey: !processInstanceKey,
        onViewDetails: handleViewDetails,
        onResolve: handleResolveIncident,
        onMessageClick: handleMessageClick,
      }),
    [t, processInstanceKey, handleViewDetails, handleResolveIncident, handleMessageClick]
  );

  // Get filters from extracted definition
  const filters = useMemo(
    () =>
      getIncidentFilters(t, {
        showProcessFilters: !processInstanceKey,
        processOptions,
      }),
    [t, processInstanceKey, processOptions]
  );

  return (
    <>
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
        initialFilterValues={{ state: 'all' }}
        onFilterChange={onFilterChange}
        onRowClick={processInstanceKey ? undefined : handleRowClick}
        refreshKey={refreshKey}
        syncWithUrl={syncWithUrl}
        data-testid="incidents-table"
      />

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          open={true}
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onResolve={selectedIncident.resolvedAt ? undefined : handleResolveIncident}
        />
      )}

      {/* Stack Trace Modal */}
      {stackTraceMessage && (
        <StackTraceModal
          open={true}
          message={stackTraceMessage}
          onClose={() => setStackTraceMessage(null)}
        />
      )}
    </>
  );
};
