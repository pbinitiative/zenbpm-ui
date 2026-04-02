import { Box, Button, Tooltip, IconButton, Link } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MonoText } from '@components/MonoText';
import { StateBadge } from '@components/StateBadge';
import type { Column } from '@components/DataTable';
import type { Incident } from '../IncidentsTable';
import { formatDate } from '@/components/DiagramDetailLayout/utils';

// Translation function type - ESLint validates keys via i18n-namespace-match rule
type TranslateFunction = (key: string) => string;

interface ColumnOptions {
  /** Callback when view details is clicked */
  onViewDetails: (incident: Incident) => void;
  /** Callback when resolve is clicked */
  onResolve: (incidentKey: string) => void;
  /** Callback when message is clicked to show stack trace */
  onMessageClick: (message: string) => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

export const getIncidentColumns = (
  t: TranslateFunction,
  options: ColumnOptions
): Column<Incident>[] => {
  const { onViewDetails, onResolve, onMessageClick, onElementIdClick } = options;

  return [
    {
      id: 'key',
      label: t('common:key'),
      sortable: true,
      width: 180,
      render: (row) => <MonoText>{row.key}</MonoText>,
    },
    {
      id: 'elementId',
      label: t('incidents:fields.elementId'),
      sortable: true,
      width: 150,
      render: (row) => (
        <Link
          component="button"
          variant="body2"
          onClick={(e) => {
            (e as React.MouseEvent).stopPropagation();
            onElementIdClick?.(row.elementId);
          }}
          sx={{
            textAlign: 'left',
            textDecoration: 'underline',
            textDecorationColor: 'text.disabled',
            color: 'text.primary',
            fontFamily: '"SF Mono", Monaco, monospace',
            fontSize: '0.75rem',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {row.elementId}
        </Link>
      ),
    },
    {
      id: 'message',
      label: t('incidents:fields.errorMessage'),
      render: (row) => (
        <Tooltip title={t('incidents:actions.viewStackTrace')}>
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.stopPropagation();
              onMessageClick(row.message);
            }}
            sx={{
              maxWidth: 330,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              color: 'text.secondary',
              textDecoration: 'underline',
              textDecorationColor: 'text.disabled',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            {row.message.split('\n')[0]}
          </Link>
        </Tooltip>
      ),
      width: 160,
    },
    {
      id: 'createdAt',
      label: t('incidents:fields.createdAt'),
      sortable: true,
      width: 160,
      render: (row) => formatDate(row.createdAt),
    },
    {
      id: 'state',
      label: t('incidents:fields.state'),
      width: 130,
      render: (row) => (
        <StateBadge
          state={row.resolvedAt ? 'resolved' : 'unresolved'}
          label={row.resolvedAt ? t('incidents:states.resolved') : t('incidents:states.unresolved')}
        />
      ),
    },
    {
      id: 'actions',
      label: '',
      width: 120,
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(row);
            }}
            title={t('incidents:actions.viewDetails')}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
          {!row.resolvedAt && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(row.key);
              }}
            >
              {t('incidents:actions.resolve')}
            </Button>
          )}
        </Box>
      ),
    },
  ];
};

