import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { useNotification } from '@base/contexts';
import { stringify } from '../utils/stringify';
import type { PartitionedResponse, FilterValues, PartitionData, SortOrder } from '../types';

// Debounce delay for filter changes (ms)
const FILTER_DEBOUNCE_DELAY = 300;

interface UsePartitionedDataOptions<T extends object> {
  fetchData: (params: {
    page: number;
    size: number;
    filters?: FilterValues;
    sortBy?: string;
    sortOrder?: SortOrder;
  }) => Promise<PartitionedResponse<T>>;
  filters?: FilterValues;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
  serverSideSorting?: boolean;
  refreshKey?: number;
}

interface UsePartitionedDataResult<T extends object> {
  data: PartitionedResponse<T> | null;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  localSortBy: string | undefined;
  localSortOrder: SortOrder;
  handleSortChange: (columnId: string) => void;
  sortedPartitions: PartitionData<T>[];
  maxPartitionCount: number;
}

export function usePartitionedData<T extends object>({
  fetchData,
  filters,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  serverSideSorting = false,
  refreshKey = 0,
}: UsePartitionedDataOptions<T>): UsePartitionedDataResult<T> {
  const { t } = useTranslation([ns.common]);
  const { showError } = useNotification();

  // State
  const [data, setData] = useState<PartitionedResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Local sorting state
  const [localSortBy, setLocalSortBy] = useState<string | undefined>(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState<SortOrder>(sortOrder);

  // Use transition to keep UI responsive during data updates
  const [, startTransition] = useTransition();

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if this is the first render (skip debounce for initial load)
  const isFirstRenderRef = useRef(true);
  // Track previous filters to detect filter changes
  const prevFiltersRef = useRef<FilterValues | undefined>(filters);

  // Fetch data when page, filters, sorting, or refreshKey change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchData({
          page: page + 1, // API uses 1-based pagination
          size: pageSize,
          filters,
          sortBy: serverSideSorting ? localSortBy : undefined,
          sortOrder: serverSideSorting ? localSortOrder : undefined,
        });
        // Use transition to keep UI responsive during heavy data update
        startTransition(() => {
          setData(result);
        });
      } catch (err) {
        setError(t('common:errors.loadFailed'));
        showError(t('common:errors.loadFailed'));
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check if only filters changed (not page, sort, or refresh)
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(prevFiltersRef.current);
    prevFiltersRef.current = filters;

    // Skip debounce on first render or when non-filter params change
    if (isFirstRenderRef.current || !filtersChanged) {
      isFirstRenderRef.current = false;
      void loadData();
    } else {
      // Debounce filter changes to prevent UI freeze
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
  }, [fetchData, page, pageSize, filters, refreshKey, serverSideSorting, localSortBy, localSortOrder]);

  // Sort data locally (only when not using server-side sorting)
  const sortedPartitions = useMemo(() => {
    if (!data) return [];

    // Skip client-side sorting if using server-side sorting
    if (serverSideSorting) {
      return data.partitions;
    }

    return data.partitions.map((partition) => {
      if (!localSortBy) return partition;

      const sortedItems = [...partition.items].sort((a, b) => {
        const aValue = (a as Record<string, unknown>)[localSortBy];
        const bValue = (b as Record<string, unknown>)[localSortBy];

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return localSortOrder === 'asc' ? 1 : -1;
        if (bValue == null) return localSortOrder === 'asc' ? -1 : 1;

        // String comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return localSortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        // Number comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return localSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Default comparison - handle objects by JSON.stringify
        const aStr = stringify(aValue);
        const bStr = stringify(bValue);
        return localSortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });

      return { ...partition, items: sortedItems };
    });
  }, [data, localSortBy, localSortOrder, serverSideSorting]);

  // Handlers
  const handleSortChange = useCallback(
    (columnId: string) => {
      const isAsc = localSortBy === columnId && localSortOrder === 'asc';
      const newOrder: SortOrder = isAsc ? 'desc' : 'asc';
      setLocalSortBy(columnId);
      setLocalSortOrder(newOrder);
      onSortChange?.(columnId, newOrder);
    },
    [localSortBy, localSortOrder, onSortChange]
  );

  // Calculate max count from any partition (for pagination - all partitions paginate together)
  const maxPartitionCount = useMemo(() => {
    if (!data?.partitions) return 0;
    return Math.max(...data.partitions.map((p) => p.count ?? p.items.length));
  }, [data]);

  return {
    data,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    localSortBy,
    localSortOrder,
    handleSortChange,
    sortedPartitions,
    maxPartitionCount,
  };
}
