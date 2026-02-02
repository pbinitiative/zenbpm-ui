import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  TableWithFilters,
  type FilterValues,
} from '@components/TableWithFilters';
import type { PartitionedResponse } from '@components/PartitionedTable';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { StackTraceModal } from './components/StackTraceModal';
import { getIncidentColumns } from './table/columns';
import { getIncidentFilters } from './table/filters';
import {
  getIncidents,
  resolveIncident,
  type Incident as ApiIncident,
} from '@base/openapi';

export type Incident = ApiIncident;

export interface IncidentsTableProps {
  /** Process instance key - required, incidents are always scoped to an instance */
  processInstanceKey: string;
  /** Key to trigger data refresh */
  refreshKey?: number;
  /** Callback when an incident is resolved successfully */
  onIncidentResolved?: () => void;
  /** Callback to show notifications */
  onShowNotification?: (message: string, severity: 'success' | 'error') => void;
}

export const IncidentsTable = ({
  processInstanceKey,
  refreshKey: externalRefreshKey = 0,
  onIncidentResolved,
  onShowNotification,
}: IncidentsTableProps) => {
  const { t } = useTranslation([ns.common, ns.incidents]);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  const refreshKey = externalRefreshKey || internalRefreshKey;

  // Modal state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [stackTraceMessage, setStackTraceMessage] = useState<string | null>(null);

  // Fetch incidents data using per-instance API endpoint
  const fetchData = useCallback(
    async (params: {
      page: number;
      size: number;
      filters?: FilterValues;
    }): Promise<PartitionedResponse<Incident>> => {
      // Build API params
      const apiParams: { page?: number; size?: number; state?: 'resolved' | 'unresolved' } = {
        page: params.page,
        size: params.size,
      };

      // Apply state filter
      const stateFilter = params.filters?.state as string | undefined;
      if (stateFilter === 'resolved') {
        apiParams.state = 'resolved';
      } else if (stateFilter === 'unresolved') {
        apiParams.state = 'unresolved';
      }

      const responseData = await getIncidents(processInstanceKey, apiParams);

      // Wrap simple paginated response in partitioned format
      return {
        partitions: [{ partition: 1, items: responseData.items as Incident[] }],
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
  // Always refresh after attempting resolve - an error may mean the incident was
  // resolved but a new one was created, so we need to show the latest state.
  const handleResolveIncident = useCallback(async (incidentKey: string) => {
    try {
      await resolveIncident(incidentKey);
      onShowNotification?.(t('incidents:messages.resolved'), 'success');
    } catch {
      // Silently continue - the resolve may have succeeded with a new incident created
    } finally {
      setSelectedIncident(null);
      setInternalRefreshKey((k) => k + 1);
      onIncidentResolved?.();
    }
  }, [t, onShowNotification, onIncidentResolved]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setInternalRefreshKey((k) => k + 1);
  }, []);

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
        onViewDetails: handleViewDetails,
        onResolve: (incidentKey) => void handleResolveIncident(incidentKey),
        onMessageClick: handleMessageClick,
      }),
    [t, handleViewDetails, handleResolveIncident, handleMessageClick]
  );

  // Get filters from extracted definition
  const filters = useMemo(
    () => getIncidentFilters(t),
    [t]
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
        initialFilterValues={{ state: 'all' }}
        refreshKey={refreshKey}
        syncWithUrl={false}
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
