import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  Pagination,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { themeColors } from '@base/theme';

export interface TablePaginationProps {
  /** Total number of items */
  count: number;
  /** Current page (0-indexed) */
  page: number;
  /** Number of rows per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /**
   * When true, renders a compact inline variant suitable for embedding inside
   * a section header row (horizontal, tighter padding, smaller font).
   */
  inline?: boolean;
}

export const TablePagination = ({
  count,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  inline = false,
}: TablePaginationProps) => {
  const { t } = useTranslation([ns.common]);

  const totalPages = Math.ceil(count / pageSize);

  const handlePageSizeChange = (newSize: number) => {
    onPageSizeChange(newSize);
    onPageChange(0); // Reset to first page when changing page size
  };

  if (inline) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {t('common:pagination.rowsPerPage')}:
        </Typography>
        <FormControl size="small">
          <Select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            size="small"
            sx={{
              minWidth: 55,
              '& .MuiSelect-select': { py: 0.25, fontSize: '0.75rem' },
            }}
          >
            {pageSizeOptions.map((size) => (
              <MenuItem key={size} value={size} sx={{ fontSize: '0.75rem' }}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Pagination
          count={totalPages}
          page={page + 1}
          onChange={(_, newPage) => onPageChange(newPage - 1)}
          color="primary"
          showFirstButton
          showLastButton
          size="small"
          sx={{ '& .MuiPaginationItem-root': { fontSize: '0.7rem', minWidth: 24, height: 24 } }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: themeColors.bgLight,
        borderTop: `1px solid ${themeColors.borderLight}`,
        px: 2,
        py: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t('common:pagination.rowsPerPage')}:
        </Typography>
        <FormControl size="small">
          <Select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            size="small"
            sx={{
              minWidth: 70,
              '& .MuiSelect-select': {
                py: 0.5,
                fontSize: '0.875rem',
              },
            }}
          >
            {pageSizeOptions.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Pagination
        count={totalPages}
        page={page + 1}
        onChange={(_, newPage) => onPageChange(newPage - 1)}
        color="primary"
        showFirstButton
        showLastButton
        size="small"
      />
    </Box>
  );
};
