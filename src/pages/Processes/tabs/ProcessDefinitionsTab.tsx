import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Chip } from '@mui/material';
import { useNotification } from '@base/contexts';
import { VersionPill } from '@components/VersionPill';
import { MonoText } from '@components/MonoText';
import {
  TableWithFilters,
  type FilterConfig,
  type FilterValues,
  type SimpleFetchParams,
  type SimpleFetchResult,
} from '@components/TableWithFilters';
import type { Column } from '@components/DataTable';
import {
  getProcessDefinitions,
  getProcessDefinitionStatistics,
  type ProcessDefinitionSimple,
  type InstanceCounts,
  type GetProcessDefinitionsParams, type GetProcessDefinitionStatisticsParams,
} from '@base/openapi';

// Combined type for display: definition data + statistics
interface ProcessDefinitionWithStats extends ProcessDefinitionSimple {
  instanceCounts: InstanceCounts;
}

interface ProcessDefinitionsTabProps {
  refreshKey?: number;
}

export const ProcessDefinitionsTab = ({ refreshKey = 0 }: ProcessDefinitionsTabProps) => {
  const { t } = useTranslation([ns.common, ns.processes]);
  const navigate = useNavigate();
  const { showError } = useNotification();

  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  const [filterValues, setFilterValues] = useState<FilterValues>({
    onlyLatest: 'true',
    search: '',
  });

  // Fetch process definitions and statistics in a single call, then merge
  const fetchData = useCallback(
    async (params: SimpleFetchParams): Promise<SimpleFetchResult<ProcessDefinitionWithStats>> => {
      // Build params for process definitions endpoint
      const apiParams: GetProcessDefinitionsParams = {
        page: params.page,
        size: params.size,
      };

      // Add onlyLatest filter
      if (params.filters?.onlyLatest === 'true') {
        apiParams.onlyLatest = true;
      }

      // Note: search filter not supported by backend API yet

      // Add sorting — map column ids to API sort fields
      if (params.sortBy) {
        const sortMapping: Record<string, GetProcessDefinitionsParams['sortBy']> = {
          bpmnProcessId: 'bpmnProcessId',
          bpmnProcessName: 'name',
          name: 'name',
          version: 'version',
        };
        const mappedSortBy = sortMapping[params.sortBy];
        if (mappedSortBy) {
          apiParams.sortBy = mappedSortBy;
          apiParams.sortOrder = params.sortOrder;
        }
      }

      try {
        // Fetch definitions and statistics in parallel
        const [definitionsData, statisticsResult] = await Promise.allSettled([
          getProcessDefinitions(apiParams),
          getProcessDefinitionStatistics(apiParams as GetProcessDefinitionStatisticsParams),
        ]);

        if (definitionsData.status === 'rejected') {
          throw definitionsData.reason as Error;
        }

        const definitions = definitionsData.value.items || [];

        // Build statistics map — failure is non-fatal, fall back to zero counts
        const statisticsMap = new Map<string, { instanceCounts: InstanceCounts }>();
        if (statisticsResult.status === 'fulfilled') {
          for (const partition of statisticsResult.value.partitions || []) {
            for (const stat of partition.items || []) {
              statisticsMap.set(stat.key, { instanceCounts: stat.instanceCounts });
            }
          }
        } else {
          console.warn('Failed to fetch process definition statistics:', statisticsResult.reason);
        }

        // Merge definitions with statistics
        const items: ProcessDefinitionWithStats[] = definitions.map((def) => {
          const stats = statisticsMap.get(def.key) ?? {
            instanceCounts: { total: 0, active: 0, completed: 0, terminated: 0, failed: 0 },
          };
          return { ...def, instanceCounts: stats.instanceCounts };
        });

        return {
          items,
          totalCount: definitionsData.value.totalCount ?? items.length,
        };
      } catch (error) {
        console.error('Failed to fetch process definitions:', error);
        showError(t('common:errors.loadFailed'));
        return { items: [], totalCount: 0 };
      }
    },
    // showError and t are stable refs — no other deps needed since all values come via params
    [showError, t]
  );

  const handleRefresh = useCallback(() => {
    setInternalRefreshKey((k) => k + 1);
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
        id: 'instanceCounts.failed',
        label: t('processes:statistics.incidents'),
        width: 100,
        align: 'center' as const,
        render: (row) =>
          row.instanceCounts.failed > 0 ? (
            <Chip
              size="small"
              label={row.instanceCounts.failed}
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

  const handleRowClick = useCallback(
    (row: ProcessDefinitionWithStats) => {
      void navigate(`/process-definitions/${row.key}`);
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
          fetchData,
          onRefresh: handleRefresh,
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onRowClick={handleRowClick}
        serverSideSorting
        refreshKey={refreshKey + internalRefreshKey}
        syncWithUrl
        syncSortingWithUrl
        data-testid="process-definitions-table"
      />
    </Box>
  );
};
