// MSW handlers for process instances endpoints
import { http, HttpResponse } from 'msw';
import {
  processInstances,
  findProcessInstanceByKey,
} from '../data/processInstances';
import { getJobsByProcessInstanceKey } from '../data/jobs';
import { getIncidentsByProcessInstanceKey } from '../data/incidents';
import { withValidation } from '../validation';

// Helper to transform a process instance to response format (reused across handlers)
function transformInstance(pi: (typeof processInstances)[0]) {
  return {
    key: pi.key,
    processDefinitionKey: pi.processDefinitionKey,
    bpmnProcessId: pi.bpmnProcessId,
    createdAt: pi.createdAt,
    state: pi.state,
    variables: pi.variables,
    processType: pi.processType ?? 'default',
    ...(pi.parentProcessInstanceKey ? { parentProcessInstanceKey: pi.parentProcessInstanceKey } : {}),
    activeElementInstances: pi.activeElementInstances.map((ei) => ({
      elementInstanceKey: ei.key,
      createdAt: pi.createdAt,
      state: 'active',
      elementId: ei.elementId,
    })),
  };
}

const BASE_URL = '/v1';

// Helper to compute element statistics for a specific process instance
function computeInstanceElementStatistics(processInstanceKey: string) {
  const elementStats: Record<string, { activeCount: number; incidentCount: number }> = {};

  const getInstanceStat = (elementId: string) => {
    if (!elementStats[elementId]) {
      elementStats[elementId] = { activeCount: 0, incidentCount: 0 };
    }
    return elementStats[elementId];
  };

  const instance = findProcessInstanceByKey(processInstanceKey);
  if (instance) {
    // Count active elements from the instance's active element instances
    instance.activeElementInstances.forEach((elem) => {
      getInstanceStat(elem.elementId).activeCount++;
    });
  }

  // Count unresolved incidents for this instance per element
  const instanceIncidents = getIncidentsByProcessInstanceKey(processInstanceKey);
  instanceIncidents
    .filter((i) => !i.resolvedAt)
    .forEach((incident) => {
      getInstanceStat(incident.elementId).incidentCount++;
    });

  return elementStats;
}


// Helper to sort items by a field
function sortItems<T>(items: T[], sortBy: string | null, sortOrder: string | null): T[] {
  if (!sortBy) return items;

  const order = sortOrder === 'desc' ? -1 : 1;

  return [...items].sort((a, b) => {
    const aValue = (a as Record<string, unknown>)[sortBy];
    const bValue = (b as Record<string, unknown>)[sortBy];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order;
    if (bValue == null) return -order;

    // String comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order * aValue.localeCompare(bValue);
    }

    // Number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order * (aValue - bValue);
    }

    // Default: convert to string and compare
    return order * String(aValue).localeCompare(String(bValue));
  });
}

// Helper to filter instances based on query params
function filterInstances(
  instances: typeof processInstances,
  params: {
    processDefinitionKey?: string | null;
    bpmnProcessId?: string | null;
    state?: string | null;
    partition?: number | null;
  }
) {
  let filtered = [...instances];

  if (params.processDefinitionKey) {
    filtered = filtered.filter((pi) => pi.processDefinitionKey === params.processDefinitionKey);
  }

  if (params.bpmnProcessId) {
    filtered = filtered.filter((pi) => pi.bpmnProcessId === params.bpmnProcessId);
  }

  if (params.state) {
    filtered = filtered.filter((pi) => pi.state === params.state);
  }

  return filtered;
}

// Group instances by their explicit partition assignment
function groupByPartition(instances: typeof processInstances) {
  const partitions = new Map<number, typeof processInstances>();

  instances.forEach((instance) => {
    const partition = instance.partition;
    if (!partitions.has(partition)) {
      partitions.set(partition, []);
    }
    partitions.get(partition)!.push(instance);
  });

  return partitions;
}

export const processInstanceHandlers = [
  // GET /process-instances - List process instances
  http.get(
    `${BASE_URL}/process-instances`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const processDefinitionKey = url.searchParams.get('processDefinitionKey');
      const bpmnProcessId = url.searchParams.get('bpmnProcessId');
      const state = url.searchParams.get('state');
      const partitionParam = url.searchParams.get('partition');
      const partition = partitionParam ? parseInt(partitionParam, 10) : null;
      const sortBy = url.searchParams.get('sortBy');
      const sortOrder = url.searchParams.get('sortOrder');

      const includeChildProcesses = url.searchParams.get('includeChildProcesses') === 'true';

      let filteredInstances = filterInstances(processInstances, {
        processDefinitionKey,
        bpmnProcessId,
        state,
      });

      // By default, hide child processes (those with a parentProcessInstanceKey)
      if (!includeChildProcesses) {
        filteredInstances = filteredInstances.filter((pi) => !pi.parentProcessInstanceKey);
      }

      // Sort before grouping
      filteredInstances = sortItems(filteredInstances, sortBy, sortOrder);

      // Group by partition
      const partitionMap = groupByPartition(filteredInstances);

      // Pagination indices
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;

      // Helper to transform a process instance to response format
      const transformInstance = (pi: (typeof processInstances)[0]) => ({
        key: pi.key,
        processDefinitionKey: pi.processDefinitionKey,
        bpmnProcessId: pi.bpmnProcessId,
        createdAt: pi.createdAt,
        state: pi.state,
        processType: pi.processType,
        variables: pi.variables,
        activeElementInstances: pi.activeElementInstances.map((ei) => ({
          elementInstanceKey: ei.key,
          createdAt: pi.createdAt,
          state: 'active',
          elementId: ei.elementId,
        })),
      });

      // Build partitioned response
      let partitionsResponse: Array<{ partition: number; items: unknown[]; count: number }>;
      let totalCount: number;

      if (partition !== null) {
        // Single partition requested - paginate just that partition's data
        const partitionData = partitionMap.get(partition) || [];
        const paginatedItems = partitionData.slice(startIndex, endIndex).map(transformInstance);
        partitionsResponse = [{ partition, items: paginatedItems, count: partitionData.length }];
        totalCount = partitionData.length;
      } else {
        // All partitions - paginate each partition independently
        // Each partition gets its own page of data (up to 'size' items per partition)
        partitionsResponse = [1, 2, 3, 4].map((p) => {
          const partitionData = partitionMap.get(p) || [];
          const paginatedItems = partitionData.slice(startIndex, endIndex).map(transformInstance);
          return { partition: p, items: paginatedItems, count: partitionData.length };
        });
        // Total count is sum of all items across all partitions
        totalCount = [1, 2, 3, 4].reduce((sum, p) => sum + (partitionMap.get(p)?.length || 0), 0);
      }

      return HttpResponse.json({
        partitions: partitionsResponse,
        page,
        size,
        count: partitionsResponse.reduce((sum, p) => sum + p.items.length, 0),
        totalCount,
      });
    })
  ),

  // GET /process-instances/:processInstanceKey - Get single process instance
  http.get(
    `${BASE_URL}/process-instances/:processInstanceKey`,
    withValidation(({ params }) => {
      const { processInstanceKey } = params;
      const instance = findProcessInstanceByKey(processInstanceKey as string);

      if (!instance) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process instance with key ${processInstanceKey} not found`,
          },
          { status: 404 }
        );
      }

      return HttpResponse.json(transformInstance(instance));
    })
  ),

  // POST /process-instances - Create a new process instance
  http.post(
    `${BASE_URL}/process-instances`,
    withValidation(async ({ request }) => {
      const body = (await request.json()) as {
        processDefinitionKey: string;
        variables?: Record<string, unknown>;
      };

      const newKey = `${Date.now()}`;
      const createdAt = new Date().toISOString();

      return HttpResponse.json(
        {
          key: newKey,
          processDefinitionKey: body.processDefinitionKey,
          createdAt,
          state: 'active',
          processType: 'default',
          variables: body.variables || {},
          activeElementInstances: [],
        },
        { status: 201 }
      );
    })
  ),

  // GET /process-instances/:processInstanceKey/child-processes - Get child processes
  http.get(
    `${BASE_URL}/process-instances/:processInstanceKey/child-processes`,
    withValidation(({ params, request }) => {
      const { processInstanceKey } = params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const state = url.searchParams.get('state');

      let children = processInstances.filter(
        (pi) => pi.parentProcessInstanceKey === (processInstanceKey as string)
      );

      if (state) {
        children = children.filter((pi) => pi.state === state);
      }

      // Group by partition
      const partitionMap = groupByPartition(children);
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;

      const partitionsResponse = [1, 2, 3, 4].map((p) => {
        const partitionData = partitionMap.get(p) || [];
        const paginatedItems = partitionData.slice(startIndex, endIndex).map(transformInstance);
        return { partition: p, items: paginatedItems, count: partitionData.length };
      });

      const totalCount = children.length;

      return HttpResponse.json({
        partitions: partitionsResponse,
        page,
        size,
        count: partitionsResponse.reduce((sum, p) => sum + p.items.length, 0),
        totalCount,
      });
    })
  ),

  // GET /process-instances/:processInstanceKey/jobs - Get jobs for a process instance
  http.get(
    `${BASE_URL}/process-instances/:processInstanceKey/jobs`,
    withValidation(({ params, request }) => {
      const { processInstanceKey } = params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);

      const jobs = getJobsByProcessInstanceKey(processInstanceKey as string);

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = jobs.slice(startIndex, endIndex);

      const items = paginatedItems.map((job) => ({
        key: job.key,
        elementId: job.elementId,
        elementName: job.elementName,
        type: job.type,
        processInstanceKey: job.processInstanceKey,
        processDefinitionKey: job.processDefinitionKey,
        state: job.state,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        variables: job.variables,
      }));

      return HttpResponse.json({
        items,
        page,
        size,
        count: items.length,
        totalCount: jobs.length,
      });
    })
  ),

  // GET /process-instances/:processInstanceKey/incidents - Get incidents for a process instance
  http.get(
    `${BASE_URL}/process-instances/:processInstanceKey/incidents`,
    withValidation(({ params, request }) => {
      const { processInstanceKey } = params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const state = url.searchParams.get('state');

      let filteredIncidents = getIncidentsByProcessInstanceKey(processInstanceKey as string);

      // Filter by state
      if (state === 'resolved') {
        filteredIncidents = filteredIncidents.filter((i) => i.resolvedAt);
      } else if (state === 'unresolved') {
        filteredIncidents = filteredIncidents.filter((i) => !i.resolvedAt);
      }

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = filteredIncidents.slice(startIndex, endIndex);

      return HttpResponse.json({
        items: paginatedItems,
        page,
        size,
        count: paginatedItems.length,
        totalCount: filteredIncidents.length,
      });
    })
  ),

  // GET /process-instances/:processInstanceKey/history - Get history for a process instance
  http.get(
    `${BASE_URL}/process-instances/:processInstanceKey/history`,
    withValidation(({ params, request }) => {
      const { processInstanceKey } = params;
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);

      const instance = findProcessInstanceByKey(processInstanceKey as string);

      if (!instance) {
        return HttpResponse.json({
          items: [],
          page,
          size,
          count: 0,
          totalCount: 0,
        });
      }

      // Use history from instance if available, otherwise generate from activeElementInstances
      // Response format matches FlowElementHistory schema
      const historyItems = instance.history?.length
        ? instance.history.map((h) => {
            const item: Record<string, unknown> = {
              key: h.key,
              processInstanceKey: processInstanceKey as string,
              createdAt: h.startedAt, // Schema field name
              elementId: h.elementId,
              elementType: h.elementType,
              state: h.state,
            };
            if (h.completedAt) item.completedAt = h.completedAt;
            return item;
          })
        : [
            // Fallback for instances without history field
            {
              key: `${processInstanceKey}001`,
              processInstanceKey: processInstanceKey as string,
              createdAt: instance.createdAt,
              elementId: 'StartEvent_1',
              elementType: 'startEvent',
              state: 'completed',
              completedAt: instance.createdAt,
            },
            ...instance.activeElementInstances.map((ei, index) => ({
              key: `${processInstanceKey}${String(index + 2).padStart(3, '0')}`,
              processInstanceKey: processInstanceKey as string,
              createdAt: instance.createdAt,
              elementId: ei.elementId,
              elementType: ei.elementType,
              state: 'active',
              // Don't include completedAt for active elements
            })),
          ];

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = historyItems.slice(startIndex, endIndex);

      return HttpResponse.json({
        items: paginatedItems,
        page,
        size,
        count: paginatedItems.length,
        totalCount: historyItems.length,
      });
    })
  ),

  // PATCH /process-instances/:processInstanceKey/variables - Update variables
  http.patch(
    `${BASE_URL}/process-instances/:processInstanceKey/variables`,
    withValidation(async ({ params, request }) => {
      const { processInstanceKey } = params;
      await request.json(); // Consume body

      const instance = findProcessInstanceByKey(processInstanceKey as string);

      if (!instance) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process instance with key ${processInstanceKey} not found`,
          },
          { status: 404 }
        );
      }

      // In a real implementation, we'd update the variables
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // POST /process-instances/:processInstanceKey/cancel - Cancel a process instance
  http.post(
    `${BASE_URL}/process-instances/:processInstanceKey/cancel`,
    withValidation(({ params }) => {
      const { processInstanceKey } = params;
      const instance = findProcessInstanceByKey(processInstanceKey as string);

      if (!instance) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process instance with key ${processInstanceKey} not found`,
          },
          { status: 404 }
        );
      }

      // Mutate state so subsequent GETs return the updated state
      instance.state = 'terminated';
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // DELETE /process-instances/:processInstanceKey/variables/:variableName - Delete a variable
  http.delete(
    `${BASE_URL}/process-instances/:processInstanceKey/variables/:variableName`,
    withValidation(({ params }) => {
      const { processInstanceKey } = params;

      const instance = findProcessInstanceByKey(processInstanceKey as string);

      if (!instance) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process instance with key ${processInstanceKey} not found`,
          },
          { status: 404 }
        );
      }

      // In a real implementation, we'd delete the variable
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 204 });
    })
  ),

  // GET /process-instances/:processInstanceKey/statistics - Get element statistics
  http.get(
    `${BASE_URL}/process-instances/:processInstanceKey/statistics`,
    withValidation(({ params }) => {
      const { processInstanceKey } = params;

      const instance = findProcessInstanceByKey(processInstanceKey as string);

      if (!instance) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process instance with key ${processInstanceKey} not found`,
          },
          { status: 404 }
        );
      }

      const items = computeInstanceElementStatistics(processInstanceKey as string);
      return HttpResponse.json({
        partitions: [{ partition: instance.partition, items }],
      });
    })
  ),
];
