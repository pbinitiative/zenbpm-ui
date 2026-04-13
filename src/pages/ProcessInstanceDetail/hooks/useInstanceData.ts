import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DecisionInstanceSummary } from '@base/openapi';
import {
  getProcessDefinition,
  getProcessInstanceElementStatistics,
  useGetProcessInstanceElementStatistics,
} from '@base/openapi';
import { transformStatisticsToElementStatistics } from '@components/BpmnDiagram';
import type { ElementStatistics } from '@components/BpmnDiagram';
import type { FlowElementHistory, Incident, Job, ProcessDefinition, ProcessInstance } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
import {
  fetchInstanceTree,
  refetchNodeJobs as doRefetchNodeJobs,
  refetchNodeIncidents as doRefetchNodeIncidents,
  refetchNodeDecisions as doRefetchNodeDecisions,
  refetchNodeChildren as doRefetchNodeChildren,
  JOBS_PAGE_SIZE,
  INCIDENTS_PAGE_SIZE,
  DECISIONS_PAGE_SIZE,
  CHILDREN_PAGE_SIZE,
  MAX_TREE_DEPTH,
} from './fetchInstanceTree';
import { flattenTree } from './flattenTree';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** States that indicate the process instance is finished and doesn't need periodic refresh */
export const TERMINAL_STATES = ['completed', 'terminated'];

/** Refresh interval in milliseconds */
export const AUTO_REFRESH_INTERVAL = 5000;

// ---------------------------------------------------------------------------
// Pagination types — one page/pageSize shared across all nodes per dataset
// ---------------------------------------------------------------------------

export interface DatasetPagination {
  page: number;
  pageSize: number;
}

export type PageChangeFn = (page: number, pageSize: number) => Promise<void>;

export type ChildrenPageChangeFn = (page: number) => Promise<void>;

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

  // ── Shared pagination state per dataset ──────────────────────────────────
  jobsPagination: DatasetPagination;
  incidentsPagination: DatasetPagination;
  decisionsPagination: DatasetPagination;
  childrenPagination: DatasetPagination;

  // ── Page-change callbacks (refetch all nodes at a new page) ─────────────────
  onJobsPageChange: PageChangeFn;
  onIncidentsPageChange: PageChangeFn;
  onDecisionsPageChange: PageChangeFn;
  onChildrenPageChange: ChildrenPageChangeFn;

  // ── Backward-compatible flat accessors (root node's data) ─────────────────
  jobs: Job[];
  history: FlowElementHistory[];
  incidents: Incident[];
  decisionInstances: DecisionInstanceSummary[];

  // ── Backward-compatible flat maps (all non-root nodes) ────────────────────
  childProcesses: ProcessInstance[];
  childProcessesTotalCount: number | undefined;
  grandchildProcesses: Record<string, ProcessInstance[]>;
  childProcessJobs: Record<string, Job[]>;
  childProcessIncidents: Record<string, Incident[]>;
  childProcessHistory: FlowElementHistory[];
  childProcessDecisionInstances: Record<string, DecisionInstanceSummary[]>;

  // ── Legacy top-level refetch helpers (used by tabs / action handlers) ──────
  refetchJobs: () => Promise<void>;
  refetchIncidents: () => Promise<void>;
  refetchVariables: () => Promise<void>;
  refetchHistory: () => Promise<void>;
  refetchChildProcesses: () => Promise<void>;
  refetchDecisionInstances: () => Promise<void>;
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

  // ── Shared per-dataset page state (0-indexed) ─────────────────────────────
  const [jobsPage, setJobsPage] = useState(0);
  const [jobsPageSize, setJobsPageSize] = useState(JOBS_PAGE_SIZE);
  const [incidentsPage, setIncidentsPage] = useState(0);
  const [incidentsPageSize, setIncidentsPageSize] = useState(INCIDENTS_PAGE_SIZE);
  const [decisionsPage, setDecisionsPage] = useState(0);
  const [decisionsPageSize, setDecisionsPageSize] = useState(DECISIONS_PAGE_SIZE);
  const [childrenPage, setChildrenPage] = useState(0);

  // Refs so fetchAll (auto-refresh) always uses the current pagination values
  const jobsPageRef = useRef(0);
  const jobsPageSizeRef = useRef(JOBS_PAGE_SIZE);
  const incidentsPageRef = useRef(0);
  const incidentsPageSizeRef = useRef(INCIDENTS_PAGE_SIZE);
  const decisionsPageRef = useRef(0);
  const decisionsPageSizeRef = useRef(DECISIONS_PAGE_SIZE);
  jobsPageRef.current = jobsPage;
  jobsPageSizeRef.current = jobsPageSize;
  incidentsPageRef.current = incidentsPage;
  incidentsPageSizeRef.current = incidentsPageSize;
  decisionsPageRef.current = decisionsPage;
  decisionsPageSizeRef.current = decisionsPageSize;

  // ── Derived flat maps from the tree ───────────────────────────────────────
  const flattened = useMemo(() => flattenTree(instanceTree), [instanceTree]);

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
      const root = await fetchInstanceTree(processInstanceKey, {
        maxDepth: MAX_TREE_DEPTH,
        jobsPage: jobsPageRef.current + 1,       // API is 1-indexed
        jobsPageSize: jobsPageSizeRef.current,
        incidentsPage: incidentsPageRef.current + 1,
        incidentsPageSize: incidentsPageSizeRef.current,
        decisionsPage: decisionsPageRef.current + 1,
        decisionsPageSize: decisionsPageSizeRef.current,
      });
      setInstanceTree(root);

      try {
        const defData = await getProcessDefinition(root.instance.processDefinitionKey);
        setProcessDefinition(defData as unknown as ProcessDefinition);
      } catch {
        // Non-critical
      }

      void fetchSubprocessStats(root);
    } catch (err) {
      console.error('Failed to fetch instance tree:', err);
    }
  }, [processInstanceKey, fetchSubprocessStats]);

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!processInstanceKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      // Reset pagination when the instance key changes
      setJobsPage(0);
      setJobsPageSize(JOBS_PAGE_SIZE);
      setIncidentsPage(0);
      setIncidentsPageSize(INCIDENTS_PAGE_SIZE);
      setDecisionsPage(0);
      setDecisionsPageSize(DECISIONS_PAGE_SIZE);
      setChildrenPage(0);
      try {
        await fetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process instance');
      } finally {
        setLoading(false);
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
  const { data: rawElementStatistics } = useGetProcessInstanceElementStatistics(
    processInstanceKey ?? '',
    {
      query: {
        enabled: !!processInstanceKey && !!processDefinition,
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

  // ── Page-change callbacks — refetch all nodes at the new page ────────────
  // We use a ref to always access the latest tree without stale closures.
  const instanceTreeRef = useRef(instanceTree);
  instanceTreeRef.current = instanceTree;

  const onJobsPageChange: PageChangeFn = useCallback(
    async (page, pageSize) => {
      const tree = instanceTreeRef.current;
      if (!tree) return;
      const nodes = collectAllNodes(tree);
      // API is 1-indexed
      await Promise.all(nodes.map((node) => doRefetchNodeJobs(node, page + 1, pageSize)));
      setJobsPage(page);
      setJobsPageSize(pageSize);
      setInstanceTree((prev) => (prev ? { ...prev } : prev));
    },
    [],
  );

  const onIncidentsPageChange: PageChangeFn = useCallback(
    async (page, pageSize) => {
      const tree = instanceTreeRef.current;
      if (!tree) return;
      const nodes = collectAllNodes(tree);
      await Promise.all(nodes.map((node) => doRefetchNodeIncidents(node, page + 1, pageSize)));
      setIncidentsPage(page);
      setIncidentsPageSize(pageSize);
      setInstanceTree((prev) => (prev ? { ...prev } : prev));
    },
    [],
  );

  const onDecisionsPageChange: PageChangeFn = useCallback(
    async (page, pageSize) => {
      const tree = instanceTreeRef.current;
      if (!tree) return;
      const nodes = collectAllNodes(tree);
      await Promise.all(nodes.map((node) => doRefetchNodeDecisions(node, page + 1, pageSize)));
      setDecisionsPage(page);
      setDecisionsPageSize(pageSize);
      setInstanceTree((prev) => (prev ? { ...prev } : prev));
    },
    [],
  );

  const onChildrenPageChange: ChildrenPageChangeFn = useCallback(
    async (page) => {
      const tree = instanceTreeRef.current;
      if (!tree) return;
      const nodes = collectAllNodes(tree);
      await Promise.all(nodes.map((node) => doRefetchNodeChildren(node, page + 1, CHILDREN_PAGE_SIZE)));
      setChildrenPage(page);
      setInstanceTree((prev) => (prev ? { ...prev } : prev));
    },
    [],
  );

  // ── Legacy refetch helpers (full tree rebuild) ────────────────────────────
  const refetchAll = fetchAll;
  const refetchJobs = useCallback(async () => { await fetchAll(); }, [fetchAll]);
  const refetchIncidents = useCallback(async () => { await fetchAll(); }, [fetchAll]);
  const refetchVariables = useCallback(async () => { await fetchAll(); }, [fetchAll]);
  const refetchHistory = useCallback(async () => { await fetchAll(); }, [fetchAll]);
  const refetchChildProcesses = useCallback(async () => { await fetchAll(); }, [fetchAll]);
  const refetchDecisionInstances = useCallback(async () => { await fetchAll(); }, [fetchAll]);

  // ── Return ────────────────────────────────────────────────────────────────

  const rootNode = instanceTree;

  return {
    // Root
    processInstance: rootNode?.instance ?? null,
    processDefinition,
    elementStatistics,
    loading,
    error,

    // Full tree
    instanceTree,

    // Shared pagination state
    jobsPagination: { page: jobsPage, pageSize: jobsPageSize },
    incidentsPagination: { page: incidentsPage, pageSize: incidentsPageSize },
    decisionsPagination: { page: decisionsPage, pageSize: decisionsPageSize },
    childrenPagination: { page: childrenPage, pageSize: CHILDREN_PAGE_SIZE },

    // Page-change callbacks
    onJobsPageChange,
    onIncidentsPageChange,
    onDecisionsPageChange,
    onChildrenPageChange,

    // Root-level flat data
    jobs: rootNode?.jobs ?? [],
    history: rootNode?.history ?? [],
    incidents: rootNode?.incidents ?? [],
    decisionInstances: rootNode?.decisions ?? [],

    // Non-root flat maps (backward compat)
    childProcesses: flattened.childProcesses,
    childProcessesTotalCount: flattened.childProcessesTotalCount,
    grandchildProcesses: flattened.grandchildProcesses,
    childProcessJobs: flattened.childProcessJobs,
    childProcessIncidents: flattened.childProcessIncidents,
    childProcessHistory: flattened.childProcessHistory,
    childProcessDecisionInstances: flattened.childProcessDecisionInstances,

    // Legacy refetch
    refetchJobs,
    refetchIncidents,
    refetchVariables,
    refetchHistory,
    refetchChildProcesses,
    refetchDecisionInstances,
    refetchAll,
  };
};
