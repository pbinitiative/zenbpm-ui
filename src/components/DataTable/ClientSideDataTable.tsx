import { useState, useMemo } from 'react';
import { DataTable } from './DataTable';
import type { Column, SortOrder, DataTableSection } from './DataTable';

export interface ClientSideDataTableProps<T> {
  columns: Column<T>[];
  /** Full dataset — fetched once, paginated and sorted in memory. */
  data: T[];
  /**
   * When provided, rows are rendered grouped under labelled section headers.
   * The `data` prop is ignored. Each section is paginated independently with
   * the same page window — pageSize rows from each section per page.
   */
  sections?: DataTableSection<T>[];
  loading?: boolean;
  /** Initial page size (default: 10). */
  defaultPageSize?: number;
  /** Column id to sort by on initial render. */
  defaultSortBy?: string;
  /** Initial sort direction (default: 'asc'). */
  defaultSortOrder?: SortOrder;
  onRowClick?: (row: T) => void;
  rowKey: keyof T;
  'data-testid'?: string;
  /** Optional toolbar content displayed above the table */
  toolbar?: React.ReactNode;
  /** Called when a breadcrumb element-ID link in a section header is clicked. */
  onElementIdClick?: (elementId: string) => void;
}

/**
 * A DataTable wrapper that handles pagination and sorting entirely on the
 * client side. Pass the full dataset once; this component slices and sorts
 * it in memory and delegates rendering (including the pagination bar) to
 * DataTable.
 *
 * When `sections` is provided, each section is paginated with the same page
 * window (rows [page*pageSize .. (page+1)*pageSize] from every section).
 * Empty sections for the current page are hidden. The total page count is
 * driven by the largest section.
 */
export const ClientSideDataTable = <T extends object>({
  columns,
  data,
  sections,
  loading = false,
  defaultPageSize = 10,
  defaultSortBy,
  defaultSortOrder = 'asc',
  onRowClick,
  rowKey,
  'data-testid': testId,
  toolbar,
  onElementIdClick,
}: ClientSideDataTableProps<T>) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortBy, setSortBy] = useState<string | undefined>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const handleSortChange = (newSortBy: string, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // ── Sorting ────────────────────────────────────────────────────────────────

  const sortRows = (rows: T[]): T[] => {
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortBy as keyof T];
      const bVal = b[sortBy as keyof T];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp  = (typeof aVal === 'number' && typeof bVal === 'number')
        ? (aVal < bVal ? -1 : 1)
        : String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  };

  const sortedData = useMemo(() => sortRows(data), [data, sortBy, sortOrder]);

  const sortedSections = useMemo(() => {
    if (!sections) return undefined;
    return sections.map((section) => ({
      ...section,
      data: sortRows(section.data),
    }));
  }, [sections, sortBy, sortOrder]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  // Flat mode: slice the single sorted dataset.
  const pageData = useMemo(() => {
    if (sortedSections) return [];
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, sortedSections, page, pageSize]);

  // Sectioned mode: apply the same [start, end) window to every section
  // independently; hide sections that have no rows on this page.
  // A stable `key` (original index before filtering) is attached so that
  // DataTable's React Fragment keys do not shift when empty sections are
  // filtered out, which would cause duplicate/stale rows.
  const pageSections = useMemo(() => {
    if (!sortedSections) return undefined;
    const start = page * pageSize;
    const end = start + pageSize;

    return sortedSections
      .map((section, originalIndex) => ({
        label: section.label,
        callPath: section.callPath,
        key: String(originalIndex),
        data: section.data.slice(start, end),
      }))
      .filter((s) => s.data.length > 0);
  }, [sortedSections, page, pageSize]);

  // totalCount drives the number of pages shown in the paginator.
  // • Flat mode    → total number of rows.
  // • Sectioned    → length of the longest section (all sections share one
  //                  page window, so the deepest section determines how many
  //                  pages there are).
  const totalCount = useMemo(() => {
    if (sections && sections.length > 0) {
      return Math.max(...sections.map((s) => s.data.length));
    }
    return data.length;
  }, [sections, data]);

  return (
    <DataTable
      columns={columns}
      data={pageData}
      sections={pageSections}
      loading={loading}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      onRowClick={onRowClick}
      rowKey={rowKey}
      data-testid={testId}
      toolbar={toolbar}
      onElementIdClick={onElementIdClick}
    />
  );
};
