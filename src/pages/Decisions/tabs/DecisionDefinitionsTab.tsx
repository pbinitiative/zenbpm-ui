import { useState, useMemo, useCallback, useEffect } from 'react';
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
import type { DmnResourceDefinitionSimple } from '@base/openapi';
import { getDmnResourceDefinitions } from '@base/openapi';

interface DecisionDefinitionsTabProps {
  refreshKey?: number;
}

export const DecisionDefinitionsTab = ({ refreshKey = 0 }: DecisionDefinitionsTabProps) => {
  const { t } = useTranslation([ns.common, ns.decisions]);
  const navigate = useNavigate();
  const { showError } = useNotification();

  // State
  const [definitions, setDefinitions] = useState<DmnResourceDefinitionSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: '',
  });
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch decision definitions from API
  const fetchDefinitions = useCallback(async () => {
    setLoading(true);

    try {
      const apiParams: Record<string, string | number | boolean | undefined> = {
        page: 1,
        size: 100,
      };

      // Add search filter
      if (filterValues.search && typeof filterValues.search === 'string') {
        apiParams.search = filterValues.search;
      }

      // Add sorting
      if (sortBy) {
        apiParams.sortBy = sortBy;
        apiParams.sortOrder = sortOrder;
      }

      const data = await getDmnResourceDefinitions(apiParams);
      setDefinitions(data.items || []);
    } catch (error) {
      console.error('Failed to fetch decision definitions:', error);
      setDefinitions([]);
      showError(t('common:errors.loadFailed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues, sortBy, sortOrder]);

  // Fetch when filters, sorting change or refresh is triggered
  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions, refreshKey]);

  // Handle sort change from table
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
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
        id: 'name',
        label: t('decisions:fields.name'),
        sortable: true,
        render: (row) => row.name || row.dmnResourceDefinitionId,
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
    navigate(`/decision-definitions/${row.key}`);
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
          data: definitions,
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
        data-testid="decision-definitions-table"
      />
    </Box>
  );
};
