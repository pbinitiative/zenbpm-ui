import { Fragment } from 'react';
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
import { TablePagination } from '@components/TablePagination';

// Types
import type { PartitionedTableProps } from './types';

// Hooks
import { usePartitionedData } from './hooks/usePartitionedData';

// Utils
import { stringify } from './utils/stringify';

// Components
import { PartitionHeader } from './components/PartitionHeader';

// Re-export types
export type {
  PartitionData,
  PartitionedResponse,
  FilterValues,
  PartitionedTableProps,
  PartitionCount,
  PartitionCounts,
} from './types';

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

  const {
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
  } = usePartitionedData({
    fetchData,
    filters,
    sortBy,
    sortOrder,
    onSortChange,
    serverSideSorting,
    refreshKey,
  });

  return (
    <Box data-testid={testId}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: `0 1px 3px ${themeColors.shadows.light}`,
        }}
      >
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

        {filtersPanel}

        <TableContainer sx={{ position: 'relative' }}>
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
                pointerEvents: 'none', // Don't block interactions with underlying elements
              }}
            >
              <CircularProgress size={32} />
            </Box>
          )}

          <Table>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={String(column.id)} align={column.align} sx={{ width: column.width }}>
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
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">{t('common:table.loading')}</Typography>
                  </TableCell>
                </TableRow>
              ) : sortedPartitions.length === 0 || sortedPartitions.every((p) => p.items.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">{t('common:table.noData')}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPartitions.map((partition) => (
                  <Fragment key={partition.partition}>
                    <PartitionHeader
                      partition={partition.partition}
                      count={partition.count}
                      page={page}
                      pageSize={pageSize}
                      colSpan={columns.length}
                    />

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
                              : stringify((row as Record<string, unknown>)[String(column.id)])}
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
