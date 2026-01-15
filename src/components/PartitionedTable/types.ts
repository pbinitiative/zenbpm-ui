import type { Column, SortOrder } from '@components/DataTable';

// Generic partition data structure matching the API response
export interface PartitionData<T> {
  partition: number;
  items: T[];
  /** Total count of items in this partition (for pagination display) */
  count?: number;
}

export interface PartitionedResponse<T> {
  partitions: PartitionData<T>[];
  page: number;
  size: number;
  count: number;
  totalCount: number;
}

// Filter values type for passing to fetch functions
export type FilterValues = Record<string, string | string[] | { from?: string; to?: string } | undefined>;

export interface PartitionedTableProps<T extends object> {
  columns: Column<T>[];
  rowKey: keyof T;

  // Data fetching - simplified, no separate count endpoint needed
  fetchData: (params: {
    page: number;
    size: number;
    filters?: FilterValues;
    sortBy?: string;
    sortOrder?: SortOrder;
  }) => Promise<PartitionedResponse<T>>;

  // Current filter values (from parent)
  filters?: FilterValues;

  // Optional handlers
  onRowClick?: (row: T) => void;

  // Sorting
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
  /** Use server-side sorting instead of client-side (default: false) */
  serverSideSorting?: boolean;

  // Additional toolbar content (filter bar)
  toolbar?: React.ReactNode;

  // Filters panel (expandable, rendered below toolbar)
  filtersPanel?: React.ReactNode;

  // Test ID
  'data-testid'?: string;

  // Refresh trigger
  refreshKey?: number;
}

// Re-export types from DataTable
export type { Column, SortOrder } from '@components/DataTable';

// These are exported from index for backwards compatibility
export interface PartitionCount {
  partition: number;
  count: number;
}

export interface PartitionCounts {
  partitions: PartitionCount[];
}
