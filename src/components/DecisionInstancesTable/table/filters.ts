import type { FilterConfig, FilterOption, SimpleFilterConfig } from '@components/TableWithFilters';

// Translation function type - ESLint validates keys via i18n-namespace-match rule
type TranslateFunction = (key: string) => string;

export interface FilterOptions {
  /** Whether to show the decision definition filter (hidden when filtering by specific definition) */
  showDecisionFilter?: boolean;
  /** Decision definition options for the dropdown */
  decisionOptions?: FilterOption[];
}

export const getDecisionInstanceFilters = (
  t: TranslateFunction,
  options: FilterOptions = {}
): FilterConfig[] => {
  const { showDecisionFilter = true, decisionOptions = [] } = options;

  const filters: FilterConfig[] = [
    {
      id: 'search',
      label: t('common:search.label'),
      type: 'text',
      zone: 'exposed_first_line',
      align: 'right',
      placeholder: t('decisions:filters.searchPlaceholder'),
      width: 250,
    },
  ];

  // Build hideable filter items
  const hideableItems: SimpleFilterConfig[] = [];

  // Only show decision filter when not filtering by specific definition
  if (showDecisionFilter) {
    hideableItems.push({
      id: 'dmnResourceDefinitionId',
      type: 'select',
      label: t('decisions:fields.decisionDefinition'),
      options: decisionOptions,
      searchable: true,
    });
  }

  hideableItems.push({
    id: 'evaluatedAt',
    label: t('decisions:fields.evaluatedAt'),
    type: 'dateRange',
    colSpan: showDecisionFilter ? 2 : 3,
  });

  filters.push({
    id: 'filterGroup',
    type: 'group',
    zone: 'hideable',
    columns: 3,
    items: hideableItems,
  });

  return filters;
};
