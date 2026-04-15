import { useMemo, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Link,
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
 * all rows are derived from the sections.
 *
 * The table has one global paginator. Each section's `data` must already be
 * pre-sliced to the current page by the caller.
 */
export interface DataTableSection<T> {
  /** Label displayed in the section header row. */
  label: string;
  /**
   * Optional breadcrumb path of calling element IDs for this section.
   * When present and non-empty the section header renders a clickable
   * breadcrumb below the label.
   */
  callPath?: string[];
  /** Rows for this section, pre-sliced to the current page by the caller. */
  data: T[];
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  /** Flat row array. Ignored when `sections` is provided. */
  data: T[];
  /**
   * When provided, rows are rendered grouped under labelled section headers.
   * The `data` prop is ignored. The single global paginator spans the combined
   * total across all sections.
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
  /**
   * Called when a breadcrumb element-ID link in a section header is clicked.
   */
  onElementIdClick?: (elementId: string) => void;
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
  onElementIdClick,
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
    (newPage: number) => { onPageChange?.(newPage); },
    [onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      onPageSizeChange?.(newSize);
      // TablePagination already calls onPageChange(0) on size change
    },
    [onPageSizeChange]
  );

  // DataTable is a pure renderer — all slicing is done by the caller.
  const displayedData = useMemo(
    () => (sections ? sections.flatMap((s) => s.data) : data),
    [sections, data]
  );

  const effectiveTotalCount = totalCount ?? displayedData.length;

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (column.render) return column.render(row);
    const value = row[column.id as keyof T];
    if (value === null || value === undefined) return '-';
    return String(value);
  };

  const renderDataRow = (row: T, sectionKey?: string) => (
    <TableRow
      key={sectionKey !== undefined ? `s${sectionKey}-${String(row[rowKey])}` : String(row[rowKey])}
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
    if (sections) {
      return sections.filter((section) => section.data.length > 0).map((section, index) => {
        const sectionKey = (section as { key?: string }).key ?? section.label ?? `section-${index}`;

        // Deduplicate consecutive identical entries in callPath
        const dedupedPath = section.callPath
          ? section.callPath.filter((id, i, arr) => i === 0 || id !== arr[i - 1])
          : undefined;

        const hasHeader = !!(section.label || (dedupedPath && dedupedPath.length > 0));

        return (
          <Fragment key={sectionKey}>
            {hasHeader && (
              <TableRow
                data-testid="section-header"
                sx={{ bgcolor: themeColors.bgLight }}
              >
                <TableCell
                  colSpan={columns.length}
                  sx={{ py: 0.5, px: 2.5, borderBottom: `1px solid ${themeColors.borderLight}` }}
                >
                  <Box sx={{ minHeight: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {/* Title line */}
                    {section.label && (
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
                    )}
                    {/* Breadcrumb line */}
                    {dedupedPath && dedupedPath.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: section.label ? 0.25 : 0 }}>
                        {dedupedPath.map((elementId, i) => (
                          <Fragment key={elementId}>
                            {i > 0 && (
                              <Typography component="span" sx={{ fontSize: '0.75rem', color: themeColors.textSecondary, mx: 0.25 }}>
                                {'>'}
                              </Typography>
                            )}
                            <Link
                              component="button"
                              onClick={() => onElementIdClick?.(elementId)}
                              sx={{
                                fontSize: '0.75rem',
                                color: themeColors.textSecondary,
                                textDecoration: 'underline',
                                textDecorationColor: 'transparent',
                                '&:hover': { color: 'primary.main', textDecorationColor: 'primary.main' },
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                p: 0,
                              }}
                            >
                              {elementId}
                            </Link>
                          </Fragment>
                        ))}
                      </Box>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {section.data.map((row) => renderDataRow(row, sectionKey))}
          </Fragment>
        );
      });
    }

    // Flat rendering
    return displayedData.map((row) => renderDataRow(row));
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
      {toolbar && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          {toolbar}
        </Box>
      )}

      <TableContainer sx={{ position: 'relative' }}>
        {loading && displayedData.length > 0 && (
          <Box
            sx={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              bgcolor: themeColors.overlay.loading,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={String(column.id)} align={column.align || 'left'} sx={{ width: column.width }}>
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

      {/* Global paginator — always rendered (shared across all sections) */}
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
