import { StateBadge } from '@components/StateBadge';
import type { FilterConfig, SimpleFilterConfig } from '@components/TableWithFilters';

// Translation function type - ESLint validates keys via i18n-namespace-match rule
type TranslateFunction = (key: string) => string;

interface FilterOptions {
  /** Whether to show the process filter */
  showProcessFilter: boolean;
  /** Whether to show the include child processes filter */
  showIncludeChildProcesses?: boolean;
  /** Render function for the process definition filter component */
  renderProcessFilter: (value: string | undefined, onChange: (value: string) => void) => React.ReactNode;
  /** Convert bpmnProcessId to a display label for the active-filter badge */
  getProcessActiveLabel: (value: string) => string;
  /** Activity IDs available for filtering */
  activityIds: string[];
}

export const getProcessInstanceFilters = (
  t: TranslateFunction,
  options: FilterOptions
): FilterConfig[] => {
  const { showProcessFilter, showIncludeChildProcesses = true, renderProcessFilter, getProcessActiveLabel, activityIds } = options;

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
  ];

  // Add process filter only when not locked to specific definition
  if (showProcessFilter) {
    filters.push({
      id: 'bpmnProcessId',
      label: t('processes:fields.process'),
      type: 'component',
      render: renderProcessFilter,
      getActiveLabel: getProcessActiveLabel,
      zone: 'exposed_first_line',
      align: 'right',
      width: 250,
    });
  }

  // Build hideable group items
  const hideableItems: SimpleFilterConfig[] = [];

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
    colSpan: 1,
  });

  // Add businessKey filter
  hideableItems.push({
    id: 'businessKey',
    label: t('processes:fields.businessKey'),
    type: 'text',
    colSpan: 1,
  });

  // Add include child processes filter
  if (showIncludeChildProcesses) {
    hideableItems.push({
      id: 'includeChildProcesses',
      label: t('processes:filters.includeChildProcesses'),
      type: 'switch',
    });
  }

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
