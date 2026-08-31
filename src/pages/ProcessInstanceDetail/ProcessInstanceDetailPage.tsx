import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { EventSubscriptionState } from '@base/openapi/generated-api/schemas/eventSubscriptionState';
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
import {
  findFocusedEventPage,
  findFocusedJobPage,
  useInstanceData,
  type FocusedEventType,
} from './hooks';
import { JobsTab, VariablesTab, IncidentsTab, HistoryTab, ChildProcessesTab, DecisionInstancesTab, EventSubscriptionsTab } from './tabs';

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
const orderEventStates = (
  current: EventSubscriptionState,
  supported: readonly EventSubscriptionState[]
) => [current, ...supported.filter((state) => state !== current)];

const TAB_MAP: Record<string, number> = {
  jobs: 0,
  history: 1,
  incidents: 2,
  variables: 3,
  'child-processes': 4,
  decisions: 5,
  events: 6,
  'event-subscriptions': 6,
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
  const focusedElementInstanceKey = searchParams.get('focusElementInstanceKey') ?? undefined;
  const eventTypeParam = searchParams.get('eventType');
  const eventType: FocusedEventType =
    eventTypeParam === 'timers' || eventTypeParam === 'errors' ? eventTypeParam : 'messages';

  // A URL focus is resolved only once. The key remains in the URL afterward so
  // either table can continue highlighting it whenever the row is visible.
  const [pendingFocusKey, setPendingFocusKey] = useState<string | undefined>(
    focusedElementInstanceKey
  );
  const [findingFocusedJob, setFindingFocusedJob] = useState(false);
  const handledJobFocusesRef = useRef(new Set<string>());
  const handledEventFocusesRef = useRef(new Set<string>());
  const jobSearchAbortRef = useRef<AbortController | null>(null);
  const eventSearchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    jobSearchAbortRef.current?.abort();
    eventSearchAbortRef.current?.abort();
    if (focusedElementInstanceKey) {
      const requestKey = `${processInstanceKey}:${focusedElementInstanceKey}`;
      handledJobFocusesRef.current.delete(requestKey);
      handledEventFocusesRef.current.delete(requestKey);
    }
    jobSearchAbortRef.current = null;
    eventSearchAbortRef.current = null;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setFindingFocusedJob(false);
      setPendingFocusKey(focusedElementInstanceKey);
    });
    return () => { cancelled = true; };
  }, [focusedElementInstanceKey, processInstanceKey]);

  useEffect(
    () => () => {
      jobSearchAbortRef.current?.abort();
      eventSearchAbortRef.current?.abort();
    },
    []
  );

  // Handle element ID click — toggle selection and preserve all other URL state.
  const handleElementIdClick = useCallback((elementId: string) => {
    const next = new URLSearchParams(searchParams);
    if (next.get('elementId') === elementId) next.delete('elementId');
    else next.set('elementId', elementId);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleFocusNavigation = useCallback((tab: 'jobs' | 'history', elementInstanceKey: string) => {
    const requestKey = `${processInstanceKey}:${elementInstanceKey}`;
    handledJobFocusesRef.current.delete(requestKey);
    jobSearchAbortRef.current?.abort();
    eventSearchAbortRef.current?.abort();
    setPendingFocusKey(elementInstanceKey);

    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.set('focusElementInstanceKey', elementInstanceKey);
    setSearchParams(next);
  }, [processInstanceKey, searchParams, setSearchParams]);

  const handleEventFocusNavigation = useCallback((elementInstanceKey: string) => {
    const requestKey = `${processInstanceKey}:${elementInstanceKey}`;
    handledEventFocusesRef.current.delete(requestKey);
    eventSearchAbortRef.current?.abort();
    setPendingFocusKey(elementInstanceKey);

    const next = new URLSearchParams(searchParams);
    next.set('tab', 'events');
    next.set('eventType', 'messages');
    next.set('focusElementInstanceKey', elementInstanceKey);
    setSearchParams(next);
  }, [processInstanceKey, searchParams, setSearchParams]);

  const handleJobManualNavigation = useCallback(() => {
    jobSearchAbortRef.current?.abort();
    jobSearchAbortRef.current = null;
    setFindingFocusedJob(false);
    setPendingFocusKey(undefined);
  }, []);

  const handleEventManualNavigation = useCallback(() => {
    eventSearchAbortRef.current?.abort();
    setPendingFocusKey(undefined);
  }, []);

  const handleEventTypeChange = useCallback((type: FocusedEventType) => {
    handleEventManualNavigation();
    const next = new URLSearchParams(searchParams);
    next.set('eventType', type);
    setSearchParams(next, { replace: true });
  }, [handleEventManualNavigation, searchParams, setSearchParams]);

  // Manual tab changes preserve URL focus but never restart its page resolution.
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    const tabName = Object.entries(TAB_MAP).find(([, index]) => index === newValue)?.[0];
    jobSearchAbortRef.current?.abort();
    eventSearchAbortRef.current?.abort();
    setFindingFocusedJob(false);
    setPendingFocusKey(undefined);

    const next = new URLSearchParams(searchParams);
    if (tabName) next.set('tab', tabName);
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Show notification helper
  const showNotification = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning') => {
      setSnackbar({ open: true, message, severity });
    },
    [],
  );

  /**
   * History was truncated because one or more process instances reported a
   * totalCount that exceeds the per-fetch limit. We only want to surface a
   * single warning per fetch cycle, even when several nodes trigger it, and
   * we suppress repeated warnings on auto-refresh by remembering the last
   * signature we already showed.
   */
  const lastHistoryWarningRef = useRef<string | null>(null);
  const handleHistoryPartial = useCallback(
    (info: { instances: number; loadedCount: number; totalCount: number }) => {
      // Signature covers the interesting bits so refreshing the same tree
      // does not re-trigger the snackbar, but a real change does.
      const signature = `${info.instances}|${info.loadedCount}|${info.totalCount}`;
      if (lastHistoryWarningRef.current === signature) return;
      lastHistoryWarningRef.current = signature;
      const message =
        info.instances > 1
          ? t('processInstance:messages.historyExtremelyLargeMultiple', {
              instances: info.instances,
              loaded: info.loadedCount,
              total: info.totalCount,
            })
          : t('processInstance:messages.historyExtremelyLarge', {
              loaded: info.loadedCount,
              total: info.totalCount,
            });
      showNotification(message, 'warning');
    },
    [showNotification, t],
  );

  // Reset the history-warning dedup signature whenever we navigate to a
  // different process instance so the new tree is allowed to warn once too.
  useEffect(() => {
    lastHistoryWarningRef.current = null;
  }, [processInstanceKey]);

  // Fetch data
  const {
    processInstance,
    processDefinition,
    elementStatistics,
    loading,
    error,
    refetchAll,
    instanceTree,
    jobsPage,
    jobsPageSize,
    setJobsPage,
    setJobsPageSize,
    incidentsPage,
    incidentsPageSize,
    incidentsState,
    setIncidentsPage,
    setIncidentsPageSize,
    setIncidentsState,
    decisionsPage,
    decisionsPageSize,
    setDecisionsPage,
    setDecisionsPageSize,
    variablesPage,
    variablesPageSize,
    setVariablesPage,
    setVariablesPageSize,
    historySortBy,
    historySortOrder,
    setHistorySort,
    messageSubscriptionsPage,
    messageSubscriptionsPageSize,
    messageSubscriptionsState,
    setMessageSubscriptionsPage,
    setMessageSubscriptionsPageSize,
    setMessageSubscriptionsState,
    timerSubscriptionsPage,
    timerSubscriptionsPageSize,
    timerSubscriptionsState,
    setTimerSubscriptionsPage,
    setTimerSubscriptionsPageSize,
    setTimerSubscriptionsState,
    errorSubscriptionsPage,
    errorSubscriptionsPageSize,
    errorSubscriptionsState,
    setErrorSubscriptionsPage,
    setErrorSubscriptionsPageSize,
    setErrorSubscriptionsState,
    totalEventSubscriptionsCount,
  } = useInstanceData(processInstanceKey, {
    onHistoryPartial: handleHistoryPartial,
  });

  // Count of process instances shown in the Child Processes tab
  // (depth-1 + depth-2, excluding engine-internal multiInstance and subprocess wrappers).
  const visibleChildProcessesCount = useMemo(() => {
    if (!instanceTree) return 0;
    // BFS over the entire tree — mirrors exactly what ChildProcessesTab renders as rows.
    // multiInstance and subprocess wrappers are hidden in the tab; everything else is a row.
    const HIDDEN = ['multiInstance', 'subprocess'];
    const queue = [...instanceTree.children];
    let count = 0;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      if (!HIDDEN.includes(node.instance.processType ?? '')) count++;
      queue.push(...node.children);
    }
    return count;
  }, [instanceTree]);

  const focusResolutionPending =
    focusedElementInstanceKey !== undefined && pendingFocusKey === focusedElementInstanceKey;

  const handleFocusedRowVisible = useCallback(() => {
    setPendingFocusKey((current) =>
      current === focusedElementInstanceKey ? undefined : current
    );
  }, [focusedElementInstanceKey]);

  useEffect(() => {
    if (
      activeTab !== TAB_MAP.jobs ||
      !focusResolutionPending ||
      !focusedElementInstanceKey ||
      !instanceTree
    ) {
      return;
    }

    const nodes: typeof instanceTree[] = [];
    const queue: typeof instanceTree[] = [instanceTree];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) continue;
      nodes.push(node);
      queue.push(...node.children);
    }

    // The desired row may already be on the currently displayed server page.
    if (nodes.some((node) =>
      node.jobs.some((job) => job.elementInstanceKey === focusedElementInstanceKey)
    )) {
      return;
    }

    // Full History is client-side, so it identifies the exact process node whose
    // server-paginated Jobs endpoint needs to be scanned.
    const owner = nodes.find((node) =>
      node.history.some((history) => history.key === focusedElementInstanceKey)
    );
    const requestKey = `${processInstanceKey}:${focusedElementInstanceKey}`;

    if (!owner || owner.jobsTotalCount === 0) {
      handledJobFocusesRef.current.add(requestKey);
      queueMicrotask(() => {
        setPendingFocusKey(undefined);
        showNotification(t('processInstance:messages.relatedJobNotFound'), 'error');
      });
      return;
    }

    if (handledJobFocusesRef.current.has(requestKey)) return;
    handledJobFocusesRef.current.add(requestKey);

    const controller = new AbortController();
    jobSearchAbortRef.current?.abort();
    jobSearchAbortRef.current = controller;
    setFindingFocusedJob(true);

    void findFocusedJobPage({
      processInstanceKey: owner.instance.key,
      elementInstanceKey: focusedElementInstanceKey,
      pageSize: jobsPageSize,
      totalCount: owner.jobsTotalCount,
      signal: controller.signal,
    })
      .then((page) => {
        if (controller.signal.aborted) return;
        if (page === undefined) {
          setPendingFocusKey(undefined);
          showNotification(t('processInstance:messages.relatedJobNotFound'), 'error');
          return;
        }
        setJobsPage(page);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPendingFocusKey(undefined);
        showNotification(t('processInstance:messages.relatedJobSearchFailed'), 'error');
      })
      .finally(() => {
        if (jobSearchAbortRef.current === controller) {
          jobSearchAbortRef.current = null;
          setFindingFocusedJob(false);
        }
      });
  }, [
    activeTab,
    focusResolutionPending,
    focusedElementInstanceKey,
    instanceTree,
    jobsPageSize,
    processInstanceKey,
    setJobsPage,
    showNotification,
    t,
  ]);

  useEffect(() => {
    if (
      activeTab !== TAB_MAP.events ||
      !focusResolutionPending ||
      !focusedElementInstanceKey ||
      !instanceTree
    ) {
      return;
    }

    const nodes: typeof instanceTree[] = [];
    const queue: typeof instanceTree[] = [instanceTree];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) continue;
      nodes.push(node);
      queue.push(...node.children);
    }

    const visibleMatch = nodes.some((node) => {
      const subscriptions = eventType === 'messages'
        ? node.messageSubscriptions
        : eventType === 'timers'
          ? node.timerSubscriptions
          : node.errorSubscriptions;
      return subscriptions.some(
        (subscription) => subscription.elementInstanceKey === focusedElementInstanceKey
      );
    });
    if (visibleMatch) return;

    const owner = nodes.find((node) =>
      node.history.some((history) => history.key === focusedElementInstanceKey)
    );
    const requestKey = `${processInstanceKey}:${focusedElementInstanceKey}`;

    if (!owner) {
      handledEventFocusesRef.current.add(requestKey);
      queueMicrotask(() => {
        setPendingFocusKey(undefined);
        showNotification(t('processInstance:messages.relatedEventNotFound'), 'error');
      });
      return;
    }

    if (handledEventFocusesRef.current.has(requestKey)) return;
    handledEventFocusesRef.current.add(requestKey);

    const controller = new AbortController();
    eventSearchAbortRef.current?.abort();
    eventSearchAbortRef.current = controller;

    void findFocusedEventPage({
      processInstanceKey: owner.instance.key,
      elementInstanceKey: focusedElementInstanceKey,
      searches: [
        ...orderEventStates(messageSubscriptionsState, ['active', 'completed', 'withdrawn'])
          .map((state, index) => ({
            type: 'messages' as const,
            pageSize: messageSubscriptionsPageSize,
            totalCount: index === 0 ? owner.messageSubscriptionsTotalCount : undefined,
            state,
          })),
        ...orderEventStates(timerSubscriptionsState, ['active', 'completed', 'withdrawn'])
          .map((state, index) => ({
            type: 'timers' as const,
            pageSize: timerSubscriptionsPageSize,
            totalCount: index === 0 ? owner.timerSubscriptionsTotalCount : undefined,
            state,
          })),
        ...orderEventStates(errorSubscriptionsState, ['active', 'withdrawn'])
          .map((state, index) => ({
            type: 'errors' as const,
            pageSize: errorSubscriptionsPageSize,
            totalCount: index === 0 ? owner.errorSubscriptionsTotalCount : undefined,
            state,
          })),
      ],
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result) {
          setPendingFocusKey(undefined);
          showNotification(t('processInstance:messages.relatedEventNotFound'), 'error');
          return;
        }

        if (result.type === 'messages') {
          setMessageSubscriptionsState(result.state);
          setMessageSubscriptionsPage(result.page);
        } else if (result.type === 'timers') {
          setTimerSubscriptionsState(result.state);
          setTimerSubscriptionsPage(result.page);
        } else {
          setErrorSubscriptionsState(result.state);
          setErrorSubscriptionsPage(result.page);
        }

        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set('eventType', result.type);
          return next;
        }, { replace: true });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPendingFocusKey(undefined);
        showNotification(t('processInstance:messages.relatedEventSearchFailed'), 'error');
      })
      .finally(() => {
        if (eventSearchAbortRef.current === controller) {
          eventSearchAbortRef.current = null;
        }
      });
  }, [
    activeTab,
    errorSubscriptionsPageSize,
    errorSubscriptionsState,
    eventType,
    focusResolutionPending,
    focusedElementInstanceKey,
    instanceTree,
    messageSubscriptionsPageSize,
    messageSubscriptionsState,
    processInstanceKey,
    setErrorSubscriptionsPage,
    setErrorSubscriptionsState,
    setMessageSubscriptionsPage,
    setMessageSubscriptionsState,
    setSearchParams,
    setTimerSubscriptionsPage,
    setTimerSubscriptionsState,
    showNotification,
    t,
    timerSubscriptionsPageSize,
    timerSubscriptionsState,
  ]);

  // Count unresolved incidents across the entire instance tree using the
  // server-reported total — accurate regardless of which page is loaded.
  const unresolvedIncidentsCount = useMemo(() => {
    if (!instanceTree) return 0;
    const queue: typeof instanceTree[] = [instanceTree];
    let count = 0;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      count += node.unresolvedIncidentsTotalCount;
      queue.push(...node.children);
    }
    return count;
  }, [instanceTree]);

  // Collect all history element IDs from the entire tree for diagram highlighting.
  const historyElements = useMemo(() => {
    if (!instanceTree) return [];
    const queue: typeof instanceTree[] = [instanceTree];
    const result: { elementId: string }[] = [];
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      node.history.forEach((h) => result.push({ elementId: h.elementId }));
      queue.push(...node.children);
    }
    return result;
  }, [instanceTree]);

  // Prepare active elements for diagram highlighting
  const activeElements = useMemo(
    () => processInstance?.activeElementInstances.map((ei) => ({ elementId: ei.elementId })) || [],
    [processInstance]
  );

  // Collect all active event subscriptions across the instance tree for diagram badges
  const activeSubscriptions = useMemo(() => {
    if (!instanceTree) return [];
    const queue: typeof instanceTree[] = [instanceTree];
    const result: { elementId: string }[] = [];
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      node.allActiveMessageSubscriptions?.forEach((s) => result.push({ elementId: s.elementId }));
      node.allActiveTimerSubscriptions?.forEach((s) => result.push({ elementId: s.elementId }));
      node.allActiveErrorSubscriptions?.forEach((s) => result.push({ elementId: s.elementId }));
      queue.push(...node.children);
    }
    return result;
  }, [instanceTree]);

  const activeJobsTotalCount = useMemo(() => {
    if (!instanceTree) return 0;
    const queue: typeof instanceTree[] = [instanceTree];
    let total = 0;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      total += node.activeJobsTotalCount;
      queue.push(...node.children);
    }
    return total;
  }, [instanceTree]);

  // Total decision instances count — sum decisionsTotalCount across all non-callActivity
  // nodes in the tree. Each node's value is the server-reported total for that specific
  // process instance, so summing gives the correct count across the whole tree.
  const totalDecisionInstancesCount = useMemo(() => {
    if (!instanceTree) return 0;
    const queue: typeof instanceTree[] = [instanceTree];
    let total = 0;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      total += node.decisionsTotalCount;
      queue.push(...node.children);
    }
    return total;
  }, [instanceTree]);

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
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, height: '100%' }} data-testid="process-instance-diagram-panel">
            <Typography variant="h6" sx={{ fontSize: 'subtitle1.fontSize', fontWeight: 600, mb: 2 }}>
              {t('processInstance:detail.diagram')}
            </Typography>
            {processDefinition?.bpmnData ? (
              <BpmnDiagram
                diagramData={processDefinition.bpmnData}
                history={historyElements}
                activeElements={activeElements}
                activeSubscriptions={activeSubscriptions}
                elementStatistics={elementStatistics}
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
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="process-instance-metadata-panel">
            <Typography variant="h6" gutterBottom sx={{ fontSize: 'subtitle1.fontSize', fontWeight: 600 }}>
              {t('processInstance:detail.metadata')}
            </Typography>
            <MetadataPanel
              entityKey={processInstance.key}
              state={processInstance.state}
              incidentsCount={unresolvedIncidentsCount}
              processType={processInstance.processType}
              name={processDefinition?.bpmnProcessName}
              version={processDefinition?.version}
              versionTag={processDefinition?.versionTag}
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
      <Paper sx={{ mt: { xs: 2, md: 3 }, borderRadius: 3 }} data-testid="process-instance-tabs-panel">
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
                {activeJobsTotalCount > 0 && (
                  <Chip
                    label={activeJobsTotalCount}
                    size="small"
                    sx={{ height: 20, fontSize: 'caption.fontSize' }}
                  />
                )}
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
                    sx={{ height: 20, fontSize: 'caption.fontSize' }}
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
                {visibleChildProcessesCount > 0 && (
                  <Chip label={visibleChildProcessesCount} size="small" sx={{ height: 20, fontSize: 'caption.fontSize' }} />
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
                  <Chip label={totalDecisionInstancesCount} size="small" sx={{ height: 20, fontSize: 'caption.fontSize' }} />
                )}
              </Box>
            }
          />
          <Tab
            data-testid="process-instance-tab-event-subscriptions"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('processInstance:tabs.eventSubscriptions')}
                {totalEventSubscriptionsCount > 0 && (
                  <Chip label={totalEventSubscriptionsCount} size="small" sx={{ height: 20, fontSize: 'caption.fontSize' }} />
                )}
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Jobs Tab */}
          <TabPanel value={activeTab} index={0}>
            <JobsTab
              instanceTree={instanceTree}
              jobsPage={jobsPage}
              jobsPageSize={jobsPageSize}
              setJobsPage={setJobsPage}
              setJobsPageSize={setJobsPageSize}
              onManualNavigation={handleJobManualNavigation}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
              onElementIdClick={handleElementIdClick}
              onNavigateToHistory={(key) => handleFocusNavigation('history', key)}
              focusedElementInstanceKey={focusedElementInstanceKey}
              autoScrollToFocusedRow={focusResolutionPending}
              onFocusedRowVisible={handleFocusedRowVisible}
              findingFocusedJob={findingFocusedJob}
            />
          </TabPanel>

          {/* History Tab */}
          <TabPanel value={activeTab} index={1}>
            <HistoryTab
              instanceTree={instanceTree}
              historySortBy={historySortBy}
              historySortOrder={historySortOrder}
              onSortChange={setHistorySort}
              onElementIdClick={handleElementIdClick}
              onNavigateToJobs={(key) => handleFocusNavigation('jobs', key)}
              onNavigateToEvents={handleEventFocusNavigation}
              focusedElementInstanceKey={focusedElementInstanceKey}
              autoNavigateToFocusedRow={focusResolutionPending}
              onFocusedRowVisible={handleFocusedRowVisible}
            />
          </TabPanel>

          {/* Incidents Tab */}
          <TabPanel value={activeTab} index={2}>
            <IncidentsTab
              instanceTree={instanceTree}
              incidentsPage={incidentsPage}
              incidentsPageSize={incidentsPageSize}
              incidentsState={incidentsState}
              setIncidentsPage={setIncidentsPage}
              setIncidentsPageSize={setIncidentsPageSize}
              setIncidentsState={setIncidentsState}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
              onElementIdClick={handleElementIdClick}
            />
          </TabPanel>

          {/* Variables Tab */}
          <TabPanel value={activeTab} index={3}>
            <VariablesTab
              instanceTree={instanceTree}
              variablesPage={variablesPage}
              variablesPageSize={variablesPageSize}
              setVariablesPage={setVariablesPage}
              setVariablesPageSize={setVariablesPageSize}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
              onElementIdClick={handleElementIdClick}
            />
          </TabPanel>

          {/* Child Processes Tab */}
          <TabPanel value={activeTab} index={4}>
            <ChildProcessesTab
              instanceTree={instanceTree}
            />
          </TabPanel>

          {/* Decision Instances Tab */}
          <TabPanel value={activeTab} index={5}>
            <DecisionInstancesTab
              instanceTree={instanceTree}
              decisionsPage={decisionsPage}
              decisionsPageSize={decisionsPageSize}
              setDecisionsPage={setDecisionsPage}
              setDecisionsPageSize={setDecisionsPageSize}
              onElementIdClick={handleElementIdClick}
            />
          </TabPanel>

          {/* Event Subscriptions Tab */}
          <TabPanel value={activeTab} index={6}>
            <EventSubscriptionsTab
              instanceTree={instanceTree}
              messageSubscriptionsPage={messageSubscriptionsPage}
              messageSubscriptionsPageSize={messageSubscriptionsPageSize}
              messageSubscriptionsState={messageSubscriptionsState}
              setMessageSubscriptionsPage={setMessageSubscriptionsPage}
              setMessageSubscriptionsPageSize={setMessageSubscriptionsPageSize}
              setMessageSubscriptionsState={setMessageSubscriptionsState}
              timerSubscriptionsPage={timerSubscriptionsPage}
              timerSubscriptionsPageSize={timerSubscriptionsPageSize}
              timerSubscriptionsState={timerSubscriptionsState}
              setTimerSubscriptionsPage={setTimerSubscriptionsPage}
              setTimerSubscriptionsPageSize={setTimerSubscriptionsPageSize}
              setTimerSubscriptionsState={setTimerSubscriptionsState}
              errorSubscriptionsPage={errorSubscriptionsPage}
              errorSubscriptionsPageSize={errorSubscriptionsPageSize}
              errorSubscriptionsState={errorSubscriptionsState}
              setErrorSubscriptionsPage={setErrorSubscriptionsPage}
              setErrorSubscriptionsPageSize={setErrorSubscriptionsPageSize}
              setErrorSubscriptionsState={setErrorSubscriptionsState}
              onRefetch={refetchAll}
              onShowNotification={showNotification}
              onElementIdClick={handleElementIdClick}
              eventType={eventType}
              onEventTypeChange={handleEventTypeChange}
              onManualNavigation={handleEventManualNavigation}
              onNavigateToHistory={(key) => handleFocusNavigation('history', key)}
              focusedElementInstanceKey={focusedElementInstanceKey}
              autoScrollToFocusedRow={focusResolutionPending}
              onFocusedRowVisible={handleFocusedRowVisible}
            />
          </TabPanel>
        </Box>
      </Paper>

      {/* Success/Error/Warning Snackbar — Alert wrapper gives us severity coloring */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
