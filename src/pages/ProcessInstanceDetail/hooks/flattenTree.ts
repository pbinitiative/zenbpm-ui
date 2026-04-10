import type { DecisionInstanceSummary } from '@base/openapi';
import type { FlowElementHistory, Incident, Job, ProcessInstance } from '../types';
import type { ProcessInstanceNode, TreeDatasetPagination } from '../types/tree';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface FlattenedTree {
  /** All nodes in BFS order (root first) */
  allNodes: ProcessInstanceNode[];

  // ── Backward-compat shapes expected by current tab components ──────────

  /** Depth-1 children */
  childProcesses: ProcessInstance[];
  /** Total count of depth-1 children as reported by API */
  childProcessesTotalCount: number | undefined;

  /**
   * Depth-2 grandchildren, keyed by their direct parent's processInstanceKey.
   * (Used by tabs that render a two-level section view.)
   */
  grandchildProcesses: Record<string, ProcessInstance[]>;

  /** Jobs for every non-root node, keyed by processInstanceKey */
  childProcessJobs: Record<string, Job[]>;

  /** Incidents for every non-root node, keyed by processInstanceKey */
  childProcessIncidents: Record<string, Incident[]>;

  /** History for every non-root node, combined into a flat array */
  childProcessHistory: FlowElementHistory[];

  /** Decision instances for every non-root node, keyed by processInstanceKey */
  childProcessDecisionInstances: Record<string, DecisionInstanceSummary[]>;

  // ── Pagination state derived from node counts ────────────────────────────

  jobsPagination: TreeDatasetPagination;
  incidentsPagination: TreeDatasetPagination;
  decisionsPagination: TreeDatasetPagination;
  childrenPagination: TreeDatasetPagination;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const EMPTY: FlattenedTree = {
  allNodes: [],
  childProcesses: [],
  childProcessesTotalCount: undefined,
  grandchildProcesses: {},
  childProcessJobs: {},
  childProcessIncidents: {},
  childProcessHistory: [],
  childProcessDecisionInstances: {},
  jobsPagination: {},
  incidentsPagination: {},
  decisionsPagination: {},
  childrenPagination: {},
};

/**
 * Walk a `ProcessInstanceNode` tree and derive all the flat-map shapes that
 * the current tab components expect, plus pagination metadata for every node
 * and dataset.
 *
 * The root node's own datasets (jobs, history, …) are intentionally excluded
 * from the child maps — the hook returns them as top-level fields.
 */
export function flattenTree(root: ProcessInstanceNode | null): FlattenedTree {
  if (!root) return EMPTY;

  const allNodes: ProcessInstanceNode[] = [];
  const childProcesses: ProcessInstance[] = [];
  const grandchildProcesses: Record<string, ProcessInstance[]> = {};
  const childProcessJobs: Record<string, Job[]> = {};
  const childProcessIncidents: Record<string, Incident[]> = {};
  const childProcessHistory: FlowElementHistory[] = [];
  const childProcessDecisionInstances: Record<string, DecisionInstanceSummary[]> = {};
  const jobsPagination: TreeDatasetPagination = {};
  const incidentsPagination: TreeDatasetPagination = {};
  const decisionsPagination: TreeDatasetPagination = {};
  const childrenPagination: TreeDatasetPagination = {};

  // BFS — collect all nodes, skipping root for child maps
  const queue: ProcessInstanceNode[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    allNodes.push(node);

    const key = node.instance.key;

    // Pagination entries for every node (including root)
    jobsPagination[key] = {
      page: 1,
      size: node.jobsTotalCount > 0 ? node.jobs.length : 100,
      totalCount: node.jobsTotalCount,
    };
    incidentsPagination[key] = {
      page: 1,
      size: node.incidentsTotalCount > 0 ? node.incidents.length : 100,
      totalCount: node.incidentsTotalCount,
    };
    decisionsPagination[key] = {
      page: 1,
      size: node.decisionsTotalCount > 0 ? node.decisions.length : 100,
      totalCount: node.decisionsTotalCount,
    };
    childrenPagination[key] = {
      page: 1,
      size: node.childrenTotalCount > 0 ? node.children.length : 100,
      totalCount: node.childrenTotalCount,
    };

    if (node.depth === 0) {
      // Root: only enqueue children, skip child maps
      queue.push(...node.children);
      continue;
    }

    // Depth 1 → direct children of root
    if (node.depth === 1) {
      childProcesses.push(node.instance);
    }

    // Depth 2 → grandchildren — keyed by their parent's key
    if (node.depth === 2) {
      // Find direct parent key: the node at depth 1 whose children include this node.
      // We do this by tracking parentKey in a side-map below (see BFS variant).
    }

    // Non-root datasets
    childProcessJobs[key] = node.jobs;
    childProcessIncidents[key] = node.incidents;
    childProcessHistory.push(...node.history);
    childProcessDecisionInstances[key] = node.decisions;

    queue.push(...node.children);
  }

  // ── Build grandchildProcesses: depth-2 nodes keyed by their depth-1 parent ──
  for (const depth1Node of root.children) {
    const parentKey = depth1Node.instance.key;
    if (depth1Node.children.length > 0) {
      grandchildProcesses[parentKey] = depth1Node.children.map((gc) => gc.instance);
    }
  }

  return {
    allNodes,
    childProcesses,
    childProcessesTotalCount: root.childrenTotalCount > 0 ? root.childrenTotalCount : undefined,
    grandchildProcesses,
    childProcessJobs,
    childProcessIncidents,
    childProcessHistory,
    childProcessDecisionInstances,
    jobsPagination,
    incidentsPagination,
    decisionsPagination,
    childrenPagination,
  };
}
