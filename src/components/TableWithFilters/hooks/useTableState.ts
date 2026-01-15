import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOrder } from '@components/DataTable';
import type { FilterConfig, FilterValues } from '../types';
import { flattenFilters } from './useFilterState';

interface UseTableStateOptions {
  defaultSortBy?: string;
  defaultSortOrder: SortOrder;
  syncSortingWithUrl: boolean;
  syncWithUrl: boolean;
  filters: FilterConfig[];
  filterValues: FilterValues;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
}

interface UseTableStateResult {
  page: number;
  pageSize: number;
  sortBy: string | undefined;
  sortOrder: SortOrder;
  showHideableFilters: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  handleSortChange: (sortBy: string, sortOrder: SortOrder) => void;
  handleToggleHideableFilters: () => void;
}

export function useTableState({
  defaultSortBy,
  defaultSortOrder,
  syncSortingWithUrl,
  syncWithUrl,
  filters,
  filterValues,
  onSortChange,
}: UseTableStateOptions): UseTableStateResult {
  const [searchParams, setSearchParams] = useSearchParams();

  // Compute initial sorting from URL if needed
  const getInitialSorting = () => {
    if (syncSortingWithUrl) {
      const urlSortBy = searchParams.get('sortBy');
      const urlSortOrder = searchParams.get('sortOrder') as SortOrder | null;
      return {
        sortBy: urlSortBy || defaultSortBy,
        sortOrder: urlSortOrder || defaultSortOrder,
      };
    }
    return { sortBy: defaultSortBy, sortOrder: defaultSortOrder };
  };

  const initialSorting = getInitialSorting();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>(initialSorting.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSorting.sortOrder);
  const [showHideableFilters, setShowHideableFilters] = useState(false);

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: SortOrder) => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      onSortChange?.(newSortBy, newSortOrder);
    },
    [onSortChange]
  );

  const handleToggleHideableFilters = useCallback(() => {
    setShowHideableFilters((prev) => !prev);
  }, []);

  // URL Sync Effect
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

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    showHideableFilters,
    setPage,
    setPageSize,
    handleSortChange,
    handleToggleHideableFilters,
  };
}
