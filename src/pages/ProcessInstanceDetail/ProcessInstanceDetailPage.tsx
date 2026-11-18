import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { BpmnDiagram } from '@components/BpmnDiagram';
import { MetadataPanel } from '@components/DiagramDetailLayout';
import type { DefinitionInfo } from '@components/DiagramDetailLayout';
import {
  findFocusedEventPage,
  findFocusedJobPages,
  isFocusedJob,
  jobFocusRequestKey,
  useInstanceData,
  type EventSubscriptionFilterState,
  type FocusedEventType,
} from './hooks';
import { JobsTab, VariablesTab, IncidentsTab, HistoryTab, ChildProcessesTab, DecisionInstancesTab, EventSubscriptionsTab } from './tabs';
import {
  collectNodes,
  elementIdsWithExecutionListeners,
  elementIdsWithJobsTheirTypeDoesNotTell,
  holdsJobsOfPage,
} from './utils';
import type { NotificationOptions } from './types';

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

// Search the state filter currently shown in the tab first (its total is
// already known), then fall back to an unfiltered search across every state.
const eventStateSearchOrder = (
  current: EventSubscriptionFilterState,
): EventSubscriptionFilterState[] => (current === 'all' ? ['all'] : [current, 'all']);

// Map tab name to index
/** A tab whose table a navigation can focus on the rows of an element instance. */
type FocusTab = 'jobs' | 'history' | 'events';

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
  // Narrows the focus on the Jobs tab to one job of the element instance. The
  // element instance alone does not name a job: the jobs of an element's
  // execution listeners share it with the element's own job.
  // An empty key names no job: it counts as none everywhere, or the table would
  // look for a row with an empty key while the page took the focus for settled.
  const focusedJobKey = searchParams.get('focusJobKey') || undefined;
  const eventTypeParam = searchParams.get('eventType');
  const eventType: FocusedEventType =
    eventTypeParam === 'timers' || eventTypeParam === 'errors' ? eventTypeParam : 'messages';

  // A URL focus is resolved only once. The key remains in the URL afterward so
  // either table can continue highlighting it whenever the row is visible.
  const [pendingFocusKey, setPendingFocusKey] = useState<string | undefined>(
    focusedElementInstanceKey
  );
  // The tab a focus navigation leads to, while the navigation is under way.
  // Until the page shows that tab, the one left behind is still on screen, and
  // may show a focused row of its own: the row of the element whose jobs are
  // asked for. That row being visible is no answer to the navigation.
  const pendingFocusTabRef = useRef<FocusTab | undefined>(undefined);
  // The navigation has arrived once the address names its tab. From then on
  // only that tab is on screen, and a focus the address brings later, such as
  // one the browser goes back to, leads to whatever tab the address names.
  // Looked at after every render: the tab is set outside of rendering.
  useEffect(() => {
    if (pendingFocusTabRef.current === tabParam) pendingFocusTabRef.current = undefined;
  });
  const [findingFocusedJob, setFindingFocusedJob] = useState(false);
  const handledJobFocusesRef = useRef(new Set<string>());
  const handledEventFocusesRef = useRef(new Set<string>());
  const jobSearchAbortRef = useRef<AbortController | null>(null);
  const eventSearchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    jobSearchAbortRef.current?.abort();
    eventSearchAbortRef.current?.abort();
    if (focusedElementInstanceKey) {
      handledJobFocusesRef.current.delete(
        jobFocusRequestKey(processInstanceKey, focusedElementInstanceKey, focusedJobKey)
      );
      handledEventFocusesRef.current.delete(`${processInstanceKey}:${focusedElementInstanceKey}`);
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
  }, [focusedElementInstanceKey, focusedJobKey, processInstanceKey]);

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

  // Focuses a tab on an element instance, and the Jobs tab on one job of it
  // where a job key is given; without one, every job of the element is focused.
  const handleFocusNavigation = useCallback((
    tab: 'jobs' | 'history',
    elementInstanceKey: string,
    jobKey?: string
  ) => {
    handledJobFocusesRef.current.delete(jobFocusRequestKey(processInstanceKey, elementInstanceKey, jobKey));
    jobSearchAbortRef.current?.abort();
    eventSearchAbortRef.current?.abort();
    pendingFocusTabRef.current = tab;
    setPendingFocusKey(elementInstanceKey);

    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.set('focusElementInstanceKey', elementInstanceKey);
    if (jobKey) next.set('focusJobKey', jobKey);
    else next.delete('focusJobKey');
    setSearchParams(next);
  }, [processInstanceKey, searchParams, setSearchParams]);

  const handleEventFocusNavigation = useCallback((elementInstanceKey: string) => {
    const requestKey = `${processInstanceKey}:${elementInstanceKey}`;
    handledEventFocusesRef.current.delete(requestKey);
    eventSearchAbortRef.current?.abort();
    pendingFocusTabRef.current = 'events';
    setPendingFocusKey(elementInstanceKey);

    const next = new URLSearchParams(searchParams);
    next.set('tab', 'events');
    next.set('eventType', 'messages');
    next.set('focusElementInstanceKey', elementInstanceKey);
    next.delete('focusJobKey');
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
    persist: boolean;
  }>({
    open: false,
    message: '',
    severity: 'success',
    persist: false,
  });

  // Show notification helper. A message the operator has to read and act on,
  // such as the engine's reason for refusing a request, persists until it is
  // closed instead of hiding after a few seconds or on a click elsewhere.
  const showNotification = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning', options?: NotificationOptions) => {
      setSnackbar({ open: true, message, severity, persist: options?.persist ?? false });
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
    activeEventSubscriptionsCount,
  } = useInstanceData(processInstanceKey, {
    onHistoryPartial: handleHistoryPartial,
  });

  // Count of process instances shown in the Child Processes tab
  // (depth-1 + depth-2, excluding engine-internal multiInstance and subprocess wrappers).
  const visibleChildProcessesCount = useMemo(() => {
    if (!instanceTree) return 0;
    // BFS over the entire tree — mirrors exactly what ChildProcessesTab renders as rows.
    // multiInstance and subprocess wrappers are hidden in the tab; everything else is a row.
    const HIDDEN = new Set(['multiInstance', 'subprocess']);
    const queue = [...instanceTree.children];
    let count = 0;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      if (!HIDDEN.has(node.instance.processType ?? '')) count++;
      queue.push(...node.children);
    }
    return count;
  }, [instanceTree]);

  // The History tab shows the instances which run the root's definition, so
  // its model tells for each of their elements whether it has jobs.
  const elementIdsWithJobs = useMemo(
    () => elementIdsWithJobsTheirTypeDoesNotTell(processDefinition?.bpmnData),
    [processDefinition?.bpmnData]
  );

  // The same model tells which elements carry execution listeners, and so
  // which element instances may have several jobs.
  const elementIdsWithListeners = useMemo(
    () => elementIdsWithExecutionListeners(processDefinition?.bpmnData),
    [processDefinition?.bpmnData]
  );
  const modelDefinitionKey = processDefinition?.key;

  const focusResolutionPending =
    focusedElementInstanceKey !== undefined && pendingFocusKey === focusedElementInstanceKey;

  // A focus is settled once the tab it leads to shows a focused row. A focus
  // which came with the address leads to whatever tab the address names.
  const settleFocusOn = useCallback((tab: FocusTab) => {
    if (pendingFocusTabRef.current !== undefined && pendingFocusTabRef.current !== tab) return;
    setPendingFocusKey((current) =>
      current === focusedElementInstanceKey ? undefined : current
    );
  }, [focusedElementInstanceKey]);
  // The Jobs table shows the rows it has until the page selected is there, so
  // a focused row can be one of the page selected before, about to go. Only a
  // job on the page selected is in view, and only its row settles the focus.
  const focusedJobIsInView = useMemo(
    () =>
      instanceTree !== null &&
      focusedElementInstanceKey !== undefined &&
      collectNodes(instanceTree).some(
        (node) =>
          holdsJobsOfPage(node, jobsPage, jobsPageSize) &&
          node.jobs.some((job) => isFocusedJob(job, focusedElementInstanceKey, focusedJobKey))
      ),
    [focusedElementInstanceKey, focusedJobKey, instanceTree, jobsPage, jobsPageSize]
  );
  const handleFocusedJobVisible = useCallback(() => {
    if (focusedJobIsInView) settleFocusOn('jobs');
  }, [focusedJobIsInView, settleFocusOn]);
  const handleFocusedHistoryRowVisible = useCallback(() => settleFocusOn('history'), [settleFocusOn]);
  const handleFocusedEventVisible = useCallback(() => settleFocusOn('events'), [settleFocusOn]);

  useEffect(() => {
    // A search for the focused job leads to the Jobs tab and nowhere else. The
    // address can come to name another tab while one is under way and still
    // name the same focus, as it does when the browser goes back to the row of
    // the History tab the search was started from. Nothing else ends the
    // search then, and its answer would turn the Jobs page, or speak of jobs
    // over a tab which shows none. Ended here, it starts anew should the Jobs
    // tab come back with the focus still open.
    if (activeTab !== TAB_MAP.jobs) {
      if (jobSearchAbortRef.current && focusedElementInstanceKey) {
        jobSearchAbortRef.current.abort();
        handledJobFocusesRef.current.delete(
          jobFocusRequestKey(processInstanceKey, focusedElementInstanceKey, focusedJobKey)
        );
      }
      return;
    }
    if (!focusResolutionPending || !focusedElementInstanceKey || !instanceTree) return;

    const nodes = collectNodes(instanceTree);

    // Full History is client-side, so it identifies the exact process node whose
    // server-paginated Jobs endpoint needs to be scanned.
    const owner = nodes.find((node) =>
      node.history.some((history) => history.key === focusedElementInstanceKey)
    );
    const requestKey = jobFocusRequestKey(processInstanceKey, focusedElementInstanceKey, focusedJobKey);

    // A focus on an element instance means every job of it. There are several
    // only where the element carries execution listeners, which the model
    // tells; where it does not tell, because it is not loaded or the instance
    // runs another definition, several jobs are taken for possible.
    const focusedElementId = owner?.history.find(
      (history) => history.key === focusedElementInstanceKey
    )?.elementId;
    const modelTellsNoListener =
      owner !== undefined &&
      owner.instance.processDefinitionKey === modelDefinitionKey &&
      elementIdsWithListeners !== undefined &&
      focusedElementId !== undefined &&
      !elementIdsWithListeners.has(focusedElementId);
    const mayHaveSeveralJobs = !focusedJobKey && !modelTellsNoListener;

    // The desired row may already be on the page of jobs which is selected.
    // That settles a focus on one job, named or the only one of its element.
    // Several jobs are all in view only where the jobs of their process
    // instance fit on one page: a page boundary can part them.
    const inView = focusedJobIsInView;
    const mayHaveJobsOnOtherPages =
      mayHaveSeveralJobs && owner !== undefined && owner.jobsTotalCount > jobsPageSize;
    if (inView && !mayHaveJobsOnOtherPages) return;

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
    // jobs in view stay in view while the other pages are looked through
    setFindingFocusedJob(!inView);

    void findFocusedJobPages({
      processInstanceKey: owner.instance.key,
      elementInstanceKey: focusedElementInstanceKey,
      jobKey: focusedJobKey,
      mayHaveSeveralJobs,
      pageSize: jobsPageSize,
      totalCount: owner.jobsTotalCount,
      signal: controller.signal,
    })
      .then((pages) => {
        if (controller.signal.aborted) return;
        if (pages === undefined) {
          if (inView) return;
          setPendingFocusKey(undefined);
          showNotification(t('processInstance:messages.relatedJobNotFound'), 'error');
          return;
        }
        // the page is the one the search started on: turning it ends the search
        const shownPage = inView ? jobsPage : pages[0];
        if (!inView) setJobsPage(shownPage);
        // the table shows one page: say where the other jobs of the element are
        const otherPages = pages.filter((page) => page !== shownPage);
        if (otherPages.length > 0) {
          showNotification(
            t('processInstance:messages.relatedJobsOnOtherPages', {
              pages: otherPages.map((page) => page + 1).join(', '),
            }),
            'warning'
          );
        }
      })
      .catch(() => {
        // with jobs of the element in view, only the hint at the other pages is lost
        if (controller.signal.aborted || inView) return;
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
    elementIdsWithListeners,
    focusResolutionPending,
    focusedElementInstanceKey,
    focusedJobIsInView,
    focusedJobKey,
    instanceTree,
    jobsPage,
    jobsPageSize,
    modelDefinitionKey,
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
        ...eventStateSearchOrder(messageSubscriptionsState)
          .map((state, index) => ({
            type: 'messages' as const,
            pageSize: messageSubscriptionsPageSize,
            totalCount: index === 0 ? owner.messageSubscriptionsTotalCount : undefined,
            state,
          })),
        ...eventStateSearchOrder(timerSubscriptionsState)
          .map((state, index) => ({
            type: 'timers' as const,
            pageSize: timerSubscriptionsPageSize,
            totalCount: index === 0 ? owner.timerSubscriptionsTotalCount : undefined,
            state,
          })),
        ...eventStateSearchOrder(errorSubscriptionsState)
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
                {activeEventSubscriptionsCount > 0 && (
                  // The tab lists every state; the chip counts active subscriptions only
                  // (same convention as the Jobs tab), so say so for sighted and AT users.
                  <Tooltip title={t('processInstance:tabs.eventSubscriptionsActiveCountTooltip')}>
                    <Chip
                      label={activeEventSubscriptionsCount}
                      aria-label={t('processInstance:tabs.eventSubscriptionsActiveCount', { count: activeEventSubscriptionsCount })}
                      size="small"
                      sx={{ height: 20, fontSize: 'caption.fontSize' }}
                    />
                  </Tooltip>
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
              focusedJobKey={focusedJobKey}
              autoScrollToFocusedRow={focusResolutionPending}
              onFocusedRowVisible={handleFocusedJobVisible}
              findingFocusedJob={findingFocusedJob}
            />
          </TabPanel>

          {/* History Tab */}
          <TabPanel value={activeTab} index={1}>
            <HistoryTab
              instanceTree={instanceTree}
              onElementIdClick={handleElementIdClick}
              onNavigateToJobs={(key) => handleFocusNavigation('jobs', key)}
              onNavigateToEvents={handleEventFocusNavigation}
              elementIdsWithJobs={elementIdsWithJobs}
              focusedElementInstanceKey={focusedElementInstanceKey}
              autoNavigateToFocusedRow={focusResolutionPending}
              onFocusedRowVisible={handleFocusedHistoryRowVisible}
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
              onNavigateToJob={(elementInstanceKey, jobKey) => handleFocusNavigation('jobs', elementInstanceKey, jobKey)}
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
              onFocusedRowVisible={handleFocusedEventVisible}
            />
          </TabPanel>
        </Box>
      </Paper>

      {/* Success/Error/Warning Snackbar — Alert wrapper gives us severity coloring */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.persist ? null : 6000}
        onClose={(_event, reason) => {
          if (snackbar.persist && reason === 'clickaway') return;
          setSnackbar({ ...snackbar, open: false });
        }}
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
