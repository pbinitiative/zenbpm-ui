import { StateBadge } from '@components/StateBadge';
import type { FilterConfig, FilterOption, SimpleFilterConfig } from '@components/TableWithFilters';
import type { TFunction } from 'i18next';

interface FilterOptions {
  /** Whether to show the process filter */
  showProcessFilter: boolean;
  /** Process options for the dropdown */
  processOptions: FilterOption[];
  /** Activity IDs available for filtering */
  activityIds: string[];
}

export const getProcessInstanceFilters = (
  t: TFunction,
  options: FilterOptions
): FilterConfig[] => {
  const { showProcessFilter, processOptions, activityIds } = options;

  const filters: FilterConfig[] = [
    {
      id: 'state',
      label: t('processes:fields.state'),
      type: 'select',
      zone: 'exposed_first_line',
      hideAllOption: true,
      options: [
        {
          value: 'active',
          label: t('processes:states.active'),
          renderContent: <StateBadge state="active" label={t('processes:states.active')} />,
        },
        {
          value: 'completed',
          label: t('processes:states.completed'),
          renderContent: <StateBadge state="completed" label={t('processes:states.completed')} />,
        },
        {
          value: 'terminated',
          label: t('processes:states.terminated'),
          renderContent: <StateBadge state="terminated" label={t('processes:states.terminated')} />,
        },
        {
          value: 'failed',
          label: t('processes:states.failed'),
          renderContent: <StateBadge state="failed" label={t('processes:states.failed')} />,
        },
      ],
    },
    {
      id: 'search',
      label: t('common:search.label'),
      type: 'text',
      zone: 'exposed_first_line',
      align: 'right',
      placeholder: t('processes:filters.searchPlaceholder'),
      width: 250,
    },
  ];

  // Build hideable group items
  const hideableItems: SimpleFilterConfig[] = [];

  // Add process filter only when not locked to specific definition
  if (showProcessFilter) {
    hideableItems.push({
      id: 'bpmnProcessId',
      label: t('processes:fields.process'),
      type: 'select',
      options: processOptions,
      searchable: true,
    });
  }

  // Add activity filter if activityIds are provided
  if (activityIds.length > 0) {
    hideableItems.push({
      id: 'activityId',
      label: t('processes:fields.activityFilter'),
      type: 'select',
      options: activityIds.map((id) => ({ value: id, label: id })),
      searchable: true,
    });
  }

  // Add date range filter
  hideableItems.push({
    id: 'createdAt',
    label: t('processes:fields.createdAt'),
    type: 'dateRange',
    colSpan: 2,
  });

  // Add hideable group if there are items
  if (hideableItems.length > 0) {
    filters.push({
      id: 'filterGroup',
      type: 'group',
      zone: 'hideable',
      columns: 3,
      items: hideableItems,
    });
  }

  return filters;
};
