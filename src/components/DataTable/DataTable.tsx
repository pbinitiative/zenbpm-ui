import { useMemo, useCallback, Fragment } from 'react';
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

/**
 * A named group of rows rendered under a section header row inside DataTable.
 * When `sections` is provided on DataTable, the flat `data` prop is ignored —
 * all rows are derived from the sections. Pagination spans the combined total.
 */
export interface DataTableSection<T> {
  /** Label displayed in the section header row. */
  label: string;
  /** Rows belonging to this section. */
  data: T[];
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  /** Flat row array. Ignored when `sections` is provided. */
  data: T[];
  /**
   * When provided, rows are rendered grouped under labelled section headers.
   * The `data` prop is ignored. Pagination spans all sections combined.
   * Sorting (if enabled) is applied independently within each section.
   */
  sections?: DataTableSection<T>[];
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
  sections,
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

  // When sections are provided, derive the flat list from them for pagination.
  const flatData = useMemo(
    () => (sections ? sections.flatMap((s) => s.data) : data),
    [sections, data]
  );

  const displayedData = useMemo(() => {
    // If pagination is server-side, just return data as-is
    if (onPageChange && totalCount !== undefined) {
      return flatData;
    }

    // Client-side pagination
    const start = page * pageSize;
    return flatData.slice(start, start + pageSize);
  }, [flatData, page, pageSize, onPageChange, totalCount]);

  // When sections are used with client-side pagination, we need to know which
  // rows of the current page belong to which section.
  const displayedSections = useMemo(() => {
    if (!sections) return null;

    const start = (onPageChange && totalCount !== undefined) ? 0 : page * pageSize;
    const end = start + displayedData.length;
    let offset = 0;
    const result: Array<{ label: string; rows: T[] }> = [];

    for (const section of sections) {
      const sectionStart = offset;
      const sectionEnd = offset + section.data.length;

      // Rows of this section that fall within the current page window
      const visibleStart = Math.max(start, sectionStart) - sectionStart;
      const visibleEnd = Math.min(end, sectionEnd) - sectionStart;

      if (visibleEnd > visibleStart) {
        result.push({
          label: section.label,
          rows: section.data.slice(visibleStart, visibleEnd),
        });
      }

      offset = sectionEnd;
    }

    return result;
  }, [sections, displayedData.length, page, pageSize, onPageChange, totalCount]);

  const effectiveTotalCount = totalCount ?? flatData.length;

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

  const renderDataRow = (row: T) => (
    <TableRow
      key={String(row[rowKey])}
      hover={!!onRowClick}
      onClick={() => onRowClick?.(row)}
      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
    >
      {columns.map((column) => (
        <TableCell key={String(column.id)} align={column.align || 'left'}>
          {getCellValue(row, column)}
        </TableCell>
      ))}
    </TableRow>
  );

  const renderBody = () => {
    if (loading && displayedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              {t('common:table.loading')}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (displayedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
            <Typography color="text.secondary">
              {t('common:table.noData')}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    // Sectioned rendering
    if (displayedSections) {
      return displayedSections.map((section, index) => (
        <Fragment key={section.label || `section-${index}`}>
          {section.label && (
            <TableRow
              data-testid="section-header"
              sx={{ bgcolor: themeColors.bgLight }}
            >
              <TableCell
                colSpan={columns.length}
                sx={{ py: 1, px: 2.5, borderBottom: `1px solid ${themeColors.borderLight}` }}
              >
                <Typography sx={{ fontSize: '0.8125rem', color: themeColors.textSecondary }}>
                  {(() => {
                    const sepIdx = section.label.indexOf(': ');
                    if (sepIdx === -1) return <strong>{section.label}</strong>;
                    return (
                      <>
                        <strong>{section.label.slice(0, sepIdx + 2)}</strong>
                        {section.label.slice(sepIdx + 2)}
                      </>
                    );
                  })()}
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {section.rows.map(renderDataRow)}
        </Fragment>
      ));
    }

    // Flat rendering (original behaviour)
    return displayedData.map(renderDataRow);
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
            {renderBody()}
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
