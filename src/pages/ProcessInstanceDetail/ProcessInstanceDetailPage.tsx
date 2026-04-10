import {useState, useMemo, useCallback} from 'react';
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
import { BpmnDiagram, type ElementStatistics } from '@components/BpmnDiagram';
import { MetadataPanel } from '@components/DiagramDetailLayout';
import type { DefinitionInfo } from '@components/DiagramDetailLayout';
import { useInstanceData } from './hooks';
import { JobsTab, VariablesTab, IncidentsTab, HistoryTab, ChildProcessesTab, DecisionInstancesTab } from './tabs';

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
  'child-processes': 4,
  decisions: 5,
};

export const ProcessInstanceDetailPage = () => {
  const { processInstanceKey = '' } = useParams<{ processInstanceKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get tab from URL query param
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && TAB_MAP[tabParam] !== undefined ? TAB_MAP[tabParam] : 0;

  // Selected element from URL param (for diagram highlight)
  const selectedElement = searchParams.get('elementId') ?? undefined;

  // Handle element ID click — toggle selection and persist in URL
  const handleElementIdClick = useCallback((elementId: string) => {
    const current = searchParams.get('elementId');
    const tabParam = searchParams.get('tab');
    const next: Record<string, string> = {};
    if (tabParam) next.tab = tabParam;
    if (current !== elementId) next.elementId = elementId;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle tab change - update URL (preserve elementId if set)
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    const tabName = Object.entries(TAB_MAP).find(([, index]) => index === newValue)?.[0];
    const elementId = searchParams.get('elementId');
    const next: Record<string, string> = {};
    if (tabName) next.tab = tabName;
    if (elementId) next.elementId = elementId;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
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
    childProcesses,
    childProcessJobs,
    childProcessIncidents,
    grandchildProcesses,
    childProcessHistory,
    decisionInstances,
    childProcessDecisionInstances,
    elementStatistics,
    loading,
    error,
    refetchAll,
    // Tree + pagination (available for future tab migrations)
    instanceTree: _instanceTree,
    jobsPagination: _jobsPagination,
    incidentsPagination: _incidentsPagination,
    decisionsPagination: _decisionsPagination,
    childrenPagination: _childrenPagination,
    refetchNodeJobs: _refetchNodeJobs,
    refetchNodeIncidents: _refetchNodeIncidents,
    refetchNodeDecisions: _refetchNodeDecisions,
    refetchNodeChildren: _refetchNodeChildren,
  } = useInstanceData(processInstanceKey);

  // Count of process instances that are actually shown in the Child Processes tab
  // (all levels, excluding engine-internal multiInstance and subprocess wrappers).
  const visibleChildProcessesCount = useMemo(() => {
    const directCount = childProcesses.filter((cp) => !['multiInstance', 'subprocess'].includes(cp.processType ?? '')).length;
    const grandchildCount = Object.values(grandchildProcesses)
      .flat()
      .filter((gc) => !['multiInstance', 'subprocess'].includes(gc.processType ?? '')).length;
    return directCount + grandchildCount;
  }, [childProcesses, grandchildProcesses]);

  // Show notification helper
  const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Count unresolved incidents (root + all child processes)
  const unresolvedIncidentsCount = useMemo(
    () => {
      const rootUnresolved = incidents.filter((i) => !i.resolvedAt).length;
      const childUnresolved = Object.values(childProcessIncidents)
        .flat()
        .filter((i) => !i.resolvedAt).length;
      return rootUnresolved + childUnresolved;
    },
    [incidents, childProcessIncidents]
  );

  // Prepare history for diagram highlighting
  const historyElements = useMemo(
    () => [
      ...history.map((h) => ({elementId: h.elementId})),
      ...childProcessHistory.map((h) => ({elementId: h.elementId})),
    ],
    [history, childProcessHistory]
  );

  // Prepare active elements for diagram highlighting
  const activeElements = useMemo(
    () => processInstance?.activeElementInstances.map((ei) => ({ elementId: ei.elementId })) || [],
    [processInstance]
  );

  // Compute multi-instance progress overlays for the BPMN diagram.
  const elementStatisticsMultiInstance = useMemo((): ElementStatistics => {
    const totalPerElement: Record<string, number> = {};
    const completedPerElement: Record<string, number> = {};

    // Only consider jobs belonging to multiInstance child processes
    const multiInstanceChildKeys = new Set(
      childProcesses
        .filter((cp) => cp.processType === 'multiInstance')
        .map((cp) => cp.key)
    );

    for (const [childKey, jobs] of Object.entries(childProcessJobs)) {
      if (!multiInstanceChildKeys.has(childKey)) continue;
      for (const job of jobs) {
        totalPerElement[job.elementId] = (totalPerElement[job.elementId] ?? 0) + 1;
        if (job.state === 'completed') {
          completedPerElement[job.elementId] = (completedPerElement[job.elementId] ?? 0) + 1;
        }
      }
    }

    // --- Call-activity multi-instance: grandchild process instances ---
    const multiInstanceGrandchildren = childProcesses
      .filter((cp) => cp.processType === 'multiInstance')
      .flatMap((cp) => grandchildProcesses[cp.key] ?? []);

    if (multiInstanceGrandchildren.length > 0) {
      const historyIdCounts: Record<string, number> = {};
      for (const h of history) {
        historyIdCounts[h.elementId] = (historyIdCounts[h.elementId] ?? 0) + 1;
      }
      const callActivityElementId = Object.entries(historyIdCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      if (callActivityElementId) {
        for (const grandchild of multiInstanceGrandchildren) {
          totalPerElement[callActivityElementId] = (totalPerElement[callActivityElementId] ?? 0) + 1;
          if (grandchild.state === 'completed') {
            completedPerElement[callActivityElementId] = (completedPerElement[callActivityElementId] ?? 0) + 1;
          }
        }
      }
    }

    const stats: ElementStatistics = {};
    for (const [elementId, total] of Object.entries(totalPerElement)) {
      const completed = completedPerElement[elementId] ?? 0;
      stats[elementId] = { activeCount: total - completed, incidentCount: 0, completedCount: completed };
    }
    return stats;
  }, [childProcessJobs, grandchildProcesses, childProcesses, history]);

  // Prefer multi-instance statistics per element when available, fall back to API statistics.
  const resolvedElementStatistics = useMemo((): ElementStatistics | undefined => {
    if (Object.keys(elementStatisticsMultiInstance).length === 0) {
      return elementStatistics;
    }
    return { ...elementStatistics, ...elementStatisticsMultiInstance };
  }, [elementStatistics, elementStatisticsMultiInstance]);

  const childProcessJobsCount = useMemo(() => {
    return Object.values(childProcessJobs).flat().length
  }, [ childProcessJobs ])

  // Total decision instances count across root + all child/grandchild processes
  const totalDecisionInstancesCount = useMemo(() => {
    const childCount = Object.values(childProcessDecisionInstances).flat().length;
    return decisionInstances.length + childCount;
  }, [decisionInstances, childProcessDecisionInstances]);



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
    <Box sx={{ pb: 4 }} data-testid="process-instance-detail-page">
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ alignItems: 'stretch' }}>
        {/* BPMN Diagram - First on mobile */}
        <Grid size={{ xs: 12, md: 9 }} order={{ xs: 1, md: 2 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', height: '100%' }} data-testid="process-instance-diagram-panel">
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
              {t('processInstance:detail.diagram')}
            </Typography>
            {processDefinition?.bpmnData ? (
              <BpmnDiagram
                diagramData={processDefinition.bpmnData}
                history={historyElements}
                activeElements={activeElements}
                elementStatistics={resolvedElementStatistics}
                selectedElement={selectedElement}
                onElementClick={handleElementIdClick}
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
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="process-instance-metadata-panel">
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {t('processInstance:detail.metadata')}
            </Typography>
            <MetadataPanel
              entityKey={processInstance.key}
              state={processInstance.state}
              incidentsCount={unresolvedIncidentsCount}
              processType={processInstance.processType}
              name={processDefinition?.bpmnProcessName}
              version={processDefinition?.version}
              createdAt={processInstance.createdAt}
              businessKey={processInstance.businessKey}
              definitionInfo={{ key: processInstance.processDefinitionKey, type: 'process' } as DefinitionInfo}
              parentProcessInstanceKey={processInstance.parentProcessInstanceKey}
              keyLabel={t('processInstance:fields.key')}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs for Jobs, History, Incidents, Variables */}
      <Paper sx={{ mt: { xs: 2, md: 3 }, borderRadius: '12px' }} data-testid="process-instance-tabs-panel">
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
          data-testid="process-instance-tabs"
        >
          <Tab
            data-testid="process-instance-tab-jobs"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('processInstance:tabs.jobs')}
                <Chip label={jobs.length + childProcessJobsCount} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
              </Box>
            }
          />
          <Tab data-testid="process-instance-tab-history" label={t('processInstance:tabs.history')} />
          <Tab
            data-testid="process-instance-tab-incidents"
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
          <Tab data-testid="process-instance-tab-variables" label={t('processInstance:tabs.variables')} />
          <Tab
            data-testid="process-instance-tab-child-processes"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('processInstance:tabs.calledProcesses')}
                { visibleChildProcessesCount > 0 && (
                  <Chip label={visibleChildProcessesCount} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
              </Box>
            }
          />
          <Tab
            data-testid="process-instance-tab-decisions"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('processInstance:tabs.decisions')}
                {totalDecisionInstancesCount > 0 && (
                  <Chip label={totalDecisionInstancesCount} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Jobs Tab */}
          <TabPanel value={activeTab} index={0}>
            <JobsTab
              jobs={jobs}
              childProcessJobs={childProcessJobs}
              childProcesses={childProcesses}
              grandchildProcesses={grandchildProcesses}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
              onElementIdClick={handleElementIdClick}
            />
          </TabPanel>

          {/* History Tab */}
          <TabPanel value={activeTab} index={1}>
            <HistoryTab
              history={history}
              childProcessHistory={childProcessHistory}
              childProcesses={childProcesses}
              grandchildProcesses={grandchildProcesses}
              onElementIdClick={handleElementIdClick}
            />
          </TabPanel>

          {/* Incidents Tab */}
          <TabPanel value={activeTab} index={2}>
            <IncidentsTab
              incidents={incidents}
              childProcessIncidents={childProcessIncidents}
              childProcesses={childProcesses}
              grandchildProcesses={grandchildProcesses}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
              onElementIdClick={handleElementIdClick}
            />
          </TabPanel>

          {/* Variables Tab */}
          <TabPanel value={activeTab} index={3}>
            <VariablesTab
              processInstanceKey={processInstanceKey}
              variables={processInstance.variables}
              childProcesses={childProcesses}
              grandchildProcesses={grandchildProcesses}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
            />
          </TabPanel>

          {/* Child Processes Tab */}
          <TabPanel value={activeTab} index={4}>
            <ChildProcessesTab
              childProcesses={childProcesses}
              grandchildProcesses={grandchildProcesses}
            />
          </TabPanel>

          {/* Decision Instances Tab */}
          <TabPanel value={activeTab} index={5}>
            <DecisionInstancesTab
              decisionInstances={decisionInstances}
              childProcessDecisionInstances={childProcessDecisionInstances}
              childProcesses={childProcesses}
              grandchildProcesses={grandchildProcesses}
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
