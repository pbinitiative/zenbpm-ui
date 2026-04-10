import type { DecisionInstanceSummary } from '@base/openapi';
import type { FlowElementHistory, Incident, Job, ProcessInstance } from './index';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Server-side pagination state for one dataset at one node */
export interface NodePagination {
  page: number;
  size: number;
  totalCount: number;
}

/**
 * Per-dataset pagination state for all nodes in the tree, keyed by
 * processInstanceKey.
 */
export type TreeDatasetPagination = Record<string, NodePagination>;

// ---------------------------------------------------------------------------
// Tree node
// ---------------------------------------------------------------------------

/**
 * One node in the process instance tree.
 *
 * The root node sits at depth=0.  Each node carries its own paginated
 * dataset snapshots; child nodes are nested under `children`.
 *
 * History is fetched in full (size: -1) and is therefore client-paged only —
 * there is no server-side pagination state for it.
 */
export interface ProcessInstanceNode {
  /** Full process instance object — includes `variables` and `activeElementInstances` */
  instance: ProcessInstance;

  /** Depth in the tree: 0 = root, 1 = direct children, … */
  depth: number;

  // --- Jobs (server-paginated) ---
  jobs: Job[];
  jobsTotalCount: number;

  // --- Incidents (server-paginated) ---
  incidents: Incident[];
  incidentsTotalCount: number;

  // --- Decision instances (server-paginated) ---
  decisions: DecisionInstanceSummary[];
  decisionsTotalCount: number;

  // --- History (client-paged only, fetched in full) ---
  history: FlowElementHistory[];

  // --- Children ---
  children: ProcessInstanceNode[];
  /** Total child count as reported by the API (may exceed children.length when paginated) */
  childrenTotalCount: number;
}
