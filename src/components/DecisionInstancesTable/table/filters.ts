import type { FilterConfig, SimpleFilterConfig } from '@components/TableWithFilters';

// Translation function type - ESLint validates keys via i18n-namespace-match rule
type TranslateFunction = (key: string) => string;

export interface FilterOptions {
  /** Whether to show the decision definition filter (hidden when locked to a specific definition) */
  showDecisionFilter?: boolean;
  /** Render function for the decision definition filter component */
  renderDecisionFilter?: (value: string | undefined, onChange: (value: string) => void) => React.ReactNode;
  /** Convert dmnResourceDefinitionKey to a display label for the active-filter badge */
  getDecisionActiveLabel?: (value: string) => string;
}

export const getDecisionInstanceFilters = (
  t: TranslateFunction,
  options: FilterOptions = {}
): FilterConfig[] => {
  const { showDecisionFilter = true, renderDecisionFilter, getDecisionActiveLabel } = options;

  const filters: FilterConfig[] = [];

  // Decision definition selector replaces the search field in the top bar
  if (showDecisionFilter && renderDecisionFilter) {
    filters.push({
      id: 'dmnResourceDefinitionId',
      label: t('decisions:fields.decisionDefinition'),
      type: 'component',
      zone: 'exposed_first_line',
      align: 'right',
      width: 250,
      render: renderDecisionFilter,
      getActiveLabel: getDecisionActiveLabel,
    });
  }

  // Hideable filters
  const hideableItems: SimpleFilterConfig[] = [
    {
      id: 'evaluatedAt',
      label: t('decisions:fields.evaluatedAt'),
      type: 'dateRange',
      colSpan: 1,
    },
  ];

  filters.push({
    id: 'filterGroup',
    type: 'group',
    zone: 'hideable',
    columns: 3,
    items: hideableItems,
  });

  return filters;
};
