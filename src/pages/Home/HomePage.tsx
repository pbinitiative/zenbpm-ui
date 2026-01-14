import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Typography, Grid } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RuleIcon from '@mui/icons-material/Rule';
import WarningIcon from '@mui/icons-material/Warning';
import { useQuery } from '@tanstack/react-query';
import { themeColors } from '@base/theme';
import {
  getProcessDefinitions,
  getProcessInstances,
  getGlobalIncidents,
  getDmnResourceDefinitions,
  getDecisionInstances,
} from '@base/openapi';
import { QuickAccessCard, type QuickAccessCardProps } from './components/QuickAccessCard';

export const HomePage = () => {
  const { t } = useTranslation([ns.common]);

  // Fetch statistics for dashboard cards
  const { data: processDefinitions, isLoading: isLoadingDefinitions } = useQuery({
    queryKey: ['processDefinitions', 'count'],
    queryFn: () => getProcessDefinitions({ size: 1, onlyLatest: true }),
  });

  const { data: processInstances, isLoading: isLoadingInstances } = useQuery({
    queryKey: ['processInstances', 'count'],
    queryFn: () => getProcessInstances({ size: 1 }),
  });

  const { data: dmnDefinitions, isLoading: isLoadingDmn } = useQuery({
    queryKey: ['dmnDefinitions', 'count'],
    queryFn: () => getDmnResourceDefinitions({ size: 1 }),
  });

  const { data: decisionInstances, isLoading: isLoadingDecisionInstances } = useQuery({
    queryKey: ['decisionInstances', 'count'],
    queryFn: () => getDecisionInstances({ size: 1 }),
  });

  const { data: incidents, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['incidents', 'unresolved', 'count'],
    queryFn: () => getGlobalIncidents({ size: 1, state: 'unresolved' }),
  });

  const quickAccessItems: QuickAccessCardProps[] = [
    {
      icon: <AccountTreeIcon fontSize="large" />,
      title: t('common:navigation.processes'),
      description: t('common:home.processes.description'),
      path: '/processes',
      stats: [
        {
          label: t('common:home.stats.definitions'),
          value: processDefinitions?.totalCount,
          isLoading: isLoadingDefinitions,
        },
        {
          label: t('common:home.stats.instances'),
          value: processInstances?.totalCount,
          isLoading: isLoadingInstances,
        },
      ],
    },
    {
      icon: <RuleIcon fontSize="large" />,
      title: t('common:navigation.decisions'),
      description: t('common:home.decisions.description'),
      path: '/decisions',
      stats: [
        {
          label: t('common:home.stats.definitions'),
          value: dmnDefinitions?.totalCount,
          isLoading: isLoadingDmn,
        },
        {
          label: t('common:home.stats.instances'),
          value: decisionInstances?.totalCount,
          isLoading: isLoadingDecisionInstances,
        },
      ],
    },
    {
      icon: <WarningIcon fontSize="large" />,
      title: t('common:navigation.incidents'),
      description: t('common:home.incidents.description'),
      path: '/incidents',
      stats: [
        {
          label: t('common:home.stats.unresolved'),
          value: incidents?.totalCount,
          isLoading: isLoadingIncidents,
        },
      ],
    },
  ];

  return (
    <Box>
      <Typography
        sx={{
          fontSize: '1.75rem',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: themeColors.textPrimary,
          mb: 0.75,
        }}
      >
        {t('common:appName')}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.875rem',
          color: themeColors.textMuted,
          mb: 4,
        }}
      >
        {t('common:appDescription')}
      </Typography>

      <Grid container spacing={3}>
        {quickAccessItems.map((item) => (
          <Grid key={item.path} size={{ xs: 12, sm: 6, lg: 4 }}>
            <QuickAccessCard {...item} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
