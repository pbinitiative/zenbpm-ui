import type { DecisionInstanceSummary } from '@base/openapi';
import type { FlowElementHistory, Incident, Job, ProcessInstance } from '../types';
import type { ProcessInstanceNode } from '../types/tree';

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
};

/**
 * Walk a `ProcessInstanceNode` tree and derive all the flat-map shapes that
 * the current tab components expect.
 *
 * Pagination state is NOT derived here — it is maintained explicitly in
 * `useInstanceData` and passed separately to consumers.
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

  // BFS
  const queue: ProcessInstanceNode[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    allNodes.push(node);

    const key = node.instance.key;

    if (node.depth === 0) {
      queue.push(...node.children);
      continue;
    }

    // Depth 1 — direct children of root
    if (node.depth === 1) {
      childProcesses.push(node.instance);
    }

    // Non-root datasets
    childProcessJobs[key] = node.jobs;
    childProcessIncidents[key] = node.incidents;
    childProcessHistory.push(...node.history);
    childProcessDecisionInstances[key] = node.decisions;

    queue.push(...node.children);
  }

  // Depth-2 grandchildren keyed by their depth-1 parent
  for (const depth1Node of root.children) {
    if (depth1Node.children.length > 0) {
      grandchildProcesses[depth1Node.instance.key] = depth1Node.children.map((gc) => gc.instance);
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
  };
}
