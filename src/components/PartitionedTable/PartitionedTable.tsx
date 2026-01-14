import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { themeColors } from '@base/theme';
import { useNotification } from '@base/contexts';
import { TablePagination } from '@components/TablePagination';
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

// Helper function to generate consistent colors for partitions
function getPartitionColor(partitionId: number): string {
  return themeColors.partitionColors[(partitionId - 1) % themeColors.partitionColors.length];
}

export const PartitionedTable = <T extends object>({
  columns,
  rowKey,
  fetchData,
  filters,
  onRowClick,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  serverSideSorting = false,
  toolbar,
  filtersPanel,
  'data-testid': testId,
  refreshKey = 0,
}: PartitionedTableProps<T>) => {
  const { t } = useTranslation([ns.common]);
  // Notification hooks available for future use
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
        setData(result);
      } catch (err) {
        setError(t('common:errors.loadFailed'));
        showError(t('common:errors.loadFailed'));
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
          return localSortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Number comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return localSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Default comparison
        const aStr = String(aValue);
        const bStr = String(bValue);
        return localSortOrder === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
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

  return (
    <Box data-testid={testId}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table with toolbar wrapped in Paper */}
      <Paper
        sx={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: `0 1px 3px ${themeColors.shadows.light}`,
        }}
      >
        {/* Toolbar row */}
        {toolbar && (
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${themeColors.borderLight}`,
            }}
          >
            {toolbar}
          </Box>
        )}

        {/* Filters panel (expandable) */}
        {filtersPanel}

        {/* Table with grouped rows */}
        <TableContainer sx={{ position: 'relative' }}>
          {/* Loading overlay */}
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: themeColors.overlay.loading,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <CircularProgress size={32} />
            </Box>
          )}
          <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  sx={{
                    width: column.width,
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={localSortBy === column.id}
                      direction={localSortBy === column.id ? localSortOrder : 'asc'}
                      onClick={() => handleSortChange(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !data ? (
              // Initial loading - show empty row to maintain table height
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {t('common:table.loading')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sortedPartitions.length === 0 ||
              sortedPartitions.every((p) => p.items.length === 0) ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {t('common:table.noData')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedPartitions.map((partition) => (
                <Fragment key={partition.partition}>
                  {/* Partition header row */}
                  <TableRow
                    data-testid="partition-header"
                    sx={{
                      bgcolor: themeColors.bgLight,
                      '& td': {
                        borderBottom: `1px solid ${themeColors.borderLight}`,
                      },
                    }}
                  >
                    <TableCell
                      colSpan={columns.length}
                      sx={{
                        py: 1,
                        px: 2.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: getPartitionColor(partition.partition),
                            }}
                          />
                          <Typography
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              color: themeColors.textSecondary,
                            }}
                          >
                            {t('common:table.partition')} {partition.partition}
                          </Typography>
                        </Box>
                        {partition.count !== undefined && partition.count > 0 && (
                          (() => {
                            const startItem = page * pageSize + 1;
                            const isOutOfRange = startItem > partition.count;

                            if (isOutOfRange) {
                              return (
                                <Typography
                                  sx={{
                                    fontSize: '0.75rem',
                                    color: 'error.main',
                                    bgcolor: 'error.lighter',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 0.5,
                                    fontFamily: '"SF Mono", Monaco, monospace',
                                  }}
                                >
                                  {startItem} &gt; {partition.count}
                                </Typography>
                              );
                            }

                            const endItem = Math.min((page + 1) * pageSize, partition.count);
                            return (
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  color: themeColors.textMuted,
                                  fontFamily: '"SF Mono", Monaco, monospace',
                                }}
                              >
                                {startItem}–{endItem} of {partition.count}
                              </Typography>
                            );
                          })()
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Data rows for this partition */}
                  {partition.items.map((row) => (
                    <TableRow
                      key={String(row[rowKey])}
                      data-testid="data-row"
                      hover
                      onClick={() => onRowClick?.(row)}
                      sx={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        '&:last-child td': {
                          borderBottom: `1px solid ${themeColors.borderLight}`,
                        },
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell key={String(column.id)} align={column.align}>
                          {column.render
                            ? column.render(row)
                            : String((row as Record<string, unknown>)[String(column.id)] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          count={maxPartitionCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Paper>
    </Box>
  );
};

// Re-export types for convenience
export type { PartitionCounts, PartitionCount } from './index';
