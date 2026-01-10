// MSW handlers for process definitions endpoints
import { http, HttpResponse } from 'msw';
import {
  processDefinitions,
  findProcessDefinitionByKey,
} from '../data/processDefinitions';
import { processInstances } from '../data/processInstances';
import { incidents } from '../data/incidents';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// Helper to compute statistics for a process definition from actual mock data
function computeStatisticsForDefinition(processDefinitionKey: string) {
  // Get all instances for this process definition
  const defInstances = processInstances.filter(
    (pi) => pi.processDefinitionKey === processDefinitionKey
  );

  // Count instances by state
  const activeCount = defInstances.filter((pi) => pi.state === 'active').length;
  const completedCount = defInstances.filter((pi) => pi.state === 'completed').length;
  const terminatedCount = defInstances.filter((pi) => pi.state === 'terminated').length;
  const failedCount = defInstances.filter((pi) => pi.state === 'failed').length;

  // Get unresolved incidents for this process definition
  const defIncidents = incidents.filter(
    (i) => i.processDefinitionKey === processDefinitionKey && !i.resolvedAt
  );

  return {
    instanceCounts: {
      total: defInstances.length,
      active: activeCount,
      completed: completedCount,
      terminated: terminatedCount,
      failed: failedCount,
    },
    incidentCounts: {
      total: incidents.filter((i) => i.processDefinitionKey === processDefinitionKey).length,
      unresolved: defIncidents.length,
    },
  };
}

// Helper to compute element statistics for a process definition
function computeElementStatistics(processDefinitionKey: string) {
  const elementStats: Record<string, { activeCount: number; incidentCount: number }> = {};

  // Get all active instances for this process definition
  const defInstances = processInstances.filter(
    (pi) => pi.processDefinitionKey === processDefinitionKey && pi.state === 'active'
  );

  // Count active elements from active instances
  defInstances.forEach((instance) => {
    instance.activeElementInstances.forEach((elem) => {
      if (!elementStats[elem.elementId]) {
        elementStats[elem.elementId] = { activeCount: 0, incidentCount: 0 };
      }
      elementStats[elem.elementId].activeCount++;
    });
  });

  // Count incidents per element
  const defIncidents = incidents.filter(
    (i) => i.processDefinitionKey === processDefinitionKey && !i.resolvedAt
  );

  defIncidents.forEach((incident) => {
    if (!elementStats[incident.elementId]) {
      elementStats[incident.elementId] = { activeCount: 0, incidentCount: 0 };
    }
    elementStats[incident.elementId].incidentCount++;
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

export const processDefinitionHandlers = [
  // GET /process-definitions - List process definitions
  http.get(
    `${BASE_URL}/process-definitions`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const bpmnProcessId = url.searchParams.get('bpmnProcessId');
      const onlyLatest = url.searchParams.get('onlyLatest') === 'true';
      const search = url.searchParams.get('search')?.toLowerCase();
      const sortBy = url.searchParams.get('sortBy');
      const sortOrder = url.searchParams.get('sortOrder');

      // Filter by bpmnProcessId if specified
      let filteredDefinitions = [...processDefinitions];
      if (bpmnProcessId) {
        filteredDefinitions = filteredDefinitions.filter(
          (d) => d.bpmnProcessId === bpmnProcessId
        );
      }

      // Filter by search term (matches bpmnProcessName, bpmnProcessId, or bpmnResourceName)
      if (search) {
        filteredDefinitions = filteredDefinitions.filter(
          (d) =>
            d.bpmnProcessName?.toLowerCase().includes(search) ||
            d.bpmnProcessId.toLowerCase().includes(search) ||
            d.bpmnResourceName?.toLowerCase().includes(search)
        );
      }

      // Filter to only latest versions if specified
      if (onlyLatest) {
        const latestByProcessId = new Map<string, typeof processDefinitions[0]>();
        filteredDefinitions.forEach((d) => {
          const existing = latestByProcessId.get(d.bpmnProcessId);
          if (!existing || d.version > existing.version) {
            latestByProcessId.set(d.bpmnProcessId, d);
          }
        });
        filteredDefinitions = Array.from(latestByProcessId.values());
      }

      // Sort
      filteredDefinitions = sortItems(filteredDefinitions, sortBy, sortOrder);

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = filteredDefinitions.slice(startIndex, endIndex);

      // Map to API response format (without bpmnData for list view)
      const items = paginatedItems.map(({ key, version, bpmnProcessId, bpmnProcessName, bpmnResourceName, createdAt }) => ({
        key,
        version,
        bpmnProcessId,
        bpmnProcessName,
        bpmnResourceName,
        createdAt,
      }));

      return HttpResponse.json({
        items,
        page,
        size,
        count: items.length,
        totalCount: filteredDefinitions.length,
      });
    })
  ),

  // GET /process-definitions/statistics - Get statistics for process definitions
  // Returns paginated items with ProcessDefinitionStatistics objects
  http.get(
    `${BASE_URL}/process-definitions/statistics`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const onlyLatest = url.searchParams.get('onlyLatest') === 'true';
      const bpmnProcessId = url.searchParams.get('bpmnProcessId');

      // Start with all definitions
      let definitionsToProcess = [...processDefinitions];

      // Filter by bpmnProcessId if specified
      if (bpmnProcessId) {
        definitionsToProcess = definitionsToProcess.filter(
          (d) => d.bpmnProcessId === bpmnProcessId
        );
      }

      // Filter to only latest versions if specified
      if (onlyLatest) {
        const latestByProcessId = new Map<string, typeof processDefinitions[0]>();
        definitionsToProcess.forEach((d) => {
          const existing = latestByProcessId.get(d.bpmnProcessId);
          if (!existing || d.version > existing.version) {
            latestByProcessId.set(d.bpmnProcessId, d);
          }
        });
        definitionsToProcess = Array.from(latestByProcessId.values());
      }

      // Build items array with statistics
      const allItems = definitionsToProcess.map((def) => {
        const stats = computeStatisticsForDefinition(def.key);
        return {
          key: parseInt(def.key, 10),
          version: def.version,
          bpmnProcessId: def.bpmnProcessId,
          name: def.bpmnProcessName,
          bpmnResourceName: def.bpmnResourceName,
          instanceCounts: stats.instanceCounts,
          incidentCounts: stats.incidentCounts,
        };
      });

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = allItems.slice(startIndex, endIndex);

      return HttpResponse.json({
        items: paginatedItems,
        page,
        size,
        count: paginatedItems.length,
        totalCount: allItems.length,
      });
    })
  ),

  // GET /process-definitions/:processDefinitionKey - Get single process definition
  http.get(
    `${BASE_URL}/process-definitions/:processDefinitionKey`,
    withValidation(({ params }) => {
      const { processDefinitionKey } = params;
      const definition = findProcessDefinitionByKey(processDefinitionKey as string);

      if (!definition) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process definition with key ${processDefinitionKey} not found`,
          },
          { status: 404 }
        );
      }

      return HttpResponse.json({
        key: definition.key,
        version: definition.version,
        bpmnProcessId: definition.bpmnProcessId,
        bpmnProcessName: definition.bpmnProcessName,
        bpmnResourceName: definition.bpmnResourceName,
        bpmnData: definition.bpmnData,
      });
    })
  ),

  // GET /process-definitions/:processDefinitionKey/statistics - Get element statistics for diagram
  http.get(
    `${BASE_URL}/process-definitions/:processDefinitionKey/statistics`,
    withValidation(({ params }) => {
      const { processDefinitionKey } = params;
      const definition = findProcessDefinitionByKey(processDefinitionKey as string);

      if (!definition) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Process definition with key ${processDefinitionKey} not found`,
          },
          { status: 404 }
        );
      }

      // Compute element statistics from actual mock data
      const elementStatistics = computeElementStatistics(processDefinitionKey as string);

      return HttpResponse.json(elementStatistics);
    })
  ),

  // POST /process-definitions - Deploy a new process definition
  http.post(
    `${BASE_URL}/process-definitions`,
    withValidation(async () => {
      // In a real implementation, we'd parse the BPMN XML and create a new definition
      // For mock purposes, just return a generated key
      const newKey = `${Date.now()}`;

      return HttpResponse.json({ processDefinitionKey: newKey }, { status: 201 });
    })
  ),
];
