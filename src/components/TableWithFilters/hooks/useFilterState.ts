import { useState, useCallback, useMemo } from 'react';
import type { FilterConfig, FilterValues, SimpleFilterConfig, ActiveFilter } from '../types';
import { formatDisplayDateTime } from '@components/DateRangePicker/utils/dateFormatters';

/** Flatten filters - extract items from groups into a flat array */
export function flattenFilters(filters: FilterConfig[]): SimpleFilterConfig[] {
  const result: SimpleFilterConfig[] = [];
  filters.forEach((f) => {
    if (f.type === 'group') {
      result.push(...f.items);
    } else {
      result.push(f);
    }
  });
  return result;
}

interface UseFilterStateOptions {
  filters: FilterConfig[];
  initialFilterValues?: FilterValues;
  externalFilterValues?: FilterValues;
  onFilterChange?: (filters: FilterValues) => void;
}

interface UseFilterStateResult {
  filterValues: FilterValues;
  flattenedFilters: SimpleFilterConfig[];
  activeFilters: ActiveFilter[];
  handleFilterChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
  handleClearFilters: () => void;
  handleRemoveFilter: (filterId: string) => void;
  setInternalFilterValues: React.Dispatch<React.SetStateAction<FilterValues>>;
}

export const useFilterState = ({
  filters,
  initialFilterValues = {},
  externalFilterValues,
  onFilterChange,
}: UseFilterStateOptions): UseFilterStateResult => {
  const [internalFilterValues, setInternalFilterValues] = useState<FilterValues>(initialFilterValues);

  // Use external or internal filter values
  const filterValues = externalFilterValues ?? internalFilterValues;

  // Flatten filters - extract items from groups
  const flattenedFilters = useMemo(() => flattenFilters(filters), [filters]);

  // Get active filters for badges (all filters, flattened)
  const activeFilters = useMemo(() => {
    return flattenedFilters
      .filter((f) => {
        if (f.readonly) return false;
        if (f.hideFilterBadge) return false;

        const v = filterValues[f.id];
        if (typeof v === 'string') return v !== '';
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return v.from || v.to;
        return false;
      })
      .map((f) => {
        const value = filterValues[f.id];
        let displayValue = '';

        if (typeof value === 'string') {
          if (f.type === 'select' && f.options) {
            const option = f.options.find((o) => o.value === value);
            displayValue = option?.label || value;
          } else {
            displayValue = value;
          }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Format date range values for human-readable display
          const fromFormatted = formatDisplayDateTime(value.from);
          const toFormatted = formatDisplayDateTime(value.to);
          if (fromFormatted && toFormatted) {
            displayValue = `${fromFormatted} → ${toFormatted}`;
          } else if (fromFormatted) {
            displayValue = `from ${fromFormatted}`;
          } else if (toFormatted) {
            displayValue = `to ${toFormatted}`;
          }
        }

        return { id: f.id, label: f.label, value: displayValue };
      });
  }, [flattenedFilters, filterValues]);

  // Handlers
  const handleFilterChange = useCallback(
    (filterId: string, value: string | string[] | { from?: string; to?: string }) => {
      const newValues = { ...filterValues, [filterId]: value };
      // Always update internal state when not externally controlled
      if (!externalFilterValues) {
        setInternalFilterValues(newValues);
      }
      // Notify parent of changes (for callbacks like onActivityFilterChange)
      onFilterChange?.(newValues);
    },
    [filterValues, externalFilterValues, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    const clearedValues: FilterValues = {};
    flattenedFilters.forEach((f) => {
      if (f.readonly || f.clearable === false) {
        clearedValues[f.id] = filterValues[f.id];
      } else {
        clearedValues[f.id] = '';
      }
    });
    // Always update internal state when not externally controlled
    if (!externalFilterValues) {
      setInternalFilterValues(clearedValues);
    }
    // Notify parent of changes
    onFilterChange?.(clearedValues);
  }, [flattenedFilters, filterValues, externalFilterValues, onFilterChange]);

  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      const newValues = { ...filterValues, [filterId]: '' };
      // Always update internal state when not externally controlled
      if (!externalFilterValues) {
        setInternalFilterValues(newValues);
      }
      // Notify parent of changes
      onFilterChange?.(newValues);
    },
    [filterValues, externalFilterValues, onFilterChange]
  );

  return {
    filterValues,
    flattenedFilters,
    activeFilters,
    handleFilterChange,
    handleClearFilters,
    handleRemoveFilter,
    setInternalFilterValues,
  };
};
