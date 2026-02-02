import { StateBadge } from '@components/StateBadge';
import type { FilterConfig } from '@components/TableWithFilters';

// Translation function type - ESLint validates keys via i18n-namespace-match rule
type TranslateFunction = (key: string) => string;

export const getIncidentFilters = (
  t: TranslateFunction,
): FilterConfig[] => {
  return [
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
};
