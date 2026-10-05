import type { ProcessInstanceNode } from '../types/tree';

// Section order of the process instances below the main one in every tab.
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

/**
 * Every node of an instance tree, breadth first with the root first. A node
 * `skip` accepts is left out together with all nodes below it.
 */
export function collectNodes(
  root: ProcessInstanceNode,
  skip: (node: ProcessInstanceNode) => boolean = () => false
): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined || skip(node)) continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

/** Orders nodes by their process type, an unknown type last, then by instance key. */
export function compareByProcessType(a: ProcessInstanceNode, b: ProcessInstanceNode): number {
  const orderA = PROCESS_TYPE_ORDER[a.instance.processType ?? ''] ?? 99;
  const orderB = PROCESS_TYPE_ORDER[b.instance.processType ?? ''] ?? 99;
  if (orderA !== orderB) return orderA - orderB;
  return a.instance.key.localeCompare(b.instance.key);
}
