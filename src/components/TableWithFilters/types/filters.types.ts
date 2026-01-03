import type { SortOrder } from '@components/DataTable';
import type { PartitionedResponse } from '@components/PartitionedTable';

// ============================================================================
// Filter Zone Types
// ============================================================================

/** Filter zones determine where filters are displayed */
export type FilterZone =
  | 'exposed_first_line'   // Next to Filters button, always visible
  | 'exposed_second_line'  // Below first line, always visible
  | 'hideable';            // Hidden by default, toggled with Filters button

/** Alignment within a zone */
export type FilterAlignment = 'left' | 'right';

/** Filter input types */
export type FilterType = 'select' | 'text' | 'date' | 'dateRange' | 'switch' | 'group';

export interface FilterOption {
  value: string;
  label: string;
  /** Optional custom content to render instead of just the label */
  renderContent?: React.ReactNode;
}

/** Base configuration shared by all filter types */
interface FilterConfigBase {
  id: string;
  label: string;
  /** Which zone the filter belongs to (default: 'hideable') */
  zone?: FilterZone;
  /** Which group within the zone (filters with same group are grouped together) */
  group?: string;
  /** Alignment within the zone (default: 'left') */
  align?: FilterAlignment;
  /** Whether the filter is readonly */
  readonly?: boolean;
  /** Whether the filter can be cleared (default: true) */
  clearable?: boolean;
  /** Custom width for the filter */
  width?: number | string;
  /** Hide the filter badge for this filter (default: false) */
  hideFilterBadge?: boolean;
  /** Number of columns to span in a grid layout (default: 1) */
  colSpan?: number;
}

/** Type-specific properties that should be exclusive to each filter type */
interface SelectOnlyProps {
  options: FilterOption[];
  /** Enable search/autocomplete functionality (default: false) */
  searchable?: boolean;
  /** Hide the default "All" option (default: false) */
  hideAllOption?: boolean;
}

interface TextOnlyProps {
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 200) */
  debounce?: number;
}

interface SwitchOnlyProps {
  /** Whether label is inline with switch (default: true) */
  inline?: boolean;
  /** Position of the label relative to switch (default: 'right') */
  labelPosition?: 'left' | 'right';
}

/** Helper to make properties from other types explicitly forbidden */
type ForbidProps<T> = { [K in keyof T]?: never };

/** Select filter configuration */
interface SelectFilterConfig extends FilterConfigBase, SelectOnlyProps, ForbidProps<SwitchOnlyProps> {
  type: 'select';
  /** Placeholder text */
  placeholder?: string;
}

/** Text filter configuration */
interface TextFilterConfig extends FilterConfigBase, TextOnlyProps, ForbidProps<SelectOnlyProps>, ForbidProps<SwitchOnlyProps> {
  type: 'text';
}

/** Date filter configuration */
interface DateFilterConfig extends FilterConfigBase, ForbidProps<SelectOnlyProps>, ForbidProps<TextOnlyProps>, ForbidProps<SwitchOnlyProps> {
  type: 'date';
}

/** Date range filter configuration */
interface DateRangeFilterConfig extends FilterConfigBase, ForbidProps<SelectOnlyProps>, ForbidProps<TextOnlyProps>, ForbidProps<SwitchOnlyProps> {
  type: 'dateRange';
}

/** Switch filter configuration */
interface SwitchFilterConfig extends FilterConfigBase, SwitchOnlyProps, ForbidProps<SelectOnlyProps>, ForbidProps<TextOnlyProps> {
  type: 'switch';
}

/** Non-group filter types - filters that are not groups */
export type SimpleFilterConfig =
  | SelectFilterConfig
  | TextFilterConfig
  | DateFilterConfig
  | DateRangeFilterConfig
  | SwitchFilterConfig;

/** Group filter configuration - contains nested filters in a grid layout */
export interface GroupFilterConfig {
  type: 'group';
  id: string;
  /** Optional label for the group */
  label?: string;
  /** Which zone the filter belongs to (default: 'hideable') */
  zone?: FilterZone;
  /** Which group within the zone (filters with same group are grouped together) */
  group?: string;
  /** Alignment within the zone (default: 'left') */
  align?: FilterAlignment;
  /** Number of columns in the grid layout (default: 5) */
  columns?: number;
  /** Nested filters within this group */
  items: SimpleFilterConfig[];
}

/** Configuration for a single filter - discriminated union by type */
export type FilterConfig = SimpleFilterConfig | GroupFilterConfig;

/** Configuration for a filter group (legacy - for grouping filters by group string) */
export interface FilterGroupConfig {
  id: string;
  /** Optional label for the group */
  label?: string;
  /** Zone where this group belongs */
  zone: FilterZone;
  /** Alignment of the group within the zone */
  align?: FilterAlignment;
}

/** Filter values - the current state of all filter inputs */
export type FilterValues = Record<string, string | string[] | { from?: string; to?: string } | undefined>;

/** Active filter for display in badges */
export interface ActiveFilter {
  id: string;
  label: string;
  value: string;
}

// ============================================================================
// Table Types
// ============================================================================

export type TableMode = 'simple' | 'partitioned';

export interface SimpleTableConfig<T> {
  mode: 'simple';
  data: T[];
  loading?: boolean;
  totalCount?: number;
  onRefresh?: () => void;
}

export interface PartitionedTableConfig<T> {
  mode: 'partitioned';
  fetchData: (params: {
    page: number;
    size: number;
    filters?: FilterValues;
    sortBy?: string;
    sortOrder?: SortOrder;
  }) => Promise<PartitionedResponse<T>>;
  onRefresh?: () => void;
}

export type TableConfig<T> = SimpleTableConfig<T> | PartitionedTableConfig<T>;

// ============================================================================
// Filters by Zone Structure
// ============================================================================

export interface FiltersByZone {
  exposed_first_line: { left: Map<string, FilterConfig[]>; right: Map<string, FilterConfig[]> };
  exposed_second_line: { left: Map<string, FilterConfig[]>; right: Map<string, FilterConfig[]> };
  hideable: { left: Map<string, FilterConfig[]>; right: Map<string, FilterConfig[]> };
}
