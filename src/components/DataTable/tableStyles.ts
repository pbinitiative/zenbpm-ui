import type { SxProps, Theme } from '@mui/material/styles';
import type { Column } from './DataTable';

/**
 * Shared `sx` for the outer `TableContainer` of every scrollable data table
 * (DataTable, PartitionedTable, ...).
 *
 * Forces a horizontal scrollbar when the rendered columns are wider than the
 * available width, so individual cells stay readable on narrow viewports. The
 * vertical axis is hidden because the parent `Paper` already constrains the
 * overall table height and we don't want a second scrollbar to appear.
 */
export const scrollableTableContainerSx: SxProps<Theme> = {
  position: 'relative',
  overflowX: 'auto',
  overflowY: 'hidden',
};

/**
 * Shared `sx` factory for the header `TableCell` of every scrollable data
 * table.
 *
 * - `whiteSpace: 'nowrap'` keeps the header label on a single line so the
 *   header row drives the natural table width and the container can scroll
 *   horizontally when columns overflow.
 * - `minWidth` (defaulting to 120px when no explicit width is set) prevents a
 *   column from being squeezed to 0 by the other columns' minimum intrinsic
 *   widths.
 */
export const scrollableTableHeaderCellSx = <T extends object>(
  column: Column<T>,
): SxProps<Theme> => ({
  width: column.width,
  whiteSpace: 'nowrap',
  minWidth: column.width ?? 120,
});
