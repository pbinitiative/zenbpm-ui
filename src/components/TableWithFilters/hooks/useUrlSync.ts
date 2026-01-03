import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOrder } from '@components/DataTable';
import type { FilterConfig, FilterValues, SimpleFilterConfig } from '../types';
import { flattenFilters } from './useFilterState';

interface UseUrlSyncOptions {
  filters: FilterConfig[];
  filterValues: FilterValues;
  sortBy?: string;
  sortOrder: SortOrder;
  syncWithUrl: boolean;
  syncSortingWithUrl: boolean;
  initialFilterValues: FilterValues;
  defaultSortBy?: string;
  defaultSortOrder: SortOrder;
  onFilterChange?: (filters: FilterValues) => void;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
  setInternalFilterValues: React.Dispatch<React.SetStateAction<FilterValues>>;
  setSortBy: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSortOrder: React.Dispatch<React.SetStateAction<SortOrder>>;
}

interface UseUrlSyncResult {
  getInitialFilterValues: () => FilterValues;
  getInitialSorting: () => { sortBy?: string; sortOrder: SortOrder };
}

export const useUrlSync = ({
  filters,
  filterValues,
  sortBy,
  sortOrder,
  syncWithUrl,
  syncSortingWithUrl,
  initialFilterValues,
  defaultSortBy,
  defaultSortOrder,
  onFilterChange,
  onSortChange,
  setInternalFilterValues,
  setSortBy,
  setSortOrder,
}: UseUrlSyncOptions): UseUrlSyncResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitializedRef = useRef(false);

  // Parse URL params to filter values
  const getFiltersFromUrl = useCallback((): FilterValues => {
    const urlFilters: FilterValues = {};
    const flatFilters = flattenFilters(filters);
    flatFilters.forEach((filter: SimpleFilterConfig) => {
      const paramValue = searchParams.get(filter.id);
      if (paramValue !== null) {
        // Handle dateRange type specially
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
        // Check for dateRange params
        const fromValue = searchParams.get(`${filter.id}From`);
        const toValue = searchParams.get(`${filter.id}To`);
        if (fromValue || toValue) {
          urlFilters[filter.id] = { from: fromValue || undefined, to: toValue || undefined };
        }
      }
    });
    return urlFilters;
  }, [filters, searchParams]);

  // Initialize filter values from URL or defaults
  const getInitialFilterValues = useCallback((): FilterValues => {
    if (syncWithUrl) {
      const urlFilters = getFiltersFromUrl();
      // Merge URL filters with initial values (URL takes precedence)
      return { ...initialFilterValues, ...urlFilters };
    }
    return initialFilterValues;
  }, [syncWithUrl, getFiltersFromUrl, initialFilterValues]);

  // Get initial sorting from URL
  const getInitialSorting = useCallback((): { sortBy?: string; sortOrder: SortOrder } => {
    if (syncSortingWithUrl) {
      const urlSortBy = searchParams.get('sortBy');
      const urlSortOrder = searchParams.get('sortOrder') as SortOrder | null;
      return {
        sortBy: urlSortBy || defaultSortBy,
        sortOrder: urlSortOrder || defaultSortOrder,
      };
    }
    return { sortBy: defaultSortBy, sortOrder: defaultSortOrder };
  }, [syncSortingWithUrl, searchParams, defaultSortBy, defaultSortOrder]);

  // On mount, sync URL params to filter and sorting state
  useEffect(() => {
    if (isInitializedRef.current) return;

    // Sync filters from URL
    if (syncWithUrl) {
      const urlFilters = getFiltersFromUrl();
      const hasUrlFilters = Object.keys(urlFilters).some((key) => {
        const value = urlFilters[key];
        if (typeof value === 'string') return value !== '';
        if (typeof value === 'object' && value !== null) {
          const rangeValue = value as { from?: string; to?: string };
          return rangeValue.from || rangeValue.to;
        }
        return false;
      });

      if (hasUrlFilters) {
        // Merge with initial values
        const mergedFilters = { ...initialFilterValues, ...urlFilters };

        if (onFilterChange) {
          // Controlled mode: notify parent
          onFilterChange(mergedFilters);
        } else {
          // Uncontrolled mode: update internal state
          setInternalFilterValues(mergedFilters);
        }
      }
    }

    // Sync sorting from URL and notify external handler
    if (syncSortingWithUrl) {
      const urlSortBy = searchParams.get('sortBy');
      const urlSortOrder = searchParams.get('sortOrder') as SortOrder | null;

      if (urlSortBy) {
        setSortBy(urlSortBy);
        setSortOrder(urlSortOrder || 'asc');
        // Notify external handler for server-side sorting
        onSortChange?.(urlSortBy, urlSortOrder || 'asc');
      }
    }

    isInitializedRef.current = true;
  }, [
    syncWithUrl,
    syncSortingWithUrl,
    onFilterChange,
    getFiltersFromUrl,
    initialFilterValues,
    searchParams,
    onSortChange,
    setInternalFilterValues,
    setSortBy,
    setSortOrder,
  ]);

  // Sync URL with filter and sorting values when they change
  useEffect(() => {
    if (!syncWithUrl && !syncSortingWithUrl) return;
    if (!isInitializedRef.current) return;

    const newParams = new URLSearchParams();

    // Add filter params
    if (syncWithUrl) {
      const flatFilters = flattenFilters(filters);
      flatFilters.forEach((filter: SimpleFilterConfig) => {
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

    // Add sorting params
    if (syncSortingWithUrl && sortBy) {
      newParams.set('sortBy', sortBy);
      newParams.set('sortOrder', sortOrder);
    }

    setSearchParams(newParams, { replace: true });
  }, [syncWithUrl, syncSortingWithUrl, filterValues, filters, sortBy, sortOrder, setSearchParams]);

  return {
    getInitialFilterValues,
    getInitialSorting,
  };
};
