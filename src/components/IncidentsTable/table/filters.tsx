import { StateBadge } from '@components/StateBadge';
import type { FilterConfig, FilterOption, SimpleFilterConfig } from '@components/TableWithFilters';
import type { TFunction } from 'i18next';

interface FilterOptions {
  /** Whether to show process-level filters (bpmnProcessId, processInstanceKey) */
  showProcessFilters: boolean;
  /** Process definition options for the dropdown */
  processOptions: FilterOption[];
}

export const getIncidentFilters = (
  t: TFunction,
  options: FilterOptions
): FilterConfig[] => {
  const { showProcessFilters, processOptions } = options;

  const filters: FilterConfig[] = [
    {
      id: 'state',
      type: 'select',
      label: t('incidents:fields.state'),
      zone: 'exposed_first_line',
      hideAllOption: true,
      options: [
        {
          value: 'unresolved',
          label: t('incidents:states.unresolved'),
          renderContent: <StateBadge state="unresolved" label={t('incidents:states.unresolved')} />,
        },
        {
          value: 'resolved',
          label: t('incidents:states.resolved'),
          renderContent: <StateBadge state="resolved" label={t('incidents:states.resolved')} />,
        },
      ],
    },
    {
      id: 'search',
      label: t('common:search.label'),
      type: 'text',
      zone: 'exposed_first_line',
      align: 'right',
      placeholder: t('common:filters.searchPlaceholder'),
      width: 250,
    },
  ];

  // Add process-level filters only when viewing global incidents
  if (showProcessFilters) {
    const hideableItems: SimpleFilterConfig[] = [
      {
        id: 'bpmnProcessId',
        type: 'select',
        label: t('processes:fields.process'),
        options: processOptions,
        searchable: true,
      },
      {
        id: 'processInstanceKey',
        type: 'text',
        label: t('incidents:fields.processInstance'),
        placeholder: t('incidents:filters.enterKey'),
      },
      {
        id: 'createdAt',
        label: t('incidents:fields.createdAt'),
        type: 'dateRange',
        colSpan: 2,
      },
    ];

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
