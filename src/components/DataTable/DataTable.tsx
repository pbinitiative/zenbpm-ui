import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  CircularProgress,
  Typography,
} from '@mui/material';
import { TablePagination } from '@components/TablePagination';
import { themeColors } from '@base/theme';

export interface Column<T> {
  id: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

export type SortOrder = 'asc' | 'desc';

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: string, sortOrder: SortOrder) => void;
  onRowClick?: (row: T) => void;
  rowKey: keyof T;
  'data-testid'?: string;
  /** Optional toolbar content displayed above the table */
  toolbar?: React.ReactNode;
}

export const DataTable = <T extends object>({
  columns,
  data,
  loading = false,
  totalCount,
  page = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  onRowClick,
  rowKey,
  'data-testid': testId,
  toolbar,
}: DataTableProps<T>) => {
  const { t } = useTranslation([ns.common]);

  const handleSortClick = useCallback(
    (columnId: string) => {
      if (!onSortChange) return;

      const isAsc = sortBy === columnId && sortOrder === 'asc';
      onSortChange(columnId, isAsc ? 'desc' : 'asc');
    },
    [sortBy, sortOrder, onSortChange]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      onPageChange?.(newPage);
    },
    [onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      onPageSizeChange?.(newSize);
      onPageChange?.(0);
    },
    [onPageSizeChange, onPageChange]
  );

  const displayedData = useMemo(() => {
    // If pagination is server-side, just return data as-is
    if (onPageChange && totalCount !== undefined) {
      return data;
    }

    // Client-side pagination
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize, onPageChange, totalCount]);

  const effectiveTotalCount = totalCount ?? data.length;

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (column.render) {
      return column.render(row);
    }
    const value = row[column.id as keyof T];
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  };

  return (
    <Paper
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: `0 1px 3px ${themeColors.shadows.light}`,
      }}
      data-testid={testId}
    >
      {/* Toolbar row */}
      {toolbar && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {toolbar}
        </Box>
      )}

      <TableContainer sx={{ position: 'relative' }}>
        {/* Loading overlay - shows on top of existing data */}
        {loading && displayedData.length > 0 && (
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
                  align={column.align || 'left'}
                  sx={{ width: column.width }}
                >
                  {column.sortable && onSortChange ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : 'asc'}
                      onClick={() => handleSortClick(String(column.id))}
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
            {loading && displayedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    {t('common:table.loading')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : displayedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {t('common:table.noData')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedData.map((row) => (
                <TableRow
                  key={String(row[rowKey])}
                  hover={!!onRowClick}
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.id)} align={column.align || 'left'}>
                      {getCellValue(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        count={effectiveTotalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </Paper>
  );
};
