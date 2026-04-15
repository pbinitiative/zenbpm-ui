import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  refetchNodeChildren as doRefetchNodeChildren,
  refetchNodeVariables as doRefetchNodeVariables,
  JOBS_PAGE_SIZE,
  INCIDENTS_PAGE_SIZE,
  DECISIONS_PAGE_SIZE,
  VARIABLES_PAGE_SIZE,
  CHILDREN_PAGE_SIZE,
  MAX_TREE_DEPTH,
} from './fetchInstanceTree';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** States that indicate the process instance is finished and doesn't need periodic refresh */
export const TERMINAL_STATES = ['completed', 'terminated'];

/** Refresh interval in milliseconds */
export const AUTO_REFRESH_INTERVAL = 5000;

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
  setIncidentsPage: (page: number) => void;
  setIncidentsPageSize: (size: number) => void;

  decisionsPage: number;
  decisionsPageSize: number;
  setDecisionsPage: (page: number) => void;
  setDecisionsPageSize: (size: number) => void;

  variablesPage: number;
  variablesPageSize: number;
  setVariablesPage: (page: number) => void;
  setVariablesPageSize: (size: number) => void;

  childrenPage: number;
  setChildrenPage: (page: number) => void;

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
    if (!node) continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useInstanceData = (
  processInstanceKey: string | undefined,
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
  const [decisionsPage, setDecisionsPage] = useState(0);
  const [decisionsPageSize, setDecisionsPageSize] = useState(DECISIONS_PAGE_SIZE);
  const [variablesPage, setVariablesPage] = useState(0);
  const [variablesPageSize, setVariablesPageSize] = useState(VARIABLES_PAGE_SIZE);
  const [childrenPage, setChildrenPage] = useState(0);

  // Refs so fetchAll (auto-refresh) always reads the current pagination values
  // without stale closure captures.
  const jobsPageRef = useRef(0);
  const jobsPageSizeRef = useRef(JOBS_PAGE_SIZE);
  const incidentsPageRef = useRef(0);
  const incidentsPageSizeRef = useRef(INCIDENTS_PAGE_SIZE);
  const decisionsPageRef = useRef(0);
  const decisionsPageSizeRef = useRef(DECISIONS_PAGE_SIZE);
  const variablesPageRef = useRef(0);
  const variablesPageSizeRef = useRef(VARIABLES_PAGE_SIZE);
  jobsPageRef.current = jobsPage;
  jobsPageSizeRef.current = jobsPageSize;
  incidentsPageRef.current = incidentsPage;
  incidentsPageSizeRef.current = incidentsPageSize;
  decisionsPageRef.current = decisionsPage;
  decisionsPageSizeRef.current = decisionsPageSize;
  variablesPageRef.current = variablesPage;
  variablesPageSizeRef.current = variablesPageSize;

  // Ref to always access the latest tree without stale closures.
  const instanceTreeRef = useRef(instanceTree);
  instanceTreeRef.current = instanceTree;

  // Track the last successfully fetched process definition key so we never
  // re-fetch the definition (it never changes for the same instance).
  const fetchedDefinitionKeyRef = useRef<string | null>(null);

  // Guard: pagination effects must not fire before the initial load completes.
  const initialLoadDoneRef = useRef(false);

  // ── Subprocess element statistics ─────────────────────────────────────────
  const fetchSubprocessStats = useCallback(
    async (root: ProcessInstanceNode) => {
      const subprocessNodes = collectAllNodes(root).filter(
        (n) => n.instance.processType === 'subprocess',
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
        jobsPage: jobsPageRef.current + 1,
        jobsPageSize: jobsPageSizeRef.current,
        incidentsPage: incidentsPageRef.current + 1,
        incidentsPageSize: incidentsPageSizeRef.current,
        decisionsPage: decisionsPageRef.current + 1,
        decisionsPageSize: decisionsPageSizeRef.current,
        variablesPage: variablesPageRef.current + 1,
        variablesPageSize: variablesPageSizeRef.current,
      });

      setInstanceTree(root);
      void fetchSubprocessStats(root);
    } catch (err) {
      console.error('Failed to fetch instance tree:', err);
    }
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
      setDecisionsPage(0);
      setDecisionsPageSize(DECISIONS_PAGE_SIZE);
      setVariablesPage(0);
      setVariablesPageSize(VARIABLES_PAGE_SIZE);
      setChildrenPage(0);
      fetchedDefinitionKeyRef.current = null;
      // Also reset pagination refs so fetchAll uses page 1 for the new instance.
      jobsPageRef.current = 0;
      jobsPageSizeRef.current = JOBS_PAGE_SIZE;
      incidentsPageRef.current = 0;
      incidentsPageSizeRef.current = INCIDENTS_PAGE_SIZE;
      decisionsPageRef.current = 0;
      decisionsPageSizeRef.current = DECISIONS_PAGE_SIZE;
      variablesPageRef.current = 0;
      variablesPageSizeRef.current = VARIABLES_PAGE_SIZE;

      try {
        await fetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process instance');
      } finally {
        setLoading(false);
        initialLoadDoneRef.current = true;
      }
    };

    void fetchData();
  }, [processInstanceKey, fetchAll]);

  // ── Periodic auto-refresh for active instances ────────────────────────────
  const isActiveInstance =
    instanceTree?.instance && !TERMINAL_STATES.includes(instanceTree.instance.state);

  const fetchAllRef = useRef(fetchAll);
  fetchAllRef.current = fetchAll;

  useEffect(() => {
    if (!processInstanceKey || loading || !isActiveInstance) return;
    const intervalId = setInterval(() => {
      void fetchAllRef.current();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [processInstanceKey, loading, isActiveInstance]);

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

  const elementStatistics = useMemo(() => {
    const base = transformStatisticsToElementStatistics(rawElementStatistics);
    if (!subprocessElementStatistics) return base;
    if (!base) return subprocessElementStatistics;
    const merged: ElementStatistics = { ...base };
    for (const [elementId, counts] of Object.entries(subprocessElementStatistics)) {
      if (!merged[elementId]) merged[elementId] = { activeCount: 0, incidentCount: 0, completedCount: 0, terminatedCount: 0 };
      merged[elementId] = {
        activeCount: merged[elementId].activeCount + counts.activeCount,
        incidentCount: merged[elementId].incidentCount + counts.incidentCount,
        completedCount: (merged[elementId].completedCount ?? 0) + (counts.completedCount ?? 0),
        terminatedCount: (merged[elementId].terminatedCount ?? 0) + (counts.terminatedCount ?? 0),
      };
    }
    return merged;
  }, [rawElementStatistics, subprocessElementStatistics]);

  // ── Pagination effects — update the current page in the tree ─────────────
  // These only fire after the initial load completes (guard via ref).

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void Promise.all(nodes.map((node) => doRefetchNodeJobs(node, jobsPage + 1, jobsPageSize)))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
  }, [jobsPage, jobsPageSize]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void Promise.all(nodes.map((node) => doRefetchNodeIncidents(node, incidentsPage + 1, incidentsPageSize)))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
  }, [incidentsPage, incidentsPageSize]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void Promise.all(nodes.map((node) => doRefetchNodeDecisions(node, decisionsPage + 1, decisionsPageSize)))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
  }, [decisionsPage, decisionsPageSize]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    nodes.forEach((node) => doRefetchNodeVariables(node, variablesPage + 1, variablesPageSize));
    setInstanceTree((prev) => (prev ? { ...prev } : prev));
  }, [variablesPage, variablesPageSize]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const tree = instanceTreeRef.current;
    if (!tree) return;
    const nodes = collectAllNodes(tree);
    void Promise.all(nodes.map((node) => doRefetchNodeChildren(node, childrenPage + 1, CHILDREN_PAGE_SIZE)))
      .then(() => setInstanceTree((prev) => (prev ? { ...prev } : prev)));
  }, [childrenPage]);

  // ── Return ────────────────────────────────────────────────────────────────

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
    setIncidentsPage,
    setIncidentsPageSize,

    decisionsPage,
    decisionsPageSize,
    setDecisionsPage,
    setDecisionsPageSize,

    variablesPage,
    variablesPageSize,
    setVariablesPage,
    setVariablesPageSize,

    childrenPage,
    setChildrenPage,

    refetchAll: fetchAll,
  };
};
