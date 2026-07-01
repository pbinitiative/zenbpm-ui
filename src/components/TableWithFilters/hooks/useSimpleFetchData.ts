import { useState, useEffect, useRef, useTransition } from 'react';
import type { SortOrder } from '@components/DataTable';
import type { FilterValues, SimpleFetchParams, SimpleFetchResult } from '../types';

// Debounce delay for filter changes (ms) — mirrors usePartitionedData
const FILTER_DEBOUNCE_DELAY = 300;

export interface UseSimpleFetchDataOptions<T> {
  fetchData: (params: SimpleFetchParams) => Promise<SimpleFetchResult<T>>;
  page: number;
  pageSize: number;
  filterValues?: FilterValues;
  sortBy?: string;
  sortOrder?: SortOrder;
  refreshKey?: number;
  onError?: (error: unknown) => void;
  /** If set, table re-fetches data on this interval (ms). Set to 0/undefined to disable. */
  autoRefreshInterval?: number;
}

interface UseSimpleFetchDataResult<T> {
  data: T[];
  loading: boolean;
  totalCount: number;
}

/**
 * Manages server-side data fetching for simple mode tables.
 * Pass `null` to disable fetching (when tableConfig.fetchData is not provided).
 */
export function useSimpleFetchData<T>(
  options: UseSimpleFetchDataOptions<T> | null
): UseSimpleFetchDataResult<T> | null {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  // Bumped by the auto-refresh interval to trigger a re-fetch.
  const [autoRefreshTick, setAutoRefreshTick] = useState(0);
  const lastTickRef = useRef(autoRefreshTick);
  const serializedFilters = JSON.stringify(options?.filterValues);

  const [, startTransition] = useTransition();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);
  const prevFiltersRef = useRef<FilterValues | undefined>(options?.filterValues);

  useEffect(() => {
    if (!options) return;

    const { fetchData, page, pageSize, filterValues, sortBy, sortOrder = 'asc', onError } = options;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData({
          page: page + 1, // API uses 1-based pagination
          size: pageSize,
          filters: filterValues,
          sortBy,
          sortOrder,
        });
        startTransition(() => {
          setData(result.items);
          setTotalCount(result.totalCount);
        });
      } catch (err) {
        onError?.(err);
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const filtersChanged =
      JSON.stringify(options.filterValues) !== JSON.stringify(prevFiltersRef.current);
    prevFiltersRef.current = options.filterValues;

    if (isFirstRenderRef.current || !filtersChanged) {
      isFirstRenderRef.current = false;
      void loadData();
    } else {
      // Debounce filter changes to avoid excessive requests while typing
      debounceTimerRef.current = setTimeout(() => {
        void loadData();
      }, FILTER_DEBOUNCE_DELAY);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options?.fetchData,
    options?.page,
    options?.pageSize,
    options?.filterValues,
    options?.sortBy,
    options?.sortOrder,
    options?.refreshKey,
    autoRefreshTick,
    // `options` itself is intentionally excluded — individual fields are listed above
  ]);

  // Auto-refresh: re-fetch on a fixed interval (ms) so the table stays in sync
  // with the rest of the page (e.g. live element counts on the BPMN diagram).
  useEffect(() => {
    const autoRefreshInterval = options?.autoRefreshInterval;
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      // Skip refresh when the browser tab is hidden — no point fetching
      // data the user isn't looking at. Mirrors useInstanceData behavior.
      if (typeof document !== 'undefined' && document.hidden) return;
      setAutoRefreshTick((tick) => tick + 1);
    }, autoRefreshInterval);
    return () => clearInterval(intervalId);
  }, [options?.autoRefreshInterval]);

  if (!options) return null;

  return { data, loading, totalCount };
}
