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
import type { ProcessInstanceNode, TreeDatasetPagination } from '../types/tree';
import {
  fetchInstanceTree,
  refetchNodeJobs as fetchNodeJobs,
  refetchNodeIncidents as fetchNodeIncidents,
  refetchNodeDecisions as fetchNodeDecisions,
  refetchNodeChildren as fetchNodeChildren,
  JOBS_PAGE_SIZE,
  INCIDENTS_PAGE_SIZE,
  DECISIONS_PAGE_SIZE,
  CHILDREN_PAGE_SIZE,
} from './fetchInstanceTree';
import { flattenTree } from './flattenTree';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** States that indicate the process instance is finished and doesn't need periodic refresh */
export const TERMINAL_STATES = ['completed', 'terminated'];

/** Refresh interval in milliseconds */
export const AUTO_REFRESH_INTERVAL = 5000;

/** Hard BFS depth limit */
const MAX_TREE_DEPTH = 8;

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

  // ── Per-dataset pagination across all nodes (keyed by processInstanceKey) ─
  jobsPagination: TreeDatasetPagination;
  incidentsPagination: TreeDatasetPagination;
  decisionsPagination: TreeDatasetPagination;
  childrenPagination: TreeDatasetPagination;

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

  // ── Per-node dataset refetch ───────────────────────────────────────────────
  refetchNodeJobs: (instanceKey: string, page: number, size: number) => Promise<void>;
  refetchNodeIncidents: (instanceKey: string, page: number, size: number) => Promise<void>;
  refetchNodeDecisions: (instanceKey: string, page: number, size: number) => Promise<void>;
  refetchNodeChildren: (instanceKey: string, page: number) => Promise<void>;

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

  // ── Derived flat maps from the tree ───────────────────────────────────────
  const flattened = useMemo(() => flattenTree(instanceTree), [instanceTree]);

  // ── Find a node in the tree by key ────────────────────────────────────────
  const findNode = useCallback(
    (key: string): ProcessInstanceNode | undefined => {
      if (!instanceTree) return undefined;
      const queue: ProcessInstanceNode[] = [instanceTree];
      while (queue.length > 0) {
        const node = queue.shift()!;
        if (node.instance.key === key) return node;
        queue.push(...node.children);
      }
      return undefined;
    },
    [instanceTree],
  );

  // ── Subprocess element statistics ─────────────────────────────────────────
  /**
   * Walk the tree, collect all subprocess-typed nodes, fetch their element
   * statistics in parallel, and merge the results.
   */
  const fetchSubprocessStats = useCallback(
    async (root: ProcessInstanceNode) => {
      const subprocessNodes: ProcessInstanceNode[] = [];
      const queue: ProcessInstanceNode[] = [root];
      while (queue.length > 0) {
        const node = queue.shift()!;
        if (node.instance.processType === 'subprocess') {
          subprocessNodes.push(node);
        }
        queue.push(...node.children);
      }

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
          if (!merged[elementId]) {
            merged[elementId] = { activeCount: 0, incidentCount: 0 };
          }
          merged[elementId].activeCount += counts.activeCount;
          merged[elementId].incidentCount += counts.incidentCount;
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
      const root = await fetchInstanceTree(processInstanceKey, { maxDepth: MAX_TREE_DEPTH });
      setInstanceTree(root);

      // Fetch process definition (non-critical — use definition key from root)
      try {
        const defData = await getProcessDefinition(root.instance.processDefinitionKey);
        setProcessDefinition(defData as unknown as ProcessDefinition);
      } catch {
        // Definition fetch failure is non-critical
      }

      // Subprocess element statistics (fire-and-forget within the refresh cycle)
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
      if (!merged[elementId]) {
        merged[elementId] = { activeCount: 0, incidentCount: 0 };
      }
      merged[elementId] = {
        activeCount: merged[elementId].activeCount + counts.activeCount,
        incidentCount: merged[elementId].incidentCount + counts.incidentCount,
      };
    }
    return merged;
  }, [rawElementStatistics, subprocessElementStatistics]);

  // ── Per-node dataset refetch helpers ─────────────────────────────────────
  /**
   * Immutably rebuild the tree after mutating a single node so React picks up
   * the change.  We do a shallow-clone walk from root to the mutated node.
   */
  const cloneTreeWithUpdatedNode = useCallback(
    (root: ProcessInstanceNode, updatedKey: string): ProcessInstanceNode => {
      const cloneNode = (node: ProcessInstanceNode): ProcessInstanceNode => {
        if (node.instance.key === updatedKey) {
          // Return a new object reference so useMemo dependencies fire
          return { ...node };
        }
        const newChildren = node.children.map(cloneNode);
        if (newChildren === node.children) return node; // nothing changed in this subtree
        return { ...node, children: newChildren };
      };
      return cloneNode(root);
    },
    [],
  );

  const handleRefetchNodeJobs = useCallback(
    async (instanceKey: string, page: number, size: number) => {
      if (!instanceTree) return;
      const node = findNode(instanceKey);
      if (!node) return;
      await fetchNodeJobs(node, page, size);
      setInstanceTree(cloneTreeWithUpdatedNode(instanceTree, instanceKey));
    },
    [instanceTree, findNode, cloneTreeWithUpdatedNode],
  );

  const handleRefetchNodeIncidents = useCallback(
    async (instanceKey: string, page: number, size: number) => {
      if (!instanceTree) return;
      const node = findNode(instanceKey);
      if (!node) return;
      await fetchNodeIncidents(node, page, size);
      setInstanceTree(cloneTreeWithUpdatedNode(instanceTree, instanceKey));
    },
    [instanceTree, findNode, cloneTreeWithUpdatedNode],
  );

  const handleRefetchNodeDecisions = useCallback(
    async (instanceKey: string, page: number, size: number) => {
      if (!instanceTree) return;
      const node = findNode(instanceKey);
      if (!node) return;
      await fetchNodeDecisions(node, page, size);
      setInstanceTree(cloneTreeWithUpdatedNode(instanceTree, instanceKey));
    },
    [instanceTree, findNode, cloneTreeWithUpdatedNode],
  );

  const handleRefetchNodeChildren = useCallback(
    async (instanceKey: string, page: number) => {
      if (!instanceTree) return;
      const node = findNode(instanceKey);
      if (!node) return;
      await fetchNodeChildren(node, page, CHILDREN_PAGE_SIZE);
      setInstanceTree(cloneTreeWithUpdatedNode(instanceTree, instanceKey));
    },
    [instanceTree, findNode, cloneTreeWithUpdatedNode],
  );

  // ── Legacy top-level refetch helpers ─────────────────────────────────────
  // These all trigger a full tree rebuild for simplicity (matching old behaviour).

  const refetchJobs = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const refetchIncidents = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Variables live on instance.variables — refreshed by re-fetching the tree
  const refetchVariables = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const refetchHistory = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const refetchChildProcesses = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const refetchDecisionInstances = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

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

    // Pagination
    jobsPagination: flattened.jobsPagination,
    incidentsPagination: flattened.incidentsPagination,
    decisionsPagination: flattened.decisionsPagination,
    childrenPagination: flattened.childrenPagination,

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

    // Per-node refetch
    refetchNodeJobs: handleRefetchNodeJobs,
    refetchNodeIncidents: handleRefetchNodeIncidents,
    refetchNodeDecisions: handleRefetchNodeDecisions,
    refetchNodeChildren: handleRefetchNodeChildren,

    // Legacy refetch
    refetchJobs,
    refetchIncidents,
    refetchVariables,
    refetchHistory,
    refetchChildProcesses,
    refetchDecisionInstances,
    refetchAll: fetchAll,
  };
};
