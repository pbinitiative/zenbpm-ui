import type { DecisionInstanceSummary, MessageSubscription, TimerSubscription, ErrorSubscription } from '@base/openapi';
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
 * History is fetched across up to `HISTORY_MAX_PAGES` server pages of
 * `HISTORY_PAGE_SIZE` items each (see `fetchInstanceTree`) so a normal-sized
 * instance loads in a single round-trip.  When the server reports more
 * entries than fit in those pages, the displayed `history` array is
 * truncated and the user is warned.  There is no server-side pagination
 * state for history — the tab itself is client-paged.
 */
export interface ProcessInstanceNode {
  /** Full process instance object — includes `variables` and `activeElementInstances` */
  instance: ProcessInstance;

  /** Depth in the tree: 0 = root, 1 = direct children, … */
  depth: number;

  /**
   * True only for the single root node of the tree — i.e. the instance the
   * user navigated to directly.  Used to allow full dataset fetching even
   * when the root instance itself is of type `callActivity`: the guard that
   * skips callActivity internals must not apply to the root.
   */
  isRoot: boolean;

  /**
   * The element ID in the **parent** process that called/spawned this instance
   * (e.g. the call-activity or sub-process element ID).
   * Undefined for the root node.
   */
  callElementId?: string;

  /**
   * Full breadcrumb path from root to this node.
   * Each entry is the `callElementId` of that level.
   * Empty for the root node.
   * e.g. ['CallActivity_1', 'SubProcess_2'] for a grandchild.
   */
  callPath: string[];

  // --- Jobs (server-paginated) ---
  jobs: Job[];
  jobsTotalCount: number;
  activeJobsTotalCount: number;

  // --- Incidents (server-paginated) ---
  incidents: Incident[];
  incidentsTotalCount: number;
  unresolvedIncidentsTotalCount: number;

  // --- Decision instances (server-paginated) ---
  decisions: DecisionInstanceSummary[];
  decisionsTotalCount: number;

  // --- Variables (sliced from instance.variables, no separate API endpoint) ---
  variableEntries: Array<{ name: string; value: unknown }>;
  variablesTotalCount: number;

  // --- History (client-paged only; server-paginated up to HISTORY_MAX_PAGES pages) ---
  history: FlowElementHistory[];

  // --- Message subscriptions (server-paginated) ---
  messageSubscriptions: MessageSubscription[];
  messageSubscriptionsTotalCount: number;

  // --- Timer subscriptions (server-paginated) ---
  timerSubscriptions: TimerSubscription[];
  timerSubscriptionsTotalCount: number;

  // --- Error subscriptions (server-paginated) ---
  errorSubscriptions: ErrorSubscription[];
  errorSubscriptionsTotalCount: number;

  /**
   * All active message subscriptions for this node, fetched with a large page size (size: 100,
   * state: 'active'). Used for diagram badges — independent of the tab's
   */
  allActiveMessageSubscriptions: MessageSubscription[];

  /**
   * All active timer subscriptions for this node, fetched with a large page
   * size (size: 100, state: 'active'). Used for diagram badges.
   */
  allActiveTimerSubscriptions: TimerSubscription[];

  /**
   * All active error subscriptions for this node, fetched with a large page
   * size (size: 100, state: 'active'). Used for diagram badges.
   */
  allActiveErrorSubscriptions: ErrorSubscription[];

  // --- Children ---
  children: ProcessInstanceNode[];
  /** Total child count as reported by the API (may exceed children.length when paginated) */
  childrenTotalCount: number;
}
