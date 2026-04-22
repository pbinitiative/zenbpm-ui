import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box } from '@mui/material';
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
  getDmnResourceDefinitions,
  type DmnResourceDefinitionSimple,
  type GetDmnResourceDefinitionsParams,
} from '@base/openapi';

interface DecisionDefinitionsTabProps {
  refreshKey?: number;
}

export const DecisionDefinitionsTab = ({ refreshKey = 0 }: DecisionDefinitionsTabProps) => {
  const { t } = useTranslation([ns.common, ns.decisions]);
  const navigate = useNavigate();
  const { showError } = useNotification();

  const [filterValues, setFilterValues] = useState<FilterValues>({
    onlyLatest: 'true',
    search: '',
  });

  // Fetch function used by TableWithFilters (simple mode)
  const fetchData = useCallback(async (params: {
    page: number;
    size: number;
    filters?: FilterValues;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    try {
      const apiParams: GetDmnResourceDefinitionsParams = {
        page: params.page,
        size: params.size,
      };

      // onlyLatest
      if (params.filters?.onlyLatest === 'true') {
        apiParams.onlyLatest = true;
      }

      // name search
      if (params.filters?.search && typeof params.filters.search === 'string') {
        apiParams.search = params.filters.search;
      }

      // sorting mapping
      if (params.sortBy) {
        const sortMapping: Record<string, GetDmnResourceDefinitionsParams['sortBy']> = {
          key: 'key',
          dmnDefinitionName: 'dmnDefinitionName',
          dmnResourceDefinitionId: 'dmnResourceDefinitionId',
          version: 'version',
        };
        const mappedSortBy = sortMapping[params.sortBy];
        if (mappedSortBy) {
          apiParams.sortBy = mappedSortBy;
          apiParams.sortOrder = params.sortOrder;
        }
      }

      const data = await getDmnResourceDefinitions(apiParams);
      return { items: data.items || [], totalCount: data.totalCount ?? (data.items || []).length };
    } catch (error) {
      console.error('Failed to fetch decision definitions:', error);
      showError(t('common:errors.loadFailed'));
      return { items: [], totalCount: 0 };
    }
  }, [showError, t]);

  // Handle sort change from table (exposed to TableWithFilters via onSortChange)
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    // no-op: TableWithFilters passes sorting to fetchData; we only need to forward the change if parent wants to react
  }, []);

  // Column definitions
  const columns: Column<DmnResourceDefinitionSimple>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('decisions:fields.key'),
        sortable: true,
        render: (row) => <MonoText>{row.key}</MonoText>,
      },
      {
        id: 'dmnDefinitionName',
        label: t('decisions:fields.name'),
        sortable: true,
        render: (row) => row.dmnDefinitionName || row.dmnResourceDefinitionId,
      },
      {
        id: 'dmnResourceDefinitionId',
        label: t('decisions:fields.dmnResourceId'),
        sortable: true,
      },
      {
        id: 'version',
        label: t('decisions:fields.version'),
        sortable: true,
        width: 100,
        align: 'center' as const,
        render: (row) => <VersionPill version={row.version} />,
      },
    ],
    [t]
  );

  // Filter configuration
  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'onlyLatest',
        label: t('decisions:filters.onlyLatest'),
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
        placeholder: t('decisions:filters.searchPlaceholder'),
        width: 250,
      },
    ],
    [t]
  );

  // Handlers
  const handleRowClick = useCallback((row: DmnResourceDefinitionSimple) => {
    void navigate(`/decision-definitions/${row.key}`);
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
          mode: 'simple',
          fetchData,
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onRowClick={handleRowClick}
        serverSideSorting
        onSortChange={handleSortChange}
        syncWithUrl
        syncSortingWithUrl
        data-testid="decision-definitions-table"
      />
    </Box>
  );
};
