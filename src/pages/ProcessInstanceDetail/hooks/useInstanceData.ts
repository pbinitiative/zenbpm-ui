import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLatestRef } from '@base/hooks/useLatestRef';
import {
  getProcessDefinition,
  getProcessInstance,
  useGetProcessInstanceElementStatistics,
} from '@base/openapi';
import { transformStatisticsToElementStatistics } from '@components/BpmnDiagram';
import type { ElementStatistics } from '@components/BpmnDiagram';
import type { ProcessDefinition, ProcessInstance } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
import {
  fetchInstanceTree,
  refetchNodeJobs as doRefetchNodeJobs,
  refetchNodeIncidents as doRefetchNodeIncidents,
  refetchNodeDecisions as doRefetchNodeDecisions,
  refetchNodeVariables as doRefetchNodeVariables,
  refetchNodeHistory as doRefetchNodeHistory,
  refetchNodeMessageSubscriptions as doRefetchNodeMessageSubscriptions,
  refetchNodeTimerSubscriptions as doRefetchNodeTimerSubscriptions,
  refetchNodeErrorSubscriptions as doRefetchNodeErrorSubscriptions,
  runConcurrently,
  CONCURRENT_FETCH_LIMIT,
  JOBS_PAGE_SIZE,
  INCIDENTS_PAGE_SIZE,
  DECISIONS_PAGE_SIZE,
  VARIABLES_PAGE_SIZE,
  MESSAGE_SUBSCRIPTIONS_PAGE_SIZE,
  TIMER_SUBSCRIPTIONS_PAGE_SIZE,
  ERROR_SUBSCRIPTIONS_PAGE_SIZE,
  MAX_TREE_DEPTH,
} from './fetchInstanceTree';
import type { GetHistorySortBy } from '@base/openapi/generated-api/schemas/getHistorySortBy';
import type { GetHistorySortOrder } from '@base/openapi/generated-api/schemas/getHistorySortOrder';
import type { EventSubscriptionState } from '@base/openapi/generated-api/schemas/eventSubscriptionState';
import type { GetIncidentsState } from '@base/openapi/generated-api/schemas/getIncidentsState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** States that indicate the process instance is finished and doesn't need periodic refresh */
export const TERMINAL_STATES = ['completed', 'terminated'];

/** Refresh interval in milliseconds */
export const AUTO_REFRESH_INTERVAL = 5000;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface UseInstanceDataOptions {
  /**
   * Fired when one or more process instances in the tree report a total
   * history count greater than the API/page limit so the displayed set is
   * incomplete. The hook aggregates per-fetch results into a single call
   * (one snackbar per fetch cycle, not one per truncated node).
   */
  onHistoryPartial?: (info: { instances: number; loadedCount: number; totalCount: number }) => void;
}

// ---------------------------------------------------------------------------
// Result interface
// ---------------------------------------------------------------------------

export interface UseInstanceDataResult {
  // ── Root ─────────────────────────────────────────────────────────────────
  processInstance: ProcessInstance | null;
  processDefinition: ProcessDefinition | null;
  elementStatistics: ElementStatistics | undefined;
  loading: boolean;
  error: string | null;

  // ── Full tree ─────────────────────────────────────────────────────────────
  instanceTree: ProcessInstanceNode | null;

  // ── Pagination state + setters per dataset ────────────────────────────────
  jobsPage: number;
  jobsPageSize: number;
  setJobsPage: (page: number) => void;
  setJobsPageSize: (size: number) => void;

  incidentsPage: number;
  incidentsPageSize: number;
  incidentsState: GetIncidentsState | 'all';
  setIncidentsPage: (page: number) => void;
  setIncidentsPageSize: (size: number) => void;
  setIncidentsState: (state: GetIncidentsState | 'all') => void;

  decisionsPage: number;
  decisionsPageSize: number;
  setDecisionsPage: (page: number) => void;
  setDecisionsPageSize: (size: number) => void;

  variablesPage: number;
  variablesPageSize: number;
  setVariablesPage: (page: number) => void;
  setVariablesPageSize: (size: number) => void;

  historySortBy: GetHistorySortBy;
  historySortOrder: GetHistorySortOrder;
  setHistorySort: (sortBy: GetHistorySortBy, sortOrder: GetHistorySortOrder) => void;

  messageSubscriptionsPage: number;
  messageSubscriptionsPageSize: number;
  messageSubscriptionsState: EventSubscriptionState;
  setMessageSubscriptionsPage: (page: number) => void;
  setMessageSubscriptionsPageSize: (size: number) => void;
  setMessageSubscriptionsState: (state: EventSubscriptionState) => void;

  timerSubscriptionsPage: number;
  timerSubscriptionsPageSize: number;
  timerSubscriptionsState: EventSubscriptionState;
  setTimerSubscriptionsPage: (page: number) => void;
  setTimerSubscriptionsPageSize: (size: number) => void;
  setTimerSubscriptionsState: (state: EventSubscriptionState) => void;

  errorSubscriptionsPage: number;
  errorSubscriptionsPageSize: number;
  errorSubscriptionsState: EventSubscriptionState;
  setErrorSubscriptionsPage: (page: number) => void;
  setErrorSubscriptionsPageSize: (size: number) => void;
  setErrorSubscriptionsState: (state: EventSubscriptionState) => void;

  totalEventSubscriptionsCount: number;

  // ── Refetch ───────────────────────────────────────────────────────────────
  refetchAll: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** BFS-collect all nodes from a tree */
function collectAllNodes(root: ProcessInstanceNode): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

/**
 * Project direct incidents from called processes onto the elements that lead
 * to them in the currently displayed parent diagram. Child list responses
 * already contain incidentCount, so this does not require another API call.
 */
function projectCalledProcessIncidents(
  root: ProcessInstanceNode | null,
): ElementStatistics | undefined {
  if (!root) return undefined;

  const projected: ElementStatistics = {};
  for (const node of collectAllNodes(root)) {
    if (node.isRoot || node.instance.processType !== 'callActivity') continue;

    const incidentCount = node.instance.incidentCount ?? 0;
    if (incidentCount <= 0) continue;

    // A path can contain the same BPMN element more than once in nested loops.
    // Count this called instance only once per affected diagram element.
    for (const elementId of new Set(node.callPath)) {
      const counts = projected[elementId] ?? {
        activeCount: 0,
        incidentCount: 0,
        completedCount: 0,
        terminatedCount: 0,
      };
      counts.incidentCount += incidentCount;
      projected[elementId] = counts;
    }
  }

  return Object.keys(projected).length > 0 ? projected : undefined;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useInstanceData = (
  processInstanceKey: string | undefined,
  options?: UseInstanceDataOptions,
): UseInstanceDataResult => {
  const [instanceTree, setInstanceTree] = useState<ProcessInstanceNode | null>(null);
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [subprocessElementStatistics, setSubprocessElementStatistics] = useState<
    ElementStatistics | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Per-dataset pagination state (0-indexed pages) ────────────────────────
  const [jobsPage, setJobsPage] = useState(0);
  const [jobsPageSize, setJobsPageSize] = useState(JOBS_PAGE_SIZE);
  const [incidentsPage, setIncidentsPage] = useState(0);
  const [incidentsPageSize, setIncidentsPageSize] = useState(INCIDENTS_PAGE_SIZE);
  const [incidentsState, setIncidentsState] = useState<GetIncidentsState | 'all'>('all');
  const [decisionsPage, setDecisionsPage] = useState(0);
  const [decisionsPageSize, setDecisionsPageSize] = useState(DECISIONS_PAGE_SIZE);
  const [variablesPage, setVariablesPage] = useState(0);
  const [variablesPageSize, setVariablesPageSize] = useState(VARIABLES_PAGE_SIZE);

  // Subscription pagination state
  const [messageSubscriptionsPage, setMessageSubscriptionsPage] = useState(0);
  const [messageSubscriptionsPageSize, setMessageSubscriptionsPageSize] = useState(MESSAGE_SUBSCRIPTIONS_PAGE_SIZE);
  const [messageSubscriptionsState, setMessageSubscriptionsState] = useState<EventSubscriptionState>('active');
  const [timerSubscriptionsPage, setTimerSubscriptionsPage] = useState(0);
  const [timerSubscriptionsPageSize, setTimerSubscriptionsPageSize] = useState(TIMER_SUBSCRIPTIONS_PAGE_SIZE);
  const [timerSubscriptionsState, setTimerSubscriptionsState] = useState<EventSubscriptionState>('active');
  const [errorSubscriptionsPage, setErrorSubscriptionsPage] = useState(0);
  const [errorSubscriptionsPageSize, setErrorSubscriptionsPageSize] = useState(ERROR_SUBSCRIPTIONS_PAGE_SIZE);
  const [errorSubscriptionsState, setErrorSubscriptionsState] = useState<EventSubscriptionState>('active');

  // History sort state
  const [historySortBy, setHistorySortBy] = useState<GetHistorySortBy>('createdAt');
  const [historySortOrder, setHistorySortOrder] = useState<GetHistorySortOrder>('asc');
  const historySortByRef = useLatestRef(historySortBy);
  const historySortOrderRef = useLatestRef(historySortOrder);
  // Generation counter for the history-sort effect. Bumped in the effect
  // cleanup so an in-flight (slower) sort request whose response arrives
  // after the user has already triggered a newer sort change cannot
  // overwrite `node.history` on the shared tree. Without this guard, an
  // older request that finishes last silently corrupts the rendered order.
  const historySortGenerationRef = useRef(0);

  // Refs so fetchAll (auto-refresh) always reads the current pagination values
  // without stale closure captures.
  const jobsPageRef = useLatestRef(jobsPage);
  const jobsPageSizeRef = useLatestRef(jobsPageSize);
  const incidentsPageRef = useLatestRef(incidentsPage);
  const incidentsPageSizeRef = useLatestRef(incidentsPageSize);
  const incidentsStateRef = useLatestRef(incidentsState);
  const decisionsPageRef = useLatestRef(decisionsPage);
  const decisionsPageSizeRef = useLatestRef(decisionsPageSize);
  const variablesPageRef = useLatestRef(variablesPage);
  const variablesPageSizeRef = useLatestRef(variablesPageSize);

  // Subscription pagination refs
  const messageSubscriptionsPageRef = useLatestRef(messageSubscriptionsPage);
  const messageSubscriptionsPageSizeRef = useLatestRef(messageSubscriptionsPageSize);
  const messageSubscriptionsStateRef = useLatestRef(messageSubscriptionsState);
  const timerSubscriptionsPageRef = useLatestRef(timerSubscriptionsPage);
  const timerSubscriptionsPageSizeRef = useLatestRef(timerSubscriptionsPageSize);
  const timerSubscriptionsStateRef = useLatestRef(timerSubscriptionsState);
  const errorSubscriptionsPageRef = useLatestRef(errorSubscriptionsPage);
  const errorSubscriptionsPageSizeRef = useLatestRef(errorSubscriptionsPageSize);
  const errorSubscriptionsStateRef = useLatestRef(errorSubscriptionsState);

  // Ref to always access the latest tree without stale closures.
  const instanceTreeRef = useLatestRef(instanceTree);

  // Track the last successfully fetched process definition key so we never
  // re-fetch the definition (it never changes for the same instance).
  const fetchedDefinitionKeyRef = useRef<string | null>(null);

  // Guard: pagination effects must not fire before the initial load completes.
  const initialLoadDoneRef = useRef(false);

  // Guard: prevent overlapping fetchAll calls. Without this, if a tree rebuild
  // takes longer than AUTO_REFRESH_INTERVAL the next tick starts a second rebuild
  // before the first finishes, doubling the load and causing state flicker.
  const isFetchingRef = useRef(false);

  // Latest caller-provided history callback. Stored in a ref so refreshes
  // always read the freshest closure without forcing the whole hook to
  // re-subscribe to `options`.
  const onHistoryPartialRef = useLatestRef(options?.onHistoryPartial);

  // ── Subprocess element statistics ─────────────────────────────────────────
  const fetchSubprocessStats = useCallback(
    async (root: ProcessInstanceNode) => {
      const subprocessNodes = collectAllNodes(root).filter(
        (n) => !n.isRoot && n.instance.processType === 'subprocess',
      );

      if (subprocessNodes.length === 0) {
        setSubprocessElementStatistics(undefined);
        return;
      }

      const { getProcessInstanceElementStatistics } = await import('@base/openapi');
      const results = await Promise.allSettled(
        subprocessNodes.map((node) => getProcessInstanceElementStatistics(node.instance.key)),
      );

      const merged: ElementStatistics = {};
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const stats = transformStatisticsToElementStatistics(result.value);
        if (!stats) continue;
        for (const [elementId, counts] of Object.entries(stats)) {
          if (!merged[elementId]) merged[elementId] = { activeCount: 0, incidentCount: 0, completedCount: 0, terminatedCount: 0 };
          merged[elementId].activeCount += counts.activeCount;
          merged[elementId].incidentCount += counts.incidentCount;
          merged[elementId].completedCount = (merged[elementId].completedCount ?? 0) + (counts.completedCount ?? 0);
          merged[elementId].terminatedCount = (merged[elementId].terminatedCount ?? 0) + (counts.terminatedCount ?? 0);
        }
      }
      setSubprocessElementStatistics(Object.keys(merged).length > 0 ? merged : undefined);
    },
    [],
  );

  // ── Core fetch: build / rebuild the whole tree ────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!processInstanceKey) return;
    if (isFetchingRef.current) return;   // drop concurrent calls
    isFetchingRef.current = true;
    try {
      const rootInstance = (await getProcessInstance(processInstanceKey)) as unknown as ProcessInstance;

      // Process definition never changes — only fetch it once per definition key.
      const pdKey = rootInstance.processDefinitionKey;
      if (pdKey !== fetchedDefinitionKeyRef.current) {
        void getProcessDefinition(pdKey)
          .then((def) => {
            setProcessDefinition(def as unknown as ProcessDefinition);
            fetchedDefinitionKeyRef.current = pdKey;
          })
          .catch(() => { /* non-critical */ });
      }

      // Build terminal-node cache to skip re-fetching immutable data on refresh.
      const terminalNodeCache = new Map<string, ProcessInstanceNode>();
      if (instanceTreeRef.current) {
        for (const node of collectAllNodes(instanceTreeRef.current)) {
          if (TERMINAL_STATES.includes(node.instance.state)) {
            terminalNodeCache.set(node.instance.key, node);
          }
        }
      }

      const root = await fetchInstanceTree(processInstanceKey, {
        maxDepth: MAX_TREE_DEPTH,
        preloadedRoot: rootInstance,
        terminalNodeCache,
        onHistoryPartial: (info) => onHistoryPartialRef.current?.(info),
        jobsPage: jobsPageRef.current + 1,
        jobsPageSize: jobsPageSizeRef.current,
        incidentsPage: incidentsPageRef.current + 1,
        incidentsPageSize: incidentsPageSizeRef.current,
        incidentsState: incidentsStateRef.current === 'all' ? undefined : incidentsStateRef.current,
        decisionsPage: decisionsPageRef.current + 1,
        decisionsPageSize: decisionsPageSizeRef.current,
        variablesPage: variablesPageRef.current + 1,
        variablesPageSize: variablesPageSizeRef.current,
        historySortBy: historySortByRef.current,
        historySortOrder: historySortOrderRef.current,
        messageSubscriptionsPage: messageSubscriptionsPageRef.current + 1,
        messageSubscriptionsPageSize: messageSubscriptionsPageSizeRef.current,
        messageSubscriptionsState: messageSubscriptionsStateRef.current,
        timerSubscriptionsPage: timerSubscriptionsPageRef.current + 1,
        timerSubscriptionsPageSize: timerSubscriptionsPageSizeRef.current,
        timerSubscriptionsState: timerSubscriptionsStateRef.current,
        errorSubscriptionsPage: errorSubscriptionsPageRef.current + 1,
        errorSubscriptionsPageSize: errorSubscriptionsPageSizeRef.current,
        errorSubscriptionsState: errorSubscriptionsStateRef.current,
      });

      setInstanceTree(root);
      void fetchSubprocessStats(root);
    } catch (err) {
      console.error('Failed to fetch instance tree:', err);
    } finally {
      isFetchingRef.current = false;
    }
    // The pagination/history/tree/onHistoryPartial refs read inside this callback are
    // all stable (created via useLatestRef). Tracking each one in the deps array would
    // be runtime-identical but visually noisy; suppress the rule instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processInstanceKey, fetchSubprocessStats]);

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!processInstanceKey) return;

    const fetchData = async () => {
      initialLoadDoneRef.current = false;
      setLoading(true);
      setError(null);

      // Reset pagination and definition tracking when the instance key changes.
      setJobsPage(0);
      setJobsPageSize(JOBS_PAGE_SIZE);
      setIncidentsPage(0);
      setIncidentsPageSize(INCIDENTS_PAGE_SIZE);
      setIncidentsState('all');
      setDecisionsPage(0);
      setDecisionsPageSize(DECISIONS_PAGE_SIZE);
      setVariablesPage(0);
      setVariablesPageSize(VARIABLES_PAGE_SIZE);
      setMessageSubscriptionsPage(0);
      setMessageSubscriptionsPageSize(MESSAGE_SUBSCRIPTIONS_PAGE_SIZE);
      setMessageSubscriptionsState('active');
      setTimerSubscriptionsPage(0);
      setTimerSubscriptionsPageSize(TIMER_SUBSCRIPTIONS_PAGE_SIZE);
      setTimerSubscriptionsState('active');
      setErrorSubscriptionsPage(0);
      setErrorSubscriptionsPageSize(ERROR_SUBSCRIPTIONS_PAGE_SIZE);
      setErrorSubscriptionsState('active');
      fetchedDefinitionKeyRef.current = null;
      // Also reset pagination refs so fetchAll uses page 1 for the new instance.
      jobsPageRef.current = 0;
      jobsPageSizeRef.current = JOBS_PAGE_SIZE;
      incidentsPageRef.current = 0;
      incidentsPageSizeRef.current = INCIDENTS_PAGE_SIZE;
      incidentsStateRef.current = 'all';
      decisionsPageRef.current = 0;
      decisionsPageSizeRef.current = DECISIONS_PAGE_SIZE;
      variablesPageRef.current = 0;
      variablesPageSizeRef.current = VARIABLES_PAGE_SIZE;
      messageSubscriptionsPageRef.current = 0;
      messageSubscriptionsPageSizeRef.current = MESSAGE_SUBSCRIPTIONS_PAGE_SIZE;
      messageSubscriptionsStateRef.current = 'active';
      timerSubscriptionsPageRef.current = 0;
      timerSubscriptionsPageSizeRef.current = TIMER_SUBSCRIPTIONS_PAGE_SIZE;
      timerSubscriptionsStateRef.current = 'active';
      errorSubscriptionsPageRef.current = 0;
      errorSubscriptionsPageSizeRef.current = ERROR_SUBSCRIPTIONS_PAGE_SIZE;
      errorSubscriptionsStateRef.current = 'active';

      try {
        await fetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process instance');
      } finally {
        if (!isFetchingRef.current) {    // this avoids e error message instead loading
          setLoading(false);
          initialLoadDoneRef.current = true;
        }
      }
    };

    void fetchData();
    // `fetchAll` reads all stable refs (created via useLatestRef); they are captured
    // transitively through `fetchAll`'s identity. Adding each one here would be
    // runtime-identical but visually noisy; suppress the rule instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processInstanceKey, fetchAll]);

  // ── Periodic auto-refresh for active instances ────────────────────────────
  const isActiveInstance =
    instanceTree?.instance && !TERMINAL_STATES.includes(instanceTree.instance.state);

  const fetchAllRef = useLatestRef(fetchAll);

  useEffect(() => {
    if (!processInstanceKey || loading || !isActiveInstance) return;
    const intervalId = setInterval(() => {
      // Skip refresh when the browser tab is hidden — no point rebuilding
      // the tree while the user isn't looking at it.
      if (document.hidden) return;
      void fetchAllRef.current();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
    // fetchAllRef is a stable ref (created via useLatestRef); omitting it
    // here would be harmless at runtime but trips the exhaustive-deps rule.
  }, [processInstanceKey, loading, isActiveInstance, fetchAllRef]);

  // ── Root element statistics via React Query (auto-poll) ───────────────────
  // Enabled as soon as the key is known — no need to wait for the definition.
  const { data: rawElementStatistics } = useGetProcessInstanceElementStatistics(
    processInstanceKey ?? '',
    {
      query: {
        enabled: !!processInstanceKey,
        refetchInterval: AUTO_REFRESH_INTERVAL,
      },
    },
  );

  const calledProcessIncidentStatistics = useMemo(
    () => projectCalledProcessIncidents(instanceTree),
    [instanceTree],
  );

  const elementStatistics = useMemo(() => {
    const base = transformStatisticsToElementStatistics(rawElementStatistics);
    const additionalStatistics = [
      subprocessElementStatistics,
      calledProcessIncidentStatistics,
    ].filter((statistics): statistics is ElementStatistics => statistics !== undefined);

    if (additionalStatistics.length === 0) return base;

    const merged: ElementStatistics = {};
    for (const statistics of [base, ...additionalStatistics]) {
      if (!statistics) continue;
      for (const [elementId, counts] of Object.entries(statistics)) {
        const current = merged[elementId] ?? {
          activeCount: 0,
          incidentCount: 0,
          completedCount: 0,
          terminatedCount: 0,
        };
        merged[elementId] = {
          activeCount: current.activeCount + counts.activeCount,
          incidentCount: current.incidentCount + counts.incidentCount,
          completedCount: (current.completedCount ?? 0) + (counts.completedCount ?? 0),
          terminatedCount: (current.terminatedCount ?? 0) + (counts.terminatedCount ?? 0),
        };
      }
    }
    return merged;
  }, [rawElementStatistics, subprocessElementStatistics, calledProcessIncidentStatistics]);

  // ── Pagination effects — update the current page in the tree ─────────────
  // These only fire after the initial load completes (guard via ref).

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) => doRefetchNodeJobs(node, jobsPage + 1, jobsPageSize))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [jobsPage, jobsPageSize, instanceTreeRef]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) => doRefetchNodeIncidents(node, incidentsPage + 1, incidentsPageSize, incidentsState === 'all' ? undefined : incidentsState))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [incidentsPage, incidentsPageSize, incidentsState, instanceTreeRef]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) => doRefetchNodeDecisions(node, decisionsPage + 1, decisionsPageSize))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [decisionsPage, decisionsPageSize, instanceTreeRef]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    nodes.forEach((node) => doRefetchNodeVariables(node, variablesPage + 1, variablesPageSize));
    setInstanceTree((prev) => (prev ? { ...prev } : prev));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [variablesPage, variablesPageSize, instanceTreeRef]);

  const setHistorySort = useCallback((sortBy: GetHistorySortBy, sortOrder: GetHistorySortOrder) => {
    setHistorySortBy(sortBy);
    setHistorySortOrder(sortOrder);
  }, []);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    // Capture the current generation. Cleanup runs before the next effect
    // and bumps the ref, so any in-flight request whose response arrives
    // later can compare against `historySortGenerationRef.current` and
    // bail out — both before mutating `node.history` (handled inside
    // `refetchNodeHistory` via `isStale`) and before triggering a re-render
    // or snackbar here. This prevents a slow older sort request that
    // resolves last from clobbering fresh data already written by a
    // newer sort request.
    const myGeneration = ++historySortGenerationRef.current;
    const isStale = () => historySortGenerationRef.current !== myGeneration;
    // Per-sort-change aggregator so we still emit a single notification even
    // when several nodes in the tree trigger partial-history warnings.
    const partialHistories: Array<{ totalCount: number; loadedCount: number }> = [];
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) =>
      doRefetchNodeHistory(node, historySortBy, historySortOrder, {
        // Discard partial-history signals from stale sort generations.
        onHistoryPartial: (info) => {
          if (isStale()) return;
          partialHistories.push(info);
        },
        isStale,
      }),
    )
      .then(() => {
        // If the user has since changed the sort, this response is stale —
        // skip the re-render and snackbar. (The mutation guard inside
        // `refetchNodeHistory` already prevented `node.history` from being
        // overwritten by stale data.)
        if (isStale()) return;
        if (partialHistories.length > 0) {
          onHistoryPartialRef.current?.({
            instances: partialHistories.length,
            loadedCount: partialHistories.reduce((sum, p) => sum + p.loadedCount, 0),
            totalCount: partialHistories.reduce((sum, p) => sum + p.totalCount, 0),
          });
        }
        setInstanceTree((prev) => (prev ? { ...prev } : prev));
      });
    // Invalidate this generation on the next render. Order matters: the
    // bump MUST happen after we've captured `myGeneration` above (so this
    // effect's own body isn't self-invalidated) and BEFORE the next
    // effect's body runs (so the new effect sees a fresh generation).
    return () => {
      if (historySortGenerationRef.current === myGeneration) {
        historySortGenerationRef.current += 1;
      }
    };
    // instanceTreeRef and onHistoryPartialRef are stable refs (created via useLatestRef).
  }, [historySortBy, historySortOrder, instanceTreeRef, onHistoryPartialRef]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) => doRefetchNodeMessageSubscriptions(node, messageSubscriptionsPage + 1, messageSubscriptionsPageSize, messageSubscriptionsState))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)))
      .catch((err: unknown) => console.error('Failed to paginate message subscriptions:', err));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [messageSubscriptionsPage, messageSubscriptionsPageSize, messageSubscriptionsState, instanceTreeRef]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) => doRefetchNodeTimerSubscriptions(node, timerSubscriptionsPage + 1, timerSubscriptionsPageSize, timerSubscriptionsState))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)))
      .catch((err: unknown) => console.error('Failed to paginate timer subscriptions:', err));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [timerSubscriptionsPage, timerSubscriptionsPageSize, timerSubscriptionsState, instanceTreeRef]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void runConcurrently(nodes, CONCURRENT_FETCH_LIMIT, (node) => doRefetchNodeErrorSubscriptions(node, errorSubscriptionsPage + 1, errorSubscriptionsPageSize, errorSubscriptionsState))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)))
      .catch((err: unknown) => console.error('Failed to paginate error subscriptions:', err));
    // instanceTreeRef is a stable ref (created via useLatestRef).
  }, [errorSubscriptionsPage, errorSubscriptionsPageSize, errorSubscriptionsState, instanceTreeRef]);

  const totalEventSubscriptionsCount = useMemo(() => {
    if (!instanceTree) return 0;
    const queue: typeof instanceTree[] = [instanceTree];
    let total = 0;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) continue;
      total += node.messageSubscriptionsTotalCount + node.timerSubscriptionsTotalCount + node.errorSubscriptionsTotalCount;
      queue.push(...node.children);
    }
    return total;
  }, [instanceTree]);

  // ── Return ──────────────────────────────────────────────────────────────

  return {
    processInstance: instanceTree?.instance ?? null,
    processDefinition,
    elementStatistics,
    loading,
    error,

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

    refetchAll: fetchAll,
  };
};
