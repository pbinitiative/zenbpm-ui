import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Chip } from '@mui/material';
import { useNotification } from '@base/contexts';
import { VersionPill } from '@components/VersionPill';
import { MonoText } from '@components/MonoText';
import {
  TableWithFilters,
  type FilterConfig,
  type FilterValues,
} from '@components/TableWithFilters';
import type { Column } from '@components/DataTable';
import {
  getProcessDefinitions,
  getProcessDefinitionStatistics,
  type ProcessDefinitionSimple,
  type InstanceCounts,
  type IncidentCounts,
  type GetProcessDefinitionsParams,
} from '@base/openapi';

// Combined type for display: definition data + statistics
interface ProcessDefinitionWithStats extends ProcessDefinitionSimple {
  instanceCounts: InstanceCounts;
  incidentCounts: IncidentCounts;
}

interface ProcessDefinitionsTabProps {
  refreshKey?: number;
}

export const ProcessDefinitionsTab = ({ refreshKey = 0 }: ProcessDefinitionsTabProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showError } = useNotification();

  // State
  const [processDefinitions, setProcessDefinitions] = useState<ProcessDefinitionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    onlyLatest: 'true',
    search: '',
  });
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch process definitions and statistics from API, then merge
  const fetchProcessDefinitions = useCallback(async () => {
    setLoading(true);

    try {
      // Build params for process definitions endpoint
      const apiParams: GetProcessDefinitionsParams = {
        page: 1,
        size: 100,
      };

      // Add onlyLatest filter
      if (filterValues.onlyLatest === 'true') {
        apiParams.onlyLatest = true;
      }

      // Note: search filter not supported by backend API yet

      // Add sorting - map column ids to API sort fields
      if (sortBy) {
        const sortMapping: Record<string, GetProcessDefinitionsParams['sortBy']> = {
          bpmnProcessId: 'bpmnProcessId',
          bpmnProcessName: 'name',
          name: 'name',
          version: 'version',
        };
        const mappedSortBy = sortMapping[sortBy];
        if (mappedSortBy) {
          apiParams.sortBy = mappedSortBy;
          apiParams.sortOrder = sortOrder;
        }
      }

      // 1. Fetch process definitions (with filtering, paging, sorting)
      const definitionsData = await getProcessDefinitions(apiParams);
      const definitions = definitionsData.items || [];

      // 2. Fetch statistics separately - if it fails, we still show definitions with zero stats
      // Use string keys because json-bigint converts large numbers to strings to preserve precision
      const statisticsMap = new Map<string, { instanceCounts: InstanceCounts; incidentCounts: IncidentCounts }>();
      if (definitions.length > 0) {
        try {
          const statisticsData = await getProcessDefinitionStatistics({ size: 100, onlyLatest: apiParams.onlyLatest });
          for (const stat of statisticsData.items || []) {
            statisticsMap.set(String(stat.key), {
              instanceCounts: stat.instanceCounts,
              incidentCounts: stat.incidentCounts,
            });
          }
        } catch (statsError) {
          // Statistics failed - log but continue with definitions
          console.warn('Failed to fetch process definition statistics:', statsError);
        }
      }

      // 3. Merge definitions with statistics (defaults to zero if stats not available)
      const merged: ProcessDefinitionWithStats[] = definitions.map((def) => {
        const stats = statisticsMap.get(String(def.key)) || {
          instanceCounts: { total: 0, active: 0, completed: 0, terminated: 0, failed: 0 },
          incidentCounts: { total: 0, unresolved: 0 },
        };
        return {
          ...def,
          instanceCounts: stats.instanceCounts,
          incidentCounts: stats.incidentCounts,
        };
      });

      setProcessDefinitions(merged);
    } catch (error) {
      console.error('Failed to fetch process definitions:', error);
      setProcessDefinitions([]);
      showError(t('common:errors.loadFailed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues, sortBy, sortOrder]);

  // Fetch when filters, sorting change or refresh is triggered
  useEffect(() => {
    fetchProcessDefinitions();
  }, [fetchProcessDefinitions, refreshKey]);

  // Handle sort change from table
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  // Column definitions
  const columns: Column<ProcessDefinitionWithStats>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processes:fields.key'),
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'bpmnProcessName',
        label: t('processes:fields.name'),
        sortable: true,
        render: (row) => row.bpmnProcessName || row.bpmnProcessId,
      },
      {
        id: 'bpmnProcessId',
        label: t('processes:fields.bpmnProcessId'),
        sortable: true,
      },
      {
        id: 'version',
        label: t('processes:fields.version'),
        sortable: true,
        width: 80,
        align: 'center' as const,
        render: (row) => <VersionPill version={row.version} />,
      },
      {
        id: 'instanceCounts.active',
        label: t('processes:statistics.active'),
        width: 90,
        align: 'center' as const,
        render: (row) => (
          <Chip
            size="small"
            label={row.instanceCounts.active}
            sx={{
              bgcolor: row.instanceCounts.active > 0 ? 'primary.main' : 'grey.200',
              color: row.instanceCounts.active > 0 ? 'white' : 'text.secondary',
              fontWeight: 600,
              minWidth: 40,
            }}
          />
        ),
      },
      {
        id: 'incidentCounts.unresolved',
        label: t('processes:statistics.incidents'),
        width: 100,
        align: 'center' as const,
        render: (row) =>
          row.incidentCounts.unresolved > 0 ? (
            <Chip
              size="small"
              label={row.incidentCounts.unresolved}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                fontWeight: 600,
                minWidth: 40,
              }}
            />
          ) : (
            <Chip
              size="small"
              label="0"
              sx={{
                bgcolor: 'grey.200',
                color: 'text.secondary',
                fontWeight: 600,
                minWidth: 40,
              }}
            />
          ),
      },
    ],
    [t]
  );

  // Filter configuration with zones
  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'onlyLatest',
        label: t('processes:filters.onlyLatest'),
        type: 'switch',
        zone: 'exposed_first_line',
        hideFilterBadge: true,
      },
      {
        id: 'search',
        label: t('common:search.label'),
        type: 'text',
        zone: 'exposed_first_line',
        align: 'right',
        placeholder: t('processes:filters.searchPlaceholder'),
        width: 250,
      },
    ],
    [t]
  );

  // Handlers
  const handleRowClick = useCallback(
    (row: ProcessDefinitionWithStats) => {
      navigate(`/process-definitions/${row.key}`);
    },
    [navigate]
  );

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilterValues(newFilters);
  }, []);

  return (
    <Box>
      <TableWithFilters
        columns={columns}
        rowKey="key"
        tableConfig={{
          mode: 'simple',
          data: processDefinitions,
          loading,
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onRowClick={handleRowClick}
        serverSideSorting
        onSortChange={handleSortChange}
        syncWithUrl
        syncSortingWithUrl
        data-testid="process-definitions-table"
      />
    </Box>
  );
};
