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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard depth limit — guards against cycles and runaway fetches */
export const MAX_TREE_DEPTH = 8;

/** Default page size for child process instances */
export const CHILDREN_PAGE_SIZE = 100;

/** Default page sizes for datasets */
export const JOBS_PAGE_SIZE = 100;
export const INCIDENTS_PAGE_SIZE = 100;
export const DECISIONS_PAGE_SIZE = 100;

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
  decisionsPageSize?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a bare node with empty dataset arrays */
function makeNode(instance: ProcessInstance, depth: number): ProcessInstanceNode {
  return {
    instance,
    depth,
    jobs: [],
    jobsTotalCount: 0,
    incidents: [],
    incidentsTotalCount: 0,
    decisions: [],
    decisionsTotalCount: 0,
    history: [],
    children: [],
    childrenTotalCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Per-node dataset fetch
// ---------------------------------------------------------------------------

/**
 * Fetch all datasets (jobs, incidents, decisions, history) for a single node.
 * All four requests run in parallel.  Individual failures are swallowed so one
 * bad endpoint cannot abort the whole tree load.
 */
async function fetchNodeDatasets(
  node: ProcessInstanceNode,
  opts: Required<Pick<
    FetchInstanceTreeOptions,
    'jobsPage' | 'jobsPageSize' | 'incidentsPage' | 'incidentsPageSize' | 'decisionsPageSize'
  >>,
): Promise<void> {
  const key = node.instance.key;

  const [jobsResult, incidentsResult, decisionsResult, historyResult] = await Promise.allSettled([
    getProcessInstanceJobs(key, { page: opts.jobsPage, size: opts.jobsPageSize }),
    getIncidents(key, { page: opts.incidentsPage, size: opts.incidentsPageSize }),
    getDecisionInstances({ processInstanceKey: key, size: opts.decisionsPageSize }),
    getHistory(key, { page: 1, size: -1 }),
  ]);

  if (jobsResult.status === 'fulfilled') {
    node.jobs = (jobsResult.value.items ?? []) as Job[];
    node.jobsTotalCount = jobsResult.value.totalCount ?? 0;
  }

  if (incidentsResult.status === 'fulfilled') {
    node.incidents = (incidentsResult.value.items ?? []) as Incident[];
    node.incidentsTotalCount = incidentsResult.value.totalCount ?? 0;
  }

  if (decisionsResult.status === 'fulfilled') {
    const items = (decisionsResult.value.partitions ?? []).flatMap(
      (p) => p.items ?? [],
    ) as DecisionInstanceSummary[];
    node.decisions = items;
    node.decisionsTotalCount = decisionsResult.value.totalCount ?? 0;
  }

  if (historyResult.status === 'fulfilled') {
    node.history = (historyResult.value.items ?? []) as FlowElementHistory[];
  }
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
 *
 * @param rootKey   processInstanceKey of the root instance
 * @param opts      tuning options (depths, page sizes)
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
    decisionsPageSize: opts.decisionsPageSize ?? DECISIONS_PAGE_SIZE,
  };

  // ── Phase 1: build tree shape ────────────────────────────────────────────

  const rootInstance = await getProcessInstance(rootKey);
  const root = makeNode(rootInstance as unknown as ProcessInstance, 0);

  const visited = new Set<string>([rootKey]);

  // BFS queue holds the nodes whose children we still need to fetch
  let currentLevel: ProcessInstanceNode[] = [root];

  while (currentLevel.length > 0) {
    const nextLevel: ProcessInstanceNode[] = [];

    // Fetch children for every node in the current level — in parallel
    const childFetches = currentLevel
      .filter((node) => node.depth < maxDepth)
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
          const childNode = makeNode(childInstance, node.depth + 1);
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
    const node = bfsQueue.shift()!;
    allNodes.push(node);
    bfsQueue.push(...node.children);
  }

  await Promise.all(allNodes.map((node) => fetchNodeDatasets(node, datasetOpts)));

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
  try {
    const data = await getProcessInstanceJobs(node.instance.key, { page, size });
    node.jobs = (data.items ?? []) as Job[];
    node.jobsTotalCount = data.totalCount ?? 0;
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
  try {
    const data = await getIncidents(node.instance.key, { page, size });
    node.incidents = (data.items ?? []) as Incident[];
    node.incidentsTotalCount = data.totalCount ?? 0;
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
  try {
    const data = await getDecisionInstances({
      processInstanceKey: node.instance.key,
      size,
    });
    node.decisions = (data.partitions ?? []).flatMap(
      (p) => p.items ?? [],
    ) as DecisionInstanceSummary[];
    node.decisionsTotalCount = data.totalCount ?? 0;
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
