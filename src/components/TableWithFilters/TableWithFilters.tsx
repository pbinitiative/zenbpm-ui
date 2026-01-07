import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Collapse } from '@mui/material';
import { DataTable, type Column, type SortOrder } from '@components/DataTable';
import {
  PartitionedTable,
  type FilterValues as PartitionedFilterValues,
} from '@components/PartitionedTable';

// Types
import type {
  FilterConfig,
  FilterGroupConfig,
  FilterValues,
  TableConfig,
} from './types';

// Hooks
import { useFilterState, flattenFilters } from './hooks/useFilterState';
import { useFiltersByZone } from './hooks/useFiltersByZone';

// Components
import { FirstLineToolbar } from './components/FirstLineToolbar';
import { FilterZoneRenderer } from './components/FilterZoneRenderer';
import { ActiveFilterBadges } from './components/ActiveFilterBadges';

// ============================================================================
// Helper Functions (outside component)
// ============================================================================

function getFiltersFromUrlParams(
  filters: FilterConfig[],
  searchParams: URLSearchParams
): FilterValues {
  const urlFilters: FilterValues = {};
  const flatFilters = flattenFilters(filters);
  flatFilters.forEach((filter) => {
    const paramValue = searchParams.get(filter.id);
    if (paramValue !== null) {
      if (filter.type === 'dateRange') {
        const fromValue = searchParams.get(`${filter.id}From`);
        const toValue = searchParams.get(`${filter.id}To`);
        if (fromValue || toValue) {
          urlFilters[filter.id] = { from: fromValue || undefined, to: toValue || undefined };
        }
      } else {
        urlFilters[filter.id] = paramValue;
      }
    } else if (filter.type === 'dateRange') {
      const fromValue = searchParams.get(`${filter.id}From`);
      const toValue = searchParams.get(`${filter.id}To`);
      if (fromValue || toValue) {
        urlFilters[filter.id] = { from: fromValue || undefined, to: toValue || undefined };
      }
    }
  });
  return urlFilters;
}

function computeInitialFilterValues(
  syncWithUrl: boolean,
  filters: FilterConfig[],
  searchParams: URLSearchParams,
  initialFilterValues: FilterValues
): FilterValues {
  if (syncWithUrl) {
    const urlFilters = getFiltersFromUrlParams(filters, searchParams);
    return { ...initialFilterValues, ...urlFilters };
  }
  return initialFilterValues;
}

function computeInitialSorting(
  syncSortingWithUrl: boolean,
  searchParams: URLSearchParams,
  defaultSortBy: string | undefined,
  defaultSortOrder: SortOrder
): { sortBy?: string; sortOrder: SortOrder } {
  if (syncSortingWithUrl) {
    const urlSortBy = searchParams.get('sortBy');
    const urlSortOrder = searchParams.get('sortOrder') as SortOrder | null;
    return {
      sortBy: urlSortBy || defaultSortBy,
      sortOrder: urlSortOrder || defaultSortOrder,
    };
  }
  return { sortBy: defaultSortBy, sortOrder: defaultSortOrder };
}

// ============================================================================
// Component Props
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

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
  const [searchParams, setSearchParams] = useSearchParams();

  // Compute initial values using helper functions
  const computedInitialFilters = useMemo(
    () => computeInitialFilterValues(syncWithUrl, filters, searchParams, initialFilterValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute once on mount
  );

  const computedInitialSorting = useMemo(
    () => computeInitialSorting(syncSortingWithUrl, searchParams, defaultSortBy, defaultSortOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute once on mount
  );

  // ========== Filter State ==========
  const {
    filterValues,
    activeFilters,
    handleFilterChange,
    handleClearFilters,
    handleRemoveFilter,
  } = useFilterState({
    filters,
    initialFilterValues: computedInitialFilters,
    externalFilterValues,
    onFilterChange,
  });

  // ========== UI State ==========
  const [showHideableFilters, setShowHideableFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string | undefined>(computedInitialSorting.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(computedInitialSorting.sortOrder);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ========== Filter Organization ==========
  const filtersByZone = useFiltersByZone(filters);

  const hasHideableFilters = useMemo(
    () => filters.some((f) => (f.zone ?? 'hideable') === 'hideable'),
    [filters]
  );

  // ========== Handlers ==========
  const handleFilterChangeWithPageReset = useCallback(
    (filterId: string, value: string | string[] | { from?: string; to?: string }) => {
      handleFilterChange(filterId, value);
      setPage(0);
    },
    [handleFilterChange]
  );

  const handleClearFiltersWithPageReset = useCallback(() => {
    handleClearFilters();
    setPage(0);
  }, [handleClearFilters]);

  const handleRemoveFilterWithPageReset = useCallback(
    (filterId: string) => {
      handleRemoveFilter(filterId);
      setPage(0);
    },
    [handleRemoveFilter]
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: SortOrder) => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      externalOnSortChange?.(newSortBy, newSortOrder);
    },
    [externalOnSortChange]
  );

  const handleToggleHideableFilters = useCallback(() => {
    setShowHideableFilters((prev) => !prev);
  }, []);

  // ========== URL Sync Effect ==========
  useEffect(() => {
    if (!syncWithUrl && !syncSortingWithUrl) return;

    const newParams = new URLSearchParams();

    if (syncWithUrl) {
      const flatFilters = flattenFilters(filters);
      flatFilters.forEach((filter) => {
        const value = filterValues[filter.id];

        if (filter.type === 'dateRange') {
          const rangeValue = value as { from?: string; to?: string } | undefined;
          if (rangeValue?.from) {
            newParams.set(`${filter.id}From`, rangeValue.from);
          }
          if (rangeValue?.to) {
            newParams.set(`${filter.id}To`, rangeValue.to);
          }
        } else if (typeof value === 'string' && value !== '') {
          newParams.set(filter.id, value);
        }
      });
    }

    if (syncSortingWithUrl && sortBy) {
      newParams.set('sortBy', sortBy);
      newParams.set('sortOrder', sortOrder);
    }

    setSearchParams(newParams, { replace: true });
  }, [syncWithUrl, syncSortingWithUrl, filterValues, filters, sortBy, sortOrder, setSearchParams]);

  // ========== Memoized Render Sections ==========
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
    [filtersByZone, filterGroups, filterValues, handleFilterChangeWithPageReset, hasHideableFilters, showHideableFilters, handleToggleHideableFilters]
  );

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

  const hideableFiltersPanel = useMemo(
    () =>
      hideableFiltersContent ? (
        <Collapse in={showHideableFilters}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>{hideableFiltersContent}</Box>
        </Collapse>
      ) : null,
    [hideableFiltersContent, showHideableFilters]
  );

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

  // Combined toolbar for DataTable
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

  // ========== Render ==========
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
