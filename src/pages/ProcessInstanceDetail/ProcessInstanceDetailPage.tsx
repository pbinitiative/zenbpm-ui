import { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Paper,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { BpmnDiagram } from '@components/BpmnDiagram';
import { MetadataPanel } from '@components/DiagramDetailLayout';
import type { DefinitionInfo } from '@components/DiagramDetailLayout';
import { useInstanceData } from './hooks';
import { JobsTab, VariablesTab, IncidentsTab, HistoryTab } from './tabs';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`instance-tabpanel-${index}`}
    aria-labelledby={`instance-tab-${index}`}
  >
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </Box>
);

// Map tab name to index
const TAB_MAP: Record<string, number> = {
  jobs: 0,
  history: 1,
  incidents: 2,
  variables: 3,
};

export const ProcessInstanceDetailPage = () => {
  const { processInstanceKey } = useParams<{ processInstanceKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get tab from URL query param
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && TAB_MAP[tabParam] !== undefined ? TAB_MAP[tabParam] : 0;

  // Handle tab change - update URL
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    const tabName = Object.entries(TAB_MAP).find(([, index]) => index === newValue)?.[0];
    if (tabName) {
      setSearchParams({ tab: tabName }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch data
  const {
    processInstance,
    processDefinition,
    jobs,
    history,
    incidents,
    loading,
    error,
    refetchJobs,
    refetchIncidents,
    refetchVariables,
  } = useInstanceData(processInstanceKey);

  // Show notification helper
  const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Count unresolved incidents
  const unresolvedIncidentsCount = useMemo(
    () => incidents.filter((i) => !i.resolvedAt).length,
    [incidents]
  );

  // Prepare history for diagram highlighting
  const historyElements = useMemo(
    () => history.map((h) => ({ elementId: h.elementId })),
    [history]
  );

  // Prepare active elements for diagram highlighting
  const activeElements = useMemo(
    () => processInstance?.activeElementInstances.map((ei) => ({ elementId: ei.elementId })) || [],
    [processInstance]
  );

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !processInstance) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || t('common:errors.processInstanceNotFound')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ alignItems: 'stretch' }}>
        {/* BPMN Diagram - First on mobile */}
        <Grid size={{ xs: 12, md: 9 }} order={{ xs: 1, md: 2 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', height: '100%' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
              {t('processInstance:detail.diagram')}
            </Typography>
            {processDefinition?.bpmnData ? (
              <BpmnDiagram
                diagramData={processDefinition.bpmnData}
                history={historyElements}
                activeElements={activeElements}
              />
            ) : (
              <Box
                sx={{
                  height: { xs: 200, sm: 300, md: 400 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                }}
              >
                <Typography color="text.secondary">
                  {t('processInstance:detail.noDiagram')}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Metadata - Second on mobile */}
        <Grid size={{ xs: 12, md: 3 }} order={{ xs: 2, md: 1 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {t('processInstance:detail.metadata')}
            </Typography>
            <MetadataPanel
              entityKey={processInstance.key}
              state={processInstance.state}
              incidentsCount={unresolvedIncidentsCount}
              name={processDefinition?.bpmnProcessName}
              version={processDefinition?.version}
              resourceName={processDefinition?.bpmnResourceName}
              createdAt={processInstance.createdAt}
              definitionInfo={{ key: processInstance.processDefinitionKey, type: 'process' } as DefinitionInfo}
              keyLabel={t('processInstance:fields.key')}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs for Jobs, History, Incidents, Variables */}
      <Paper sx={{ mt: { xs: 2, md: 3 }, borderRadius: '12px' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
          }}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('processInstance:tabs.jobs')}
                <Chip label={jobs.length} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
              </Box>
            }
          />
          <Tab label={t('processInstance:tabs.history')} />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('processInstance:tabs.incidents')}
                {unresolvedIncidentsCount > 0 && (
                  <Chip
                    label={unresolvedIncidentsCount}
                    size="small"
                    color="error"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
          />
          <Tab label={t('processInstance:tabs.variables')} />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Jobs Tab */}
          <TabPanel value={activeTab} index={0}>
            <JobsTab
              jobs={jobs}
              onRefetch={refetchJobs}
              onShowNotification={showNotification}
            />
          </TabPanel>

          {/* History Tab */}
          <TabPanel value={activeTab} index={1}>
            <HistoryTab history={history} />
          </TabPanel>

          {/* Incidents Tab */}
          <TabPanel value={activeTab} index={2}>
            <IncidentsTab
              processInstanceKey={processInstanceKey!}
              onRefetch={refetchIncidents}
              onShowNotification={showNotification}
            />
          </TabPanel>

          {/* Variables Tab */}
          <TabPanel value={activeTab} index={3}>
            <VariablesTab
              processInstanceKey={processInstanceKey!}
              variables={processInstance.variables}
              onRefetch={refetchVariables}
              onShowNotification={showNotification}
            />
          </TabPanel>
        </Box>
      </Paper>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};
