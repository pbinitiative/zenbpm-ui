// Main component
export { TableWithFilters } from './TableWithFilters';
export type { TableWithFiltersProps } from './TableWithFilters';

// Types
export type {
  FilterConfig,
  SimpleFilterConfig,
  GroupFilterConfig,
  FilterGroupConfig,
  FilterOption,
  FilterType,
  FilterValues,
  FilterZone,
  FilterAlignment,
  TableConfig,
  TableMode,
  SimpleTableConfig,
  PartitionedTableConfig,
  ActiveFilter,
  FiltersByZone,
} from './types';

// Hooks (for advanced usage)
export { useFilterState, flattenFilters } from './hooks/useFilterState';
export { useFiltersByZone } from './hooks/useFiltersByZone';

// Sub-components (for custom layouts)
export { FilterControl } from './components/FilterControl';
export { FilterGroup } from './components/FilterGroup';
export { FilterRenderer } from './components/FilterRenderer';
export { FilterZoneRenderer } from './components/FilterZoneRenderer';
export { FirstLineToolbar } from './components/FirstLineToolbar';
export { ActiveFilterBadges } from './components/ActiveFilterBadges';
export { DebouncedTextField } from './components/DebouncedTextField';
