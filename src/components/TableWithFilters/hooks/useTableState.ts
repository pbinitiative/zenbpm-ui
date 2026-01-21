import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOrder } from '@components/DataTable';
import type { FilterConfig, FilterValues } from '../types';
import { flattenFilters } from './useFilterState';

// Debounce delay for URL sync (ms)
const URL_SYNC_DEBOUNCE_DELAY = 150;

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

  // Refs for URL sync debouncing
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrlParamsRef = useRef<string>(searchParams.toString());

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

  // URL Sync Effect - debounced to prevent UI freeze
  useEffect(() => {
    if (!syncWithUrl && !syncSortingWithUrl) return;

    // Clear any pending URL sync
    if (urlSyncTimerRef.current) {
      clearTimeout(urlSyncTimerRef.current);
    }

    // Debounce URL updates to prevent blocking the main thread
    urlSyncTimerRef.current = setTimeout(() => {
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

      // Only update URL if params actually changed
      const newParamsString = newParams.toString();
      if (newParamsString !== lastUrlParamsRef.current) {
        lastUrlParamsRef.current = newParamsString;
        setSearchParams(newParams, { replace: true });
      }
    }, URL_SYNC_DEBOUNCE_DELAY);

    return () => {
      if (urlSyncTimerRef.current) {
        clearTimeout(urlSyncTimerRef.current);
      }
    };
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
