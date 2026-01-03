import { Box, Typography } from '@mui/material';
import { FilterControl } from './FilterControl';
import type { GroupFilterConfig, FilterValues } from '../types';

interface FilterGroupProps {
  filter: GroupFilterConfig;
  filterValues: FilterValues;
  onFilterChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
}

export const FilterGroup = ({ filter, filterValues, onFilterChange }: FilterGroupProps) => {
  const columns = filter.columns ?? 5;

  // Separate left and right aligned items
  const leftItems = filter.items.filter((item) => (item.align ?? 'left') === 'left');
  const rightItems = filter.items.filter((item) => item.align === 'right');

  // Calculate columns used by left items
  const leftColumnsUsed = leftItems.reduce((sum, item) => sum + (item.colSpan ?? 1), 0);
  // Calculate columns used by right items
  const rightColumnsUsed = rightItems.reduce((sum, item) => sum + (item.colSpan ?? 1), 0);
  // Calculate empty columns between left and right
  const emptyColumns = Math.max(0, columns - leftColumnsUsed - rightColumnsUsed);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 2,
        width: '100%',
      }}
    >
      {filter.label && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 500, gridColumn: `1 / -1` }}
        >
          {filter.label}
        </Typography>
      )}
      {leftItems.map((item) => {
        const colSpan = item.colSpan ?? 1;
        return (
          <Box
            key={item.id}
            sx={{
              gridColumn: `span ${colSpan}`,
              '& > *': { width: '100%' },
              '& .MuiFormControl-root': { width: '100%', minWidth: 'unset', maxWidth: 'unset' },
              '& .MuiAutocomplete-root': { width: '100%', minWidth: 'unset', maxWidth: 'unset' },
              '& .MuiTextField-root': { width: '100%' },
            }}
          >
            <FilterControl
              filter={item}
              value={filterValues[item.id]}
              onChange={onFilterChange}
            />
          </Box>
        );
      })}
      {/* Spacer to push right items to the end */}
      {emptyColumns > 0 && rightItems.length > 0 && (
        <Box sx={{ gridColumn: `span ${emptyColumns}` }} />
      )}
      {/* Right-aligned items */}
      {rightItems.map((item) => {
        const colSpan = item.colSpan ?? 1;
        return (
          <Box
            key={item.id}
            sx={{
              gridColumn: `span ${colSpan}`,
              '& > *': { width: '100%' },
              '& .MuiFormControl-root': { width: '100%', minWidth: 'unset', maxWidth: 'unset' },
              '& .MuiAutocomplete-root': { width: '100%', minWidth: 'unset', maxWidth: 'unset' },
              '& .MuiTextField-root': { width: '100%' },
            }}
          >
            <FilterControl
              filter={item}
              value={filterValues[item.id]}
              onChange={onFilterChange}
            />
          </Box>
        );
      })}
    </Box>
  );
};
