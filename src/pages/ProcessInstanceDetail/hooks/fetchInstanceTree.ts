import type { DecisionInstanceSummary } from '@base/openapi';
import {
  getProcessInstance,
  getProcessInstanceJobs,
  getHistory,
  getIncidents,
  getChildProcessInstances,
  getDecisionInstances,
} from '@base/openapi';
import type { FlowElementHistory, Incident, Job, ProcessInstance } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
import type { GetIncidentsState } from '@base/openapi/generated-api/schemas/getIncidentsState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard depth limit — guards against cycles and runaway fetches */
export const MAX_TREE_DEPTH = 100;

/** Default page size for child process instances */
export const CHILDREN_PAGE_SIZE = 100;

/** Default page sizes for datasets */
export const JOBS_PAGE_SIZE = 10;
export const INCIDENTS_PAGE_SIZE = 10;
export const DECISIONS_PAGE_SIZE = 10;
export const VARIABLES_PAGE_SIZE = 10;

/**
 * Maximum number of simultaneous dataset-fetch requests in Phase 2.
 * Matches the browser's ~6 connections-per-host limit so we never queue
 * more requests than the browser can actually send in parallel.
 * Without this, a tree of 50 nodes fires 250 requests simultaneously.
 */
const CONCURRENT_FETCH_LIMIT = 6;

/** States where a process instance will never change — used to skip re-fetching */
const TERMINAL_STATES = new Set(['completed', 'terminated']);

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

/**
 * Run `fn` over every item with at most `limit` concurrent invocations.
 * Works like Promise.all but throttles the number of in-flight promises,
 * preventing the browser from queueing hundreds of requests simultaneously.
 */
async function runConcurrently<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
): Promise<void> {
  if (items.length === 0) return;
  const iter = items[Symbol.iterator]();
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (let step = iter.next(); !step.done; step = iter.next()) {
        await fn(step.value);
      }
    },
  );
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface FetchInstanceTreeOptions {
  maxDepth?: number;
  childrenPageSize?: number;
  jobsPage?: number;
  jobsPageSize?: number;
  incidentsPage?: number;
  incidentsPageSize?: number;
  decisionsPage?: number;
  decisionsPageSize?: number;
  variablesPage?: number;
  variablesPageSize?: number;
  /** Pre-fetched root ProcessInstance — avoids a duplicate getProcessInstance call */
  preloadedRoot?: ProcessInstance;
  /**
   * Cache of already-fetched terminal nodes (keyed by instance key).
   * When a node in the new tree is found here and is still terminal,
   * its datasets are copied instead of re-fetched (auto-refresh optimisation).
   */
  terminalNodeCache?: Map<string, ProcessInstanceNode>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a bare node with empty dataset arrays */
function makeNode(
  instance: ProcessInstance,
  depth: number,
  callElementId?: string,
  parentCallPath: string[] = [],
): ProcessInstanceNode {
  return {
    instance,
    depth,
    callElementId,
    callPath: callElementId ? [...parentCallPath, callElementId] : [],
    jobs: [],
    jobsTotalCount: 0,
    incidents: [],
    incidentsTotalCount: 0,
    unresolvedIncidentsTotalCount: 0,
    decisions: [],
    decisionsTotalCount: 0,
    variableEntries: [],
    variablesTotalCount: 0,
    history: [],
    children: [],
    childrenTotalCount: 0,
  };
}

/**
 * Infer the calling element ID from the parent's history.
 *
 * Strategy: find the history entry in the parent whose `createdAt` is
 * closest-before (or equal to) the child's `createdAt`.  In call-activity
 * and subprocess patterns this will be the element that spawned the child.
 *
 * Falls back to the most-recently-created history entry overall if no entry
 * satisfies the time constraint (can happen with clock skew or missing data).
 */
function inferCallElementId(
  parentHistory: ProcessInstanceNode['history'],
  childCreatedAt: string,
): string | undefined {
  if (parentHistory.length === 0) return undefined;

  const childTime = new Date(childCreatedAt).getTime();

  // Entries whose createdAt <= child's createdAt, sorted descending
  const candidates = parentHistory
    .filter((h) => new Date(h.createdAt).getTime() <= childTime)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (candidates.length > 0) return candidates[0].elementId;

  // Fallback: just the most recent entry overall
  const sorted = [...parentHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return sorted[0]?.elementId;
}

// ---------------------------------------------------------------------------
// Per-node dataset fetch
// ---------------------------------------------------------------------------

/**
 * Fetch jobs, incidents, decisions, and history for a single node.
 * All requests run in parallel; individual failures are swallowed so one bad
 * endpoint cannot abort the whole tree load.
 *
 * History is skipped for `callActivity` nodes: those instances belong to a
 * different process definition, so their element IDs never appear in the
 * parent diagram and the fetch is pure waste.
 */
async function fetchNodeDatasets(
  node: ProcessInstanceNode,
  opts: Required<Pick<
    FetchInstanceTreeOptions,
    | 'jobsPage' | 'jobsPageSize'
    | 'incidentsPage' | 'incidentsPageSize'
    | 'decisionsPage' | 'decisionsPageSize'
    | 'variablesPage' | 'variablesPageSize'
  >>,
): Promise<void> {
  if (node.instance.processType === 'callActivity') {
    return;
  }

  const key = node.instance.key;

  const requests: Promise<unknown>[] = [
    getProcessInstanceJobs(key, { page: opts.jobsPage, size: opts.jobsPageSize }),
    getIncidents(key, { page: opts.incidentsPage, size: opts.incidentsPageSize }),
    getIncidents(key, { state: 'unresolved' as GetIncidentsState, page: 1, size: 1 }),
    getDecisionInstances({ processInstanceKey: key, page: opts.decisionsPage, size: opts.decisionsPageSize }),
    getHistory(key, { page: 1, size: -1 }),
  ];

  const [jobsResult, incidentsResult, unresolvedResult, decisionsResult, historyResult] = await Promise.allSettled(requests);

  if (jobsResult.status === 'fulfilled' && jobsResult.value) {
    const v = jobsResult.value as Awaited<ReturnType<typeof getProcessInstanceJobs>>;
    node.jobs = (v.items ?? []) as Job[];
    node.jobsTotalCount = v.totalCount ?? 0;
  }

  if (incidentsResult.status === 'fulfilled' && incidentsResult.value) {
    const v = incidentsResult.value as Awaited<ReturnType<typeof getIncidents>>;
    node.incidents = (v.items ?? []) as Incident[];
    node.incidentsTotalCount = v.totalCount ?? 0;
  }

  if (unresolvedResult.status === 'fulfilled' && unresolvedResult.value) {
    const v = unresolvedResult.value as Awaited<ReturnType<typeof getIncidents>>;
    node.unresolvedIncidentsTotalCount = v.totalCount ?? 0;
  }

  if (decisionsResult.status === 'fulfilled' && decisionsResult.value) {
    const v = decisionsResult.value as Awaited<ReturnType<typeof getDecisionInstances>>;
    const items = (v.partitions ?? []).flatMap((p) => p.items ?? []) as DecisionInstanceSummary[];
    node.decisions = items;
    node.decisionsTotalCount = v.totalCount ?? 0;
  }

  if (historyResult.status === 'fulfilled' && historyResult.value) {
    const v = historyResult.value as Awaited<ReturnType<typeof getHistory>>;
    node.history = (v.items ?? []) as FlowElementHistory[];
  }

  // Variables are embedded in instance.variables — slice the current page
  const allVars = Object.entries((node.instance.variables as Record<string, unknown>) ?? {});
  node.variablesTotalCount = allVars.length;
  const varStart = (opts.variablesPage - 1) * opts.variablesPageSize;
  node.variableEntries = allVars
    .slice(varStart, varStart + opts.variablesPageSize)
    .map(([name, value]) => ({ name, value }));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build the full process instance tree using breadth-first traversal.
 *
 * Phase 1 — Shape: fetch child process instances level by level until no
 * more children exist or `maxDepth` is reached.  A visited-key Set prevents
 * re-processing the same instance if the backend ever returns circular data.
 *
 * Phase 2 — Data: for every discovered node, fetch jobs, incidents,
 * decisions, and history in parallel (all nodes in a level run concurrently).
 * Terminal nodes found in `opts.terminalNodeCache` have their datasets copied
 * instead of re-fetched (used by the auto-refresh path to skip immutable data).
 *
 * @param rootKey   processInstanceKey of the root instance
 * @param opts      tuning options (depths, page sizes, caches)
 * @returns         the fully-populated root `ProcessInstanceNode`
 */
export async function fetchInstanceTree(
  rootKey: string,
  opts: FetchInstanceTreeOptions = {},
): Promise<ProcessInstanceNode> {
  const maxDepth = opts.maxDepth ?? MAX_TREE_DEPTH;
  const childrenPageSize = opts.childrenPageSize ?? CHILDREN_PAGE_SIZE;
  const datasetOpts = {
    jobsPage: opts.jobsPage ?? 1,
    jobsPageSize: opts.jobsPageSize ?? JOBS_PAGE_SIZE,
    incidentsPage: opts.incidentsPage ?? 1,
    incidentsPageSize: opts.incidentsPageSize ?? INCIDENTS_PAGE_SIZE,
    decisionsPage: opts.decisionsPage ?? 1,
    decisionsPageSize: opts.decisionsPageSize ?? DECISIONS_PAGE_SIZE,
    variablesPage: opts.variablesPage ?? 1,
    variablesPageSize: opts.variablesPageSize ?? VARIABLES_PAGE_SIZE,
  };
  const terminalCache = opts.terminalNodeCache ?? new Map<string, ProcessInstanceNode>();

  // ── Phase 1: build tree shape ────────────────────────────────────────────

  const rootInstance: ProcessInstance = opts.preloadedRoot
    ?? (await getProcessInstance(rootKey)) as unknown as ProcessInstance;
  const root = makeNode(rootInstance, 0);

  const visited = new Set<string>([rootKey]);

  // Track parent node for each child so we can derive callElementId in Phase 3
  const parentMap = new Map<ProcessInstanceNode, ProcessInstanceNode>();

  // BFS queue holds the nodes whose children we still need to fetch
  let currentLevel: ProcessInstanceNode[] = [root];

  while (currentLevel.length > 0) {
    const nextLevel: ProcessInstanceNode[] = [];

    // Fetch children for every node in the current level — in parallel.
    // callActivity nodes are the entry point of a called process (different BPMN
    // definition). Their internals are only visible on that process's own detail
    // page, so we do NOT recurse into them here.
    const childFetches = currentLevel
      .filter((node) => node.depth < maxDepth && node.instance.processType !== 'callActivity')
      .map(async (node) => {
        let childData;
        try {
          childData = await getChildProcessInstances(node.instance.key, {
            page: 1,
            size: childrenPageSize,
          });
        } catch {
          return; // child fetch failed — skip gracefully
        }

        const instances = (childData.partitions ?? []).flatMap(
          (p) => p.items ?? [],
        ) as ProcessInstance[];

        node.childrenTotalCount = childData.totalCount ?? instances.length;

        for (const childInstance of instances) {
          if (visited.has(childInstance.key)) continue; // cycle guard
          visited.add(childInstance.key);
          // callElementId and callPath are filled in Phase 3 after history is available
          const childNode = makeNode(childInstance, node.depth + 1);
          parentMap.set(childNode, node);
          node.children.push(childNode);
          nextLevel.push(childNode);
        }
      });

    await Promise.all(childFetches);
    currentLevel = nextLevel;
  }

  // ── Phase 2: fetch datasets for every node ───────────────────────────────

  // Collect all nodes in BFS order and fetch their datasets in parallel
  const allNodes: ProcessInstanceNode[] = [];
  const bfsQueue: ProcessInstanceNode[] = [root];
  while (bfsQueue.length > 0) {
    const node = bfsQueue.shift();
    if (node === undefined) continue;
    allNodes.push(node);
    bfsQueue.push(...node.children);
  }

  await runConcurrently(allNodes, CONCURRENT_FETCH_LIMIT, (node) => {
    // For non-root terminal nodes: copy cached data instead of re-fetching.
    // The root node is always re-fetched so the page reflects the latest state.
    if (node !== root && TERMINAL_STATES.has(node.instance.state)) {
      const cached = terminalCache.get(node.instance.key);
      if (cached) {
        node.jobs = cached.jobs;
        node.jobsTotalCount = cached.jobsTotalCount;
        node.incidents = cached.incidents;
        node.incidentsTotalCount = cached.incidentsTotalCount;
        node.unresolvedIncidentsTotalCount = cached.unresolvedIncidentsTotalCount;
        node.history = cached.history;
        node.decisions = cached.decisions;
        node.decisionsTotalCount = cached.decisionsTotalCount;
        node.variableEntries = cached.variableEntries;
        node.variablesTotalCount = cached.variablesTotalCount;
        return Promise.resolve();
      }
    }
    // Nodes beyond the depth limit are never shown in dataset tabs — users
    // can navigate to those instances directly. Skipping saves
    // (N_deep_nodes × 5) API calls on every refresh.
    return fetchNodeDatasets(node, datasetOpts);
  });

  // ── Phase 3: derive callElementId for each non-root node ─────────────────
  // Now that history is populated, infer which element in the parent called
  // each child and build the callPath breadcrumb.
  for (const node of allNodes) {
    if (node === root) continue; // root has no parent
    const parent = parentMap.get(node);
    if (!parent) continue;
    const callElem = inferCallElementId(parent.history, node.instance.createdAt);
    node.callElementId = callElem;
    // callPath = parent's callPath + this callElementId
    node.callPath = callElem
      ? [...parent.callPath, callElem]
      : [...parent.callPath];
  }

  return root;
}

// ---------------------------------------------------------------------------
// Re-fetch helpers for individual datasets on a single node
// ---------------------------------------------------------------------------

/**
 * Re-fetch jobs for a specific node in an existing tree (mutates the node).
 * Returns the updated node for convenience.
 */
export async function refetchNodeJobs(
  node: ProcessInstanceNode,
  page: number,
  size: number,
): Promise<ProcessInstanceNode> {
  if (node.instance.processType === 'callActivity') return node;
  try {
    const data = await getProcessInstanceJobs(node.instance.key, { page, size });
    node.jobs = (data.items ?? []) as Job[];
    // Preserve a previously-established non-zero total — some APIs return
    // totalCount=0 for pages beyond the last item rather than the real total.
    const newTotal = data.totalCount ?? 0;
    if (newTotal > 0 || node.jobsTotalCount === 0) node.jobsTotalCount = newTotal;
  } catch (err) {
    console.error(`Failed to refetch jobs for ${node.instance.key}:`, err);
  }
  return node;
}

/**
 * Re-fetch incidents for a specific node in an existing tree (mutates the node).
 */
export async function refetchNodeIncidents(
  node: ProcessInstanceNode,
  page: number,
  size: number,
): Promise<ProcessInstanceNode> {
  if (node.instance.processType === 'callActivity') return node;
  try {
    const [pageResult, unresolvedResult] = await Promise.allSettled([
      getIncidents(node.instance.key, { page, size }),
      getIncidents(node.instance.key, { state: 'unresolved' as GetIncidentsState, page: 1, size: 1 }),
    ]);
    if (pageResult.status === 'fulfilled') {
      node.incidents = (pageResult.value.items ?? []) as Incident[];
      // Preserve a previously-established non-zero total.
      const newTotal = pageResult.value.totalCount ?? 0;
      if (newTotal > 0 || node.incidentsTotalCount === 0) node.incidentsTotalCount = newTotal;
    }
    if (unresolvedResult.status === 'fulfilled') {
      node.unresolvedIncidentsTotalCount = unresolvedResult.value.totalCount ?? 0;
    }
  } catch (err) {
    console.error(`Failed to refetch incidents for ${node.instance.key}:`, err);
  }
  return node;
}

/**
 * Re-fetch decision instances for a specific node in an existing tree (mutates the node).
 */
export async function refetchNodeDecisions(
  node: ProcessInstanceNode,
  page: number,
  size: number,
): Promise<ProcessInstanceNode> {
  if (node.instance.processType === 'callActivity') return node;
  try {
    const data = await getDecisionInstances({
      processInstanceKey: node.instance.key,
      page,
      size,
    });
    node.decisions = (data.partitions ?? []).flatMap(
      (p) => p.items ?? [],
    ) as DecisionInstanceSummary[];
    // Preserve a previously-established non-zero total — some APIs return
    // totalCount=0 for pages beyond the last item rather than the real total.
    const newTotal = data.totalCount ?? 0;
    if (newTotal > 0 || node.decisionsTotalCount === 0) node.decisionsTotalCount = newTotal;
  } catch (err) {
    console.error(`Failed to refetch decisions for ${node.instance.key}:`, err);
  }
  return node;
}

/**
 * Re-fetch a page of children for a specific node (mutates node.children and
 * node.childrenTotalCount).  Existing children from other pages are replaced
 * by the new page.
 */
export async function refetchNodeChildren(
  node: ProcessInstanceNode,
  page: number,
  size: number,
): Promise<ProcessInstanceNode> {
  if (node.instance.processType === 'callActivity') return node;
  try {
    const data = await getChildProcessInstances(node.instance.key, { page, size });
    const instances = (data.partitions ?? []).flatMap(
      (p) => p.items ?? [],
    ) as ProcessInstance[];
    node.childrenTotalCount = data.totalCount ?? instances.length;
    // Replace children list with the new page (shallow — no recursive dataset fetch)
    node.children = instances.map((inst) => makeNode(inst, node.depth + 1));
  } catch (err) {
    console.error(`Failed to refetch children for ${node.instance.key}:`, err);
  }
  return node;
}

/**
 * Re-slice variables for a specific node from the already-loaded instance.variables.
 * No API call needed — variables are embedded in the ProcessInstance response.
 * Mutates the node in place and returns it.
 */
export function refetchNodeVariables(
  node: ProcessInstanceNode,
  page: number,
  size: number,
): ProcessInstanceNode {
  if (node.instance.processType === 'callActivity') return node;
  const allVars = Object.entries((node.instance.variables as Record<string, unknown>) ?? {});
  node.variablesTotalCount = allVars.length;
  const start = (page - 1) * size;
  node.variableEntries = allVars
    .slice(start, start + size)
    .map(([name, value]) => ({ name, value }));
  return node;
}
