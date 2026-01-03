import { FilterControl } from './FilterControl';
import { FilterGroup } from './FilterGroup';
import type { FilterConfig, FilterValues } from '../types';

interface FilterRendererProps {
  filter: FilterConfig;
  filterValues: FilterValues;
  onFilterChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
}

/**
 * Renders any filter type (simple or group)
 */
export const FilterRenderer = ({ filter, filterValues, onFilterChange }: FilterRendererProps) => {
  if (filter.type === 'group') {
    return (
      <FilterGroup
        filter={filter}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
      />
    );
  }

  return (
    <FilterControl
      filter={filter}
      value={filterValues[filter.id]}
      onChange={onFilterChange}
    />
  );
};
