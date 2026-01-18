import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Collapse } from '@mui/material';
import { DataTable, type Column, type SortOrder } from '@components/DataTable';
import {
  PartitionedTable,
  type FilterValues as PartitionedFilterValues,
} from '@components/PartitionedTable';

import type { FilterConfig, FilterGroupConfig, FilterValues, TableConfig } from './types';
import { useFilterState, useFiltersByZone, useTableState, flattenFilters } from './hooks';
import { computeInitialFilterValues } from './utils/urlHelpers';
import { FirstLineToolbar } from './components/FirstLineToolbar';
import { FilterZoneRenderer } from './components/FilterZoneRenderer';
import { ActiveFilterBadges } from './components/ActiveFilterBadges';

export interface TableWithFiltersProps<T extends object> {
  columns: Column<T>[];
  rowKey: keyof T;
  tableConfig: TableConfig<T>;

  // Filters
  filters?: FilterConfig[];
  filterGroups?: FilterGroupConfig[];
  filterValues?: FilterValues;
  initialFilterValues?: FilterValues;
  onFilterChange?: (filters: FilterValues) => void;

  // Sorting
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
  serverSideSorting?: boolean;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;

  // Row interaction
  onRowClick?: (row: T) => void;

  // Test ID
  'data-testid'?: string;

  // Refresh trigger
  refreshKey?: number;

  // URL sync
  syncWithUrl?: boolean;
  syncSortingWithUrl?: boolean;
}

export const TableWithFilters = <T extends object>({
  columns,
  rowKey,
  tableConfig,
  filters = [],
  filterGroups = [],
  filterValues: externalFilterValues,
  initialFilterValues = {},
  onFilterChange,
  defaultSortBy,
  defaultSortOrder = 'asc',
  serverSideSorting = false,
  onSortChange: externalOnSortChange,
  onRowClick,
  'data-testid': testId,
  refreshKey = 0,
  syncWithUrl = false,
  syncSortingWithUrl = false,
}: TableWithFiltersProps<T>) => {
  const [searchParams] = useSearchParams();

  // Compute initial filter values (only once on mount)
  const computedInitialFilters = useMemo(
    () => computeInitialFilterValues(syncWithUrl, filters, searchParams, initialFilterValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Filter state management
  const { filterValues, activeFilters, handleFilterChange, handleClearFilters, handleRemoveFilter, setInternalFilterValues } =
    useFilterState({
      filters,
      initialFilterValues: computedInitialFilters,
      externalFilterValues,
      onFilterChange,
    });

  // Track previous searchParams to detect external URL changes
  const prevSearchParamsRef = useRef<string>(searchParams.toString());

  // Listen to URL changes and update filter state (for external URL changes like diagram clicks)
  useEffect(() => {
    if (!syncWithUrl || externalFilterValues) return;

    const currentParamsString = searchParams.toString();
    // Skip if params haven't changed (avoid unnecessary processing)
    if (currentParamsString === prevSearchParamsRef.current) return;
    prevSearchParamsRef.current = currentParamsString;

    const flatFilters = flattenFilters(filters);
    const newFilterValues: FilterValues = {};

    flatFilters.forEach((filter) => {
      if (filter.type === 'dateRange') {
        const from = searchParams.get(`${filter.id}From`);
        const to = searchParams.get(`${filter.id}To`);
        if (from || to) {
          newFilterValues[filter.id] = { from: from || undefined, to: to || undefined };
        }
      } else {
        const value = searchParams.get(filter.id);
        if (value) {
          newFilterValues[filter.id] = value;
        }
      }
    });

    setInternalFilterValues(newFilterValues);
  }, [searchParams, syncWithUrl, externalFilterValues, filters, setInternalFilterValues]);

  // Table UI state (sorting, pagination, hideable filters)
  const {
    page,
    pageSize,
    sortBy,
    sortOrder,
    showHideableFilters,
    setPage,
    setPageSize,
    handleSortChange,
    handleToggleHideableFilters,
  } = useTableState({
    defaultSortBy,
    defaultSortOrder,
    syncSortingWithUrl,
    syncWithUrl,
    filters,
    filterValues,
    onSortChange: externalOnSortChange,
  });

  // Filter organization by zone
  const filtersByZone = useFiltersByZone(filters);

  const hasHideableFilters = useMemo(
    () => filters.some((f) => (f.zone ?? 'hideable') === 'hideable'),
    [filters]
  );

  // Handlers that also reset pagination
  const handleFilterChangeWithPageReset = useCallback(
    (filterId: string, value: string | string[] | { from?: string; to?: string }) => {
      handleFilterChange(filterId, value);
      setPage(0);
    },
    [handleFilterChange, setPage]
  );

  const handleClearFiltersWithPageReset = useCallback(() => {
    handleClearFilters();
    setPage(0);
  }, [handleClearFilters, setPage]);

  const handleRemoveFilterWithPageReset = useCallback(
    (filterId: string) => {
      handleRemoveFilter(filterId);
      setPage(0);
    },
    [handleRemoveFilter, setPage]
  );

  // First line toolbar
  const firstLineToolbar = useMemo(
    () => (
      <FirstLineToolbar
        filtersByZone={filtersByZone}
        filterGroups={filterGroups}
        filterValues={filterValues}
        onFilterChange={handleFilterChangeWithPageReset}
        hasHideableFilters={hasHideableFilters}
        showHideableFilters={showHideableFilters}
        onToggleHideableFilters={handleToggleHideableFilters}
      />
    ),
    [
      filtersByZone,
      filterGroups,
      filterValues,
      handleFilterChangeWithPageReset,
      hasHideableFilters,
      showHideableFilters,
      handleToggleHideableFilters,
    ]
  );

  // Second line filters
  const secondLineContent = useMemo(
    () => (
      <FilterZoneRenderer
        zone="exposed_second_line"
        filtersByZone={filtersByZone}
        filterGroups={filterGroups}
        filterValues={filterValues}
        onFilterChange={handleFilterChangeWithPageReset}
      />
    ),
    [filtersByZone, filterGroups, filterValues, handleFilterChangeWithPageReset]
  );

  // Hideable filters content
  const hideableFiltersContent = useMemo(
    () => (
      <FilterZoneRenderer
        zone="hideable"
        filtersByZone={filtersByZone}
        filterGroups={filterGroups}
        filterValues={filterValues}
        onFilterChange={handleFilterChangeWithPageReset}
      />
    ),
    [filtersByZone, filterGroups, filterValues, handleFilterChangeWithPageReset]
  );

  // Hideable filters panel with collapse
  const hideableFiltersPanel = useMemo(
    () =>
      hideableFiltersContent ? (
        <Collapse in={showHideableFilters}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>{hideableFiltersContent}</Box>
        </Collapse>
      ) : null,
    [hideableFiltersContent, showHideableFilters]
  );

  // Active filter badges
  const activeFilterBadgesPanel = useMemo(
    () => (
      <ActiveFilterBadges
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilterWithPageReset}
        onClearAll={handleClearFiltersWithPageReset}
      />
    ),
    [activeFilters, handleRemoveFilterWithPageReset, handleClearFiltersWithPageReset]
  );

  // Combined toolbar for DataTable (simple mode)
  const simpleToolbar = useMemo(() => {
    const hasFirstLine = hasHideableFilters || filters.some((f) => f.zone === 'exposed_first_line');
    const hasSecondLine = filters.some((f) => f.zone === 'exposed_second_line');

    if (!hasFirstLine && !hasSecondLine) {
      return undefined;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        {hasFirstLine && firstLineToolbar}
        {hasSecondLine && secondLineContent}
      </Box>
    );
  }, [hasHideableFilters, filters, firstLineToolbar, secondLineContent]);

  // Render
  return (
    <Box data-testid={testId}>
      {tableConfig.mode === 'simple' ? (
        <DataTable
          columns={columns}
          data={tableConfig.data}
          loading={tableConfig.loading}
          totalCount={tableConfig.totalCount}
          rowKey={rowKey}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onRowClick={onRowClick}
          toolbar={
            simpleToolbar || hideableFiltersPanel || filters.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {simpleToolbar}
                {hideableFiltersPanel}
                {activeFilterBadgesPanel}
              </Box>
            ) : undefined
          }
        />
      ) : (
        <PartitionedTable
          columns={columns}
          rowKey={rowKey}
          fetchData={tableConfig.fetchData}
          filters={filterValues as PartitionedFilterValues}
          onRowClick={onRowClick}
          sortBy={sortBy}
          sortOrder={sortOrder}
          serverSideSorting={serverSideSorting}
          refreshKey={refreshKey}
          onSortChange={handleSortChange}
          toolbar={firstLineToolbar}
          filtersPanel={
            filters.some((f) => f.zone === 'exposed_second_line') ||
            hideableFiltersPanel ||
            filters.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {filters.some((f) => f.zone === 'exposed_second_line') && (
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>{secondLineContent}</Box>
                )}
                {hideableFiltersPanel}
                {activeFilterBadgesPanel}
              </Box>
            ) : undefined
          }
        />
      )}
    </Box>
  );
};
